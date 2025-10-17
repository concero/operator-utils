import { Hash, SimulateContractParameters } from 'viem';

import { InMemoryRetryStore } from '../stores/InMemoryRetryStore';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { IRetryStore } from '../types/managers/IRetryStore';
import { ITxWriter } from '../types/managers/ITxWriter';
import { callContract } from '../utils';

export class TxWriter implements ITxWriter {
    private static instance: TxWriter | undefined;
    private viemClientManager: IViemClientManager;
    private txMonitor: ITxMonitor;
    private logger: ILogger;
    private config: TxWriterConfig;
    private nonceManager: INonceManager;

    private readonly retryStore: IRetryStore;

    private static readonly BACKOFF_SECONDS = [5, 10, 30, 120, 300, 600, 1200, 3600] as const;

    private constructor(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
        retryStore?: IRetryStore,
    ) {
        this.viemClientManager = viemClientManager;
        this.txMonitor = txMonitor;
        this.logger = logger;
        this.config = config;
        this.nonceManager = nonceManager;
        this.retryStore = retryStore ?? new InMemoryRetryStore();
    }

    public static createInstance(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
        retryStore?: IRetryStore,
    ): TxWriter {
        TxWriter.instance = new TxWriter(
            logger,
            viemClientManager,
            txMonitor,
            nonceManager,
            config,
            retryStore,
        );
        return TxWriter.instance;
    }

    public static getInstance(): TxWriter {
        if (!TxWriter.instance) {
            throw new Error('TxWriter is not initialized. Call createInstance() first.');
        }
        return TxWriter.instance;
    }

    public async initialize(): Promise<void> {
        this.logger.info('Initialized');
    }

    public async callContract(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality = false,
    ): Promise<Hash> {
        return this.callContractWithMonitoring(network, params, ensureTxFinality, 1);
    }

    private async callContractWithMonitoring(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality: boolean,
        callbackRetryAttempt: number,
    ): Promise<Hash> {
        try {
            const { walletClient, publicClient } = this.viemClientManager.getClients(network.name);

            if (this.config.dryRun) {
                this.logger.info(
                    `[DRY_RUN][${network.name}] Contract call: ${params.functionName}`,
                );
                return `0xdry${Date.now().toString(16)}` as Hash;
            }

            const txHash = await callContract(
                publicClient,
                walletClient,
                params,
                this.nonceManager,
                {
                    simulateTx: this.config.simulateTx,
                    defaultGasLimit: this.config.defaultGasLimit,
                },
            );

            const retryCallback = this.createRetryCallback(
                network,
                params,
                ensureTxFinality,
                callbackRetryAttempt,
            );

            if (ensureTxFinality) {
                this.txMonitor.ensureTxFinality(
                    txHash,
                    network.name,
                    (hash, _network, isFinalized) => retryCallback(hash, isFinalized),
                );
            } else {
                this.txMonitor.ensureTxInclusion(
                    txHash,
                    network.name,
                    (hash, _network, _blockNumber, isIncluded) => retryCallback(hash, isIncluded),
                    1,
                );
            }

            return txHash;
        } catch (error) {
            this.logger.error(`[${network.name}] Contract call failed: ${error}`);
            throw error;
        }
    }

    private nextDelaySeconds(attempt: number): number {
        const last = TxWriter.BACKOFF_SECONDS[TxWriter.BACKOFF_SECONDS.length - 1];
        return attempt <= TxWriter.BACKOFF_SECONDS.length
            ? TxWriter.BACKOFF_SECONDS[attempt - 1]
            : last;
    }

    private deriveOperationId(network: ConceroNetwork, params: SimulateContractParameters): string {
        return `op:${network.name}:${String((params as any).address ?? '0x')}:${params.functionName ?? 'fn'}:${JSON.stringify((params as any).args ?? [])}`;
    }

    private createRetryCallback(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality: boolean,
        attempt: number,
    ): (txHash: Hash, success: boolean) => void {
        const opId = this.deriveOperationId(network, params);

        return (txHash: Hash, success: boolean): void => {
            if (success) {
                this.retryStore.clearRetry(opId, network.name).catch(() => {});
                this.logger.debug(
                    `[${network.name}] Transaction ${txHash} succeeded on attempt ${attempt}`,
                );
                return;
            }

            if (ensureTxFinality) {
                this.logger.error(
                    `[${network.name}] Transaction ${txHash} did not reach finality (attempt ${attempt}). No retry (rule: inclusion-only).`,
                );
                return;
            }

            const delaySec = this.nextDelaySeconds(attempt);
            const nextTryAt = new Date(Date.now() + delaySec * 1000);

            this.retryStore
                .saveRetryAttempt(opId, network.name, attempt, nextTryAt)
                .catch(() => {});

            this.logger.warn(
                `[${network.name}] Transaction ${txHash} not included (attempt ${attempt}). Retrying in ${delaySec}s...`,
            );

            setTimeout(async () => {
                try {
                    await this.nonceManager.refresh(network.name);
                    await this.callContractWithMonitoring(network, params, false, attempt + 1);
                } catch (error) {
                    this.logger.error(
                        `[${network.name}] Retry attempt ${attempt + 1} failed to send: ${error}`,
                    );
                }
            }, delaySec * 1000);
        };
    }
}
