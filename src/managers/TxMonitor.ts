import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { TxMonitorConfig } from '../types/ManagerConfigs';
import {
    ITxMonitor,
    IViemClientManager,
    MonitoredTransaction,
    TransactionInfo,
	IConceroNetworkManager,
	IBlockManagerRegistry,
} from "../types/managers";

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
    retryCallback: (failedTx: TransactionInfo) => Promise<TransactionInfo | null>;
    finalityCallback: (finalizedTx: TransactionInfo) => void;
    retryCount: number;
    lastRetryAt?: number;
}

export class TxMonitor implements ITxMonitor {
    private static instance: TxMonitor | undefined;
    private monitors: Map<string, TransactionMonitor> = new Map();
    private viemClientManager: IViemClientManager;
    private disposed: boolean = false;
    private logger: LoggerInterface;
    private config: TxMonitorConfig;
    private networkSubscriptions: Map<string, () => void> = new Map();
    private networksWithTransactions: Set<string> = new Set();
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
        this.logger.info("initialized");
    }

    public static createInstance(
        logger: LoggerInterface,
        viemClientManager: IViemClientManager,
		blockManagerRegistry: IBlockManagerRegistry,
		networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
    ): TxMonitor {
        if (!TxMonitor.instance) {
            TxMonitor.instance = new TxMonitor(logger, viemClientManager, blockManagerRegistry, networkManager, config);
        }
        return TxMonitor.instance;
    }

    public static getInstance(): TxMonitor {
        if (!TxMonitor.instance) {
            throw new Error('TxMonitor is not initialized. Call createInstance() first.');
        }
        return TxMonitor.instance;
    }

    public watchTxFinality(
        txInfo: TransactionInfo,
        retryCallback: (failedTx: TransactionInfo) => Promise<TransactionInfo | null>,
        finalityCallback: (finalizedTx: TransactionInfo) => void,
    ): void {
        if (this.monitors.has(txInfo.txHash)) {
            this.logger.debug(`Transaction ${txInfo.txHash} is already being monitored`);
            return;
        }

        const monitoredTx: MonitoredTransaction = {
            txHash: txInfo.txHash,
            chainName: txInfo.chainName,
            blockNumber: txInfo.submissionBlock,
            firstSeen: Date.now(),
            lastChecked: Date.now(),
            status: TransactionStatus.Pending,
            managedTxId: txInfo.id,
        };

        const monitor: TransactionMonitor = {
            transaction: monitoredTx,
            retryCallback,
            finalityCallback,
            retryCount: 0,
        };

        this.subscribeToNetwork(txInfo.chainName);
        
        this.monitors.set(txInfo.txHash, monitor);
        this.logger.debug(`Started monitoring tx ${txInfo.txHash} on ${txInfo.chainName}`);
    }

    public addTransaction(txHash: string, txInfo: TransactionInfo): void {
        // This method is kept for backward compatibility but delegates to watchTxFinality
        this.logger.warn(`addTransaction called directly - use watchTxFinality instead`);

        // Create default callbacks for backward compatibility
        const defaultRetryCallback = async (
            failedTx: TransactionInfo,
        ): Promise<TransactionInfo | null> => {
            this.logger.warn(
                `Transaction ${failedTx.txHash} failed but no retry callback provided`,
            );
            return null;
        };

        const defaultFinalityCallback = (finalizedTx: TransactionInfo): void => {
            this.logger.info(
                `Transaction ${finalizedTx.txHash} finalized (using legacy addTransaction)`,
            );
        };

        this.watchTxFinality(txInfo, defaultRetryCallback, defaultFinalityCallback);
    }

    private async checkTransaction(
        monitor: TransactionMonitor,
        currentBlock: bigint,
        finalityBlockNumber: bigint,
        network: ConceroNetwork,
    ): Promise<void> {
        const tx = monitor.transaction;
        tx.lastChecked = Date.now();

        try {
            const { publicClient } = this.viemClientManager.getClients(network);
            const txInfo = await publicClient.getTransaction({
                hash: tx.txHash as `0x${string}`,
            });

            if (!txInfo) {
                await this.handleMissingTransaction(monitor, network);
                return;
            }

            // Update block number if not set
            if (!tx.blockNumber && txInfo.blockNumber) {
                tx.blockNumber = txInfo.blockNumber;
                this.logger.debug(
                    `Transaction ${tx.txHash} included in block ${txInfo.blockNumber}`,
                );
            }

            // Check if block number changed (potential reorg)
            if (tx.blockNumber && txInfo.blockNumber && tx.blockNumber !== txInfo.blockNumber) {
                this.logger.warn(
                    `Transaction ${tx.txHash} block changed from ${tx.blockNumber} to ${txInfo.blockNumber} (reorg detected)`,
                );
                tx.blockNumber = txInfo.blockNumber;
            }

            // Check if transaction has reached finality
            if (txInfo.blockNumber && txInfo.blockNumber <= finalityBlockNumber) {
                await this.handleFinalizedTransaction(monitor);
            } else if (txInfo.blockNumber) {
                const confirmations = currentBlock - txInfo.blockNumber + 1n;
                const requiredConfirmations = BigInt(network.finalityConfirmations ?? this.networkManager.getDefaultFinalityConfirmations());
                this.logger.debug(
                    `Transaction ${tx.txHash} has ${confirmations} confirmations (needs ${requiredConfirmations})`,
                );
            }
        } catch (error) {
            this.logger.error(`Error checking transaction ${tx.txHash}:`, error);

            // If there's a persistent error, consider retrying the transaction
            const timeSinceLastRetry = tx.lastChecked - (monitor.lastRetryAt || 0);
            const retryDelayMs = this.config.retryDelayMs || 30000;

            if (timeSinceLastRetry > retryDelayMs) {
                await this.retryTransaction(monitor, network);
            }
        }
    }

    private async handleMissingTransaction(
        monitor: TransactionMonitor,
        network: ConceroNetwork,
    ): Promise<void> {
        const tx = monitor.transaction;

        // Give the transaction some time before considering it dropped
        const timeSinceSubmission = Date.now() - tx.firstSeen;
        const dropTimeoutMs = this.config.dropTimeoutMs || 60000;

        if (timeSinceSubmission < dropTimeoutMs) {
            this.logger.debug(
                `Transaction ${tx.txHash} not found yet (${timeSinceSubmission}ms since submission)`,
            );
            return;
        }

        tx.status = TransactionStatus.Dropped;
        this.logger.warn(
            `Transaction ${tx.txHash} not found on chain ${network.name} after ${timeSinceSubmission}ms`,
        );

        await this.retryTransaction(monitor, network);
    }

    private async retryTransaction(
        monitor: TransactionMonitor,
        network: ConceroNetwork,
    ): Promise<void> {
        const tx = monitor.transaction;
        monitor.retryCount++;
        monitor.lastRetryAt = Date.now();

        this.logger.info(
            `Retrying transaction ${tx.txHash} on ${network.name} (attempt ${monitor.retryCount})`,
        );

        // Create a TransactionInfo from MonitoredTransaction for the retry callback
        const failedTx: TransactionInfo = {
            id: tx.managedTxId,
            txHash: tx.txHash,
            chainName: tx.chainName,
            submittedAt: tx.firstSeen,
            submissionBlock: tx.blockNumber,
            status: 'failed',
        };

        const newTxInfo = await monitor.retryCallback(failedTx);

        if (newTxInfo) {
            // Remove the old monitor
            await this.removeMonitor(tx.txHash);

            // Add new monitor for the retry transaction
            this.watchTxFinality(newTxInfo, monitor.retryCallback, monitor.finalityCallback);

            this.logger.info(`Transaction ${tx.txHash} replaced with ${newTxInfo.txHash}`);
        } else {
            this.logger.error(`Failed to retry transaction ${tx.txHash} - will try again later`);
        }
    }

    private async handleFinalizedTransaction(monitor: TransactionMonitor): Promise<void> {
        const tx = monitor.transaction;
        tx.status = TransactionStatus.Finalized;

        this.logger.info(`Transaction ${tx.txHash} has reached finality on ${tx.chainName}`);

        // Create a TransactionInfo for the finality callback
        const finalizedTx: TransactionInfo = {
            id: tx.managedTxId,
            txHash: tx.txHash,
            chainName: tx.chainName,
            submittedAt: tx.firstSeen,
            submissionBlock: tx.blockNumber,
            status: 'finalized',
        };

        monitor.finalityCallback(finalizedTx);

        // Remove from monitoring
        await this.removeMonitor(tx.txHash);
    }

    private getNetwork(chainName: string): ConceroNetwork | undefined {
        return this.networkManager.getNetworkByName(chainName);
    }

    private async checkNetworkTransactions(
        networkName: string, 
        startBlock: bigint, 
        endBlock: bigint
    ): Promise<void> {
        const network = this.getNetwork(networkName);
        if (!network) return;

        const networkMonitors = Array.from(this.monitors.values())
            .filter(monitor => monitor.transaction.chainName === networkName);

        if (networkMonitors.length === 0) {
            this.unsubscribeFromNetwork(networkName);
            return;
        }

        const finalityConfirmations = BigInt(network.finalityConfirmations ?? this.networkManager.getDefaultFinalityConfirmations());
        const finalityBlockNumber = endBlock - finalityConfirmations;

        for (const monitor of networkMonitors) {
            await this.checkTransaction(monitor, endBlock, finalityBlockNumber, network);
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
                await this.checkNetworkTransactions(networkName, startBlock, endBlock);
            },
            onError: (error: unknown) => {
                this.logger.error(`Block monitoring error for ${networkName}:`, error);
            }
        });

        this.networkSubscriptions.set(networkName, unsubscribe);
        this.networksWithTransactions.add(networkName);
        this.logger.debug(`Subscribed to blocks for network ${networkName}`);
    }

    private unsubscribeFromNetwork(networkName: string): void {
        const unsubscribe = this.networkSubscriptions.get(networkName);
        if (unsubscribe) {
            unsubscribe();
            this.networkSubscriptions.delete(networkName);
            this.networksWithTransactions.delete(networkName);
            this.logger.debug(`Unsubscribed from blocks for network ${networkName}`);
        }
    }

    private async removeMonitor(txHash: string): Promise<void> {
        const monitor = this.monitors.get(txHash);
        if (!monitor) return;

        const networkName = monitor.transaction.chainName;
        this.monitors.delete(txHash);

        const hasMoreTransactions = Array.from(this.monitors.values())
            .some(m => m.transaction.chainName === networkName);

        if (!hasMoreTransactions) {
            this.unsubscribeFromNetwork(networkName);
        }
    }

    public async checkTransactionsInRange(
        network: ConceroNetwork,
        startBlock: bigint,
        endBlock: bigint,
    ): Promise<void> {
        // This method can be used for batch checking if needed
        this.logger.debug(`Batch checking not implemented - using continuous monitoring instead`);
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

    public getTransactionsByMessageId(): Map<string, MonitoredTransaction[]> {
        // This method is no longer relevant for a generic monitor
        this.logger.warn('getTransactionsByMessageId called on generic TxMonitor');
        return new Map();
    }

    public dispose(): void {
        this.disposed = true;

        for (const [networkName, unsubscribe] of this.networkSubscriptions) {
            unsubscribe();
            this.logger.debug(`Unsubscribed from blocks for network ${networkName} during dispose`);
        }
        
        this.networkSubscriptions.clear();
        this.networksWithTransactions.clear();
        this.monitors.clear();
        this.logger.info('Disposed');
    }
}
