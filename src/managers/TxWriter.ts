import { v4 as uuidv4 } from 'uuid';
import { SimulateContractParameters } from 'viem';

import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { TxWriterConfig } from '../types/ManagerConfigs';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ITxWriter } from '../types/managers/ITxWriter';
import { callContract } from '../utils';

export class TxWriter implements ITxWriter {
    private static instance: TxWriter | undefined;
    private viemClientManager: IViemClientManager;
    private txMonitor: ITxMonitor;
    private logger: LoggerInterface;
    private config: TxWriterConfig;
    private nonceManager: INonceManager;

    private constructor(
        logger: LoggerInterface,
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
        logger: LoggerInterface,
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
    ): Promise<string> {
        try {
            const { walletClient, publicClient } = this.viemClientManager.getClients(network);

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
            this.logger.debug(`[${network.name}] Contract call transaction hash: ${txHash}`);

            // Get the current block number for tracking
            const currentBlock = await publicClient.getBlockNumber();

            // Create transaction info for monitoring
            const txInfo = {
                id: uuidv4(),
                txHash,
                chainName: network.name,
                submittedAt: Date.now(),
                submissionBlock: currentBlock,
                status: 'submitted',
                metadata: {
                    functionName: params.functionName,
                    contractAddress: params.address,
                },
            };

            // Watch this transaction for finality
            this.txMonitor.ensureTxFinality(
                txInfo,
                this.createFinalityCallback(network, params, txInfo),
            );

            return txHash;
        } catch (error) {
            this.logger.error(`[${network.name}] Contract call failed:`, error);
            throw error;
        }
    }

    private createFinalityCallback(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        originalTxInfo: any,
    ): (txInfo: any, isFinalized: boolean) => void {
        return async (txInfo: any, isFinalized: boolean): Promise<void> => {
            if (isFinalized) {
                this.logger.info(
                    `[${network.name}] Transaction ${txInfo.txHash} (${txInfo.id}) is now final`,
                );
            } else {
                this.logger.warn(
                    `[${network.name}] Transaction ${txInfo.txHash} (${txInfo.id}) failed - attempting retry`,
                );

                // Retry the transaction
                await this.retryTransaction(network, params, originalTxInfo);
            }
        };
    }

    private async retryTransaction(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        originalTxInfo: any,
    ): Promise<void> {
        this.logger.info(
            `[${network.name}] Retrying transaction ${originalTxInfo.txHash} (${originalTxInfo.id})`,
        );

        try {
            const { walletClient, publicClient } = this.viemClientManager.getClients(network);

            // Retry the transaction
            const newTxHash = await callContract(
                publicClient,
                walletClient,
                params,
                this.nonceManager,
                {
                    simulateTx: this.config.simulateTx,
                    defaultGasLimit: this.config.defaultGasLimit,
                },
            );
            this.logger.info(`[${network.name}] Retry successful. New tx hash: ${newTxHash}`);

            // Get the current block number for tracking
            const currentBlock = await publicClient.getBlockNumber();

            // Create new transaction info for the retry with new ID
            const retryTxInfo = {
                id: uuidv4(),
                txHash: newTxHash,
                chainName: network.name,
                submittedAt: Date.now(),
                submissionBlock: currentBlock,
                status: 'submitted',
                metadata: {
                    functionName: params.functionName,
                    contractAddress: params.address,
                },
            };

            // Start monitoring the retry transaction
            this.txMonitor.ensureTxFinality(
                retryTxInfo,
                this.createFinalityCallback(network, params, retryTxInfo),
            );
        } catch (error) {
            this.logger.error(
                `[${network.name}] Failed to retry transaction ${originalTxInfo.txHash}:`,
                error,
            );
            // TODO: What if retry fails?
        }
    }

    public dispose(): void {
        this.logger.info('Disposed');
    }

    public static dispose(): void {
        TxWriter.instance = undefined;
    }
}
