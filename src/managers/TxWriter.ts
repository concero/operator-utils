import { Hash, sha256, SimulateContractParameters, stringToHex } from 'viem';

import { InMemoryRetryStore } from '../stores/InMemoryRetryStore';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, IRetryStore, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxResultSubscriber, TxNotificationHub } from '../types/managers/ITxResultSubscriber';
import { ITxWriter } from '../types/managers/ITxWriter';
import { callContract } from '../utils';

type OpPayload = {
    network: ConceroNetwork;
    params: SimulateContractParameters;
    ensureTxFinality: boolean;
};

export class TxWriter implements ITxWriter, ITxResultSubscriber {
    private static instance: TxWriter | undefined;
    private viemClientManager: IViemClientManager;
    private txMonitor: ITxMonitor;
    private logger: ILogger;
    private config: TxWriterConfig;
    private nonceManager: INonceManager;
    private retryStore: IRetryStore;

    public readonly id = 'tx-writer';

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

        TxNotificationHub.getInstance().register(this);
    }

    static createInstance(
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

    static getInstance(): TxWriter {
        if (!TxWriter.instance) throw new Error('TxWriter is not initialized.');
        return TxWriter.instance;
    }

    get name(): string {
        return 'TxWriter';
    }

    async initialize(): Promise<void> {
        this.logger.info('Initialized');
    }

    public async callContract(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality = false,
    ): Promise<Hash> {
        return this.send(network, params, ensureTxFinality, 1);
    }

    public async notifyTxResult({
        txHash,
        chainName,
        type,
        success,
    }: {
        txHash: Hash;
        chainName: string;
        type: 'inclusion' | 'finality';
        success: boolean;
        blockNumber?: bigint;
    }): Promise<void> {
        const opId = await this.retryStore.getOpIdByTx(chainName, txHash);
        if (!opId) return;

        const state = await this.retryStore.getRetryState<OpPayload>(opId, chainName);
        if (!state || !state.payload) {
            await this.retryStore.clearTxIndex(chainName, txHash);
            return;
        }

        const attempt = state.attempt ?? 1;
        const { network, params, ensureTxFinality } = state.payload;

        if (success) {
            await Promise.all([
                this.retryStore.clearRetry(opId, chainName),
                this.retryStore.clearTxIndex(chainName, txHash),
            ]);
            this.logger.debug(`[${chainName}] ${type} OK for ${txHash}, attempt ${attempt}`);
            return;
        }

        const nextAttempt = attempt + 1;
        const delaySec = this.nextDelaySeconds(nextAttempt);
        const nextTryAt = new Date(Date.now() + delaySec * 1000);

        this.logger.warn(
            `[${chainName}] ${type} failed for ${txHash}, retry in ${delaySec}s (attempt ${nextAttempt})`,
        );

        await this.retryStore.saveRetryAttempt<OpPayload>(opId, chainName, nextAttempt, nextTryAt, {
            network,
            params,
            ensureTxFinality,
        });

        setTimeout(async () => {
            try {
                await this.nonceManager.refresh(chainName);
                const newHash = await this.send(network, params, ensureTxFinality, nextAttempt);
                await this.retryStore.clearTxIndex(chainName, txHash);
                this.logger.info(`[${chainName}] resent -> ${newHash}`);
            } catch (e) {
                this.logger.error(`[${chainName}] resend failed: ${e}`);
            }
        }, delaySec * 1000);
    }

    private async send(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality: boolean,
        attempt: number,
    ): Promise<Hash> {
        const { walletClient, publicClient } = this.viemClientManager.getClients(network.name);

        if (this.config.dryRun) {
            this.logger.info(`[DRY_RUN][${network.name}] Contract call: ${params.functionName}`);
            return `0xdry${Date.now().toString(16)}` as Hash;
        }

        const opId = this.deriveOperationId(network, params);
        await this.retryStore.saveRetryAttempt<OpPayload>(opId, network.name, attempt, new Date(), {
            network,
            params,
            ensureTxFinality,
        });

        const txHash = await callContract(publicClient, walletClient, params, this.nonceManager, {
            simulateTx: this.config.simulateTx,
            defaultGasLimit: this.config.defaultGasLimit,
        });

        await this.retryStore.saveTxIndex(network.name, txHash, opId);

        if (ensureTxFinality) {
            this.txMonitor.trackTxFinality(txHash, network.name, this.id);
        } else {
            this.txMonitor.trackTxInclusion(txHash, network.name, this.id, 1);
        }

        return txHash;
    }

    private nextDelaySeconds(attempt: number): number {
        const last = TxWriter.BACKOFF_SECONDS[TxWriter.BACKOFF_SECONDS.length - 1];
        return attempt <= TxWriter.BACKOFF_SECONDS.length
            ? TxWriter.BACKOFF_SECONDS[attempt - 1]
            : last;
    }

    private deriveOperationId(network: ConceroNetwork, params: SimulateContractParameters): string {
        const raw = `op:${network.name}:${String((params as any).address ?? '0x')}:${params.functionName ?? 'fn'}:${JSON.stringify((params as any).args ?? [])}`;
        return sha256(stringToHex(raw));
      }
}
