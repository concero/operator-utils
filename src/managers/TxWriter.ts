import { SimulateContractParameters } from 'viem';

import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxWriter } from '../types/managers/ITxWriter';
import { callContract } from '../utils';

export class TxWriter implements ITxWriter {
    private static instance: TxWriter | undefined;
    private viemClientManager: IViemClientManager;
    private txMonitor: ITxMonitor;
    private logger: ILogger;
    private config: TxWriterConfig;
    private nonceManager: INonceManager;

    private constructor(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
    ) {
        this.viemClientManager = viemClientManager;
        this.txMonitor = txMonitor;
        this.logger = logger;
        this.config = config;
        this.nonceManager = nonceManager;
    }

    public static createInstance(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
    ): TxWriter {
        TxWriter.instance = new TxWriter(
            logger,
            viemClientManager,
            txMonitor,
            nonceManager,
            config,
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
    ): Promise<string> {
        try {
            const { walletClient, publicClient } = this.viemClientManager.getClients(network.name);

            if (this.config.dryRun) {
                this.logger.info(
                    `[DRY_RUN][${network.name}] Contract call: ${params.functionName}`,
                );
                const mockTxHash = `0xdry${Date.now().toString(16)}`;
                return mockTxHash;
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

            const retryCallback = this.createRetryCallback(network, params);

            if (ensureTxFinality) {
                this.txMonitor.ensureTxFinality(
                    txHash,
                    network.name,
                    (hash: string, chainName: string, isFinalized: boolean) =>
                        retryCallback(hash, isFinalized),
                );
            } else {
                this.txMonitor.ensureTxInclusion(
                    txHash,
                    network.name,
                    (hash: string, networkName: string, blockNumber: bigint, isIncluded: boolean) =>
                        retryCallback(hash, isIncluded),
                    1,
                );
            }

            return txHash;
        } catch (error) {
            this.logger.error(`[${network.name}] Contract call failed: ${error}`);
            throw error;
        }
    }

    private createRetryCallback(
        network: ConceroNetwork,
        params: SimulateContractParameters,
    ): (txHash: string, success: boolean) => void {
        return async (txHash: string, success: boolean): Promise<void> => {
            if (success) {
                this.logger.debug(`[${network.name}] Transaction ${txHash} completed successfully`);
                return;
            }

            this.logger.warn(
                `[${network.name}] Transaction ${txHash} failed or was dropped - attempting retry`,
            );

            this.nonceManager.reset(network.name);
            this.logger.debug(`[${network.name}] Reset nonce after transaction failure`);

            try {
                await this.retryTransaction(network, params);
            } catch (error) {
                this.logger.error(
                    `[${network.name}] Retry failed for transaction ${txHash}:`,
                    error,
                );
            }
        };
    }

    private async retryTransaction(
        network: ConceroNetwork,
        params: SimulateContractParameters,
    ): Promise<string> {
        return this.callContract(network, params, true);
    }
}
