import { LoggerInterface } from "../types/LoggerInterface";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { TxMonitorConfig } from "../types/ManagerConfigs";
import { ITxMonitor, IViemClientManager, MonitoredTransaction, TransactionInfo } from "../types/managers";
export declare class TxMonitor implements ITxMonitor {
    private static instance;
    private monitors;
    private viemClientManager;
    private disposed;
    private logger;
    private config;
    private checkInterval;
    constructor(logger: LoggerInterface, viemClientManager: IViemClientManager, config: TxMonitorConfig);
    static createInstance(logger: LoggerInterface, viemClientManager: IViemClientManager, config: TxMonitorConfig): TxMonitor;
    static getInstance(): TxMonitor;
    private startMonitoring;
    watchTxFinality(txInfo: TransactionInfo, retryCallback: (failedTx: TransactionInfo) => Promise<TransactionInfo | null>, finalityCallback: (finalizedTx: TransactionInfo) => void): void;
    addTransaction(txHash: string, txInfo: TransactionInfo): void;
    private checkAllTransactions;
    private checkNetworkTransactions;
    private checkTransaction;
    private handleMissingTransaction;
    private retryTransaction;
    private handleFinalizedTransaction;
    private getNetwork;
    checkTransactionsInRange(network: ConceroNetwork, startBlock: bigint, endBlock: bigint): Promise<void>;
    getMonitoredTransactions(chainName?: string): MonitoredTransaction[];
    getTransactionsByMessageId(): Map<string, MonitoredTransaction[]>;
    dispose(): void;
}
//# sourceMappingURL=TxMonitor.d.ts.map