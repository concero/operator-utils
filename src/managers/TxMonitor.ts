import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { TxMonitorConfig } from '../types/ManagerConfigs';
import {
    IBlockManagerRegistry,
    IConceroNetworkManager,
    ITxMonitor,
    IViemClientManager,
    MonitoredTransaction,
    TransactionInfo,
} from '../types/managers';

enum TransactionStatus {
    Pending = 'pending',
    Confirmed = 'confirmed',
    Finalized = 'finalized',
    Dropped = 'dropped',
    Reorged = 'reorged',
    Failed = 'failed',
}

interface TransactionMonitor {
    transaction: MonitoredTransaction;
    subscribers: Map<string, (txInfo: TransactionInfo, isFinalized: boolean) => void>;
    finalityBlockNumber?: bigint;
}

export class TxMonitor implements ITxMonitor {
    private static instance: TxMonitor | undefined;
    private monitors: Map<string, TransactionMonitor> = new Map();
    private viemClientManager: IViemClientManager;
    private disposed: boolean = false;
    private logger: LoggerInterface;
    private config: TxMonitorConfig;
    private networkSubscriptions: Map<string, () => void> = new Map();
    private blockManagerRegistry: IBlockManagerRegistry;
    private networkManager: IConceroNetworkManager;

    constructor(
        logger: LoggerInterface,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
    ) {
        this.viemClientManager = viemClientManager;
        this.logger = logger;
        this.config = config;
        this.blockManagerRegistry = blockManagerRegistry;
        this.networkManager = networkManager;
        this.logger.info('initialized');
    }

    public static createInstance(
        logger: LoggerInterface,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
    ): TxMonitor {
        if (!TxMonitor.instance) {
            TxMonitor.instance = new TxMonitor(
                logger,
                viemClientManager,
                blockManagerRegistry,
                networkManager,
                config,
            );
        }
        return TxMonitor.instance;
    }

    public static getInstance(): TxMonitor {
        if (!TxMonitor.instance) {
            throw new Error('TxMonitor is not initialized. Call createInstance() first.');
        }
        return TxMonitor.instance;
    }

    public ensureTxFinality(
        txInfo: TransactionInfo,
        onFinalityCallback: (txInfo: TransactionInfo, isFinalized: boolean) => void,
    ): void {
        const existingMonitor = this.monitors.get(txInfo.txHash);

        if (existingMonitor) {
            existingMonitor.subscribers.set(txInfo.id, onFinalityCallback);
            this.logger.debug(
                `Added subscriber ${txInfo.id} to existing monitor for tx ${txInfo.txHash}`,
            );
            return;
        }

        // Create new monitor
        const monitoredTx: MonitoredTransaction = {
            txHash: txInfo.txHash,
            chainName: txInfo.chainName,
            submittedAt: txInfo.submittedAt,
            blockNumber: txInfo.submissionBlock,
            status: TransactionStatus.Pending,
        };

        const monitor: TransactionMonitor = {
            transaction: monitoredTx,
            subscribers: new Map(),
            finalityBlockNumber: undefined,
        };

        monitor.subscribers.set(txInfo.id, onFinalityCallback);

        this.subscribeToNetwork(txInfo.chainName);

        this.monitors.set(txInfo.txHash, monitor);
        this.logger.debug(
            `Started monitoring tx ${txInfo.txHash} on ${txInfo.chainName} with subscriber ${txInfo.id}`,
        );
    }

    private async checkTransactionFinality(
        monitor: TransactionMonitor,
        currentBlock: bigint,
        finalityConfirmations: bigint,
        network: ConceroNetwork,
    ): Promise<void> {
        const tx = monitor.transaction;

        try {
            const { publicClient } = this.viemClientManager.getClients(network);
            const txInfo = await publicClient.getTransaction({
                hash: tx.txHash as `0x${string}`,
            });

            if (!txInfo) {
                await this.notifySubscribers(monitor, network, false);
                return;
            }

            if (!tx.blockNumber && txInfo.blockNumber) {
                tx.blockNumber = txInfo.blockNumber;
                this.logger.debug(
                    `Transaction ${tx.txHash} included in block ${txInfo.blockNumber}`,
                );
            }

            if (tx.blockNumber && txInfo.blockNumber && tx.blockNumber !== txInfo.blockNumber) {
                this.logger.warn(
                    `Transaction ${tx.txHash} block changed from ${tx.blockNumber} to ${txInfo.blockNumber} (reorg detected)`,
                );
                tx.blockNumber = txInfo.blockNumber;
                monitor.finalityBlockNumber = txInfo.blockNumber + finalityConfirmations;

                this.logger.debug(
                    `Transaction ${tx.txHash} finality block recalculated to ${monitor.finalityBlockNumber} after reorg`,
                );

                if (monitor.finalityBlockNumber && currentBlock < monitor.finalityBlockNumber) {
                    return;
                }
            }

            await this.notifySubscribers(monitor, network, true);
        } catch (error) {
            this.logger.error(`Error checking transaction ${tx.txHash}:`, error);

            await this.notifySubscribers(monitor, network, false);
        }
    }

    private async notifySubscribers(
        monitor: TransactionMonitor,
        network: ConceroNetwork,
        isFinalized: boolean,
    ): Promise<void> {
        const tx = monitor.transaction;

        const txStatus = isFinalized ? TransactionStatus.Finalized : TransactionStatus.Failed;
        this.logger.debug(
            `Transaction ${tx.txHash} ${txStatus} on ${network.name} - notifying subscribers`,
        );

        const txResult: TransactionInfo = {
            id: '', // Will be set per subscriber
            txHash: tx.txHash,
            chainName: tx.chainName,
            submittedAt: tx.submittedAt,
            submissionBlock: tx.blockNumber,
            status: txStatus,
        };

        monitor.subscribers.forEach((callback, subscriberId) => {
            const txForSubscriber: TransactionInfo = {
                ...txResult,
                id: subscriberId,
            };
            callback(txForSubscriber, isFinalized);
        });

        await this.removeMonitor(tx.txHash);
    }

    private getNetwork(chainName: string): ConceroNetwork | undefined {
        return this.networkManager.getNetworkByName(chainName);
    }

    private async checkNetworkTransactions(networkName: string, endBlock: bigint): Promise<void> {
        const network = this.getNetwork(networkName);
        if (!network) return;

        const networkMonitors = Array.from(this.monitors.values()).filter(
            monitor => monitor.transaction.chainName === networkName,
        );

        const finalityConfirmations = BigInt(
            network.finalityConfirmations ?? this.networkManager.getDefaultFinalityConfirmations(),
        );

        for (const monitor of networkMonitors) {
            if (!this.monitors.has(monitor.transaction.txHash)) {
                continue;
            }

            if (!monitor.finalityBlockNumber && monitor.transaction.blockNumber) {
                monitor.finalityBlockNumber =
                    monitor.transaction.blockNumber + finalityConfirmations;
            }

            if (monitor.finalityBlockNumber && endBlock >= monitor.finalityBlockNumber) {
                await this.checkTransactionFinality(
                    monitor,
                    endBlock,
                    finalityConfirmations,
                    network,
                );
            }
        }
    }

    private subscribeToNetwork(networkName: string): void {
        if (this.networkSubscriptions.has(networkName)) {
            return;
        }

        const blockManager = this.blockManagerRegistry.getBlockManager(networkName);
        if (!blockManager) {
            this.logger.warn(`BlockManager for ${networkName} not found`);
            return;
        }

        const unsubscribe = blockManager.watchBlocks({
            onBlockRange: async (startBlock: bigint, endBlock: bigint) => {
                await this.checkNetworkTransactions(networkName, endBlock);
            },
            onError: (error: unknown) => {
                this.logger.error(`Block monitoring error for ${networkName}:`, error);
            },
        });

        this.networkSubscriptions.set(networkName, unsubscribe);
        this.logger.debug(`Subscribed to blocks for network ${networkName}`);
    }

    private async removeMonitor(txHash: string): Promise<void> {
        const monitor = this.monitors.get(txHash);
        if (!monitor) return;

        this.monitors.delete(txHash);
    }

    public getMonitoredTransactions(chainName?: string): MonitoredTransaction[] {
        const transactions: MonitoredTransaction[] = [];

        for (const monitor of this.monitors.values()) {
            if (!chainName || monitor.transaction.chainName === chainName) {
                transactions.push(monitor.transaction);
            }
        }

        return transactions;
    }

    public dispose(): void {
        this.disposed = true;

        for (const [networkName, unsubscribe] of this.networkSubscriptions) {
            unsubscribe();
            this.logger.debug(`Unsubscribed from blocks for network ${networkName} during dispose`);
        }

        this.networkSubscriptions.clear();
        this.monitors.clear();
        this.logger.info('Disposed');
    }

    public static dispose(): void {
        if (TxMonitor.instance) {
            TxMonitor.instance.dispose();
            TxMonitor.instance = undefined;
        }
    }
}
