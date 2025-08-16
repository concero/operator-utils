import { LoggerInterface } from '../types/LoggerInterface';
import { TxMonitorConfig } from '../types/ManagerConfigs';
import { IBlockManagerRegistry, IConceroNetworkManager, ITxMonitor, IViemClientManager, MonitoredTransaction, TransactionInfo } from '../types/managers';
export declare class TxMonitor implements ITxMonitor {
    private static instance;
    private monitors;
    private viemClientManager;
    private disposed;
    private logger;
    private config;
    private networkSubscriptions;
    private blockManagerRegistry;
    private networkManager;
    constructor(logger: LoggerInterface, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig);
    static createInstance(logger: LoggerInterface, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig): TxMonitor;
    static getInstance(): TxMonitor;
    ensureTxFinality(txInfo: TransactionInfo, onFinalityCallback: (txInfo: TransactionInfo, isFinalized: boolean) => void): void;
    private checkTransactionFinality;
    private notifySubscribers;
    private getNetwork;
    private checkNetworkTransactions;
    private subscribeToNetwork;
    private removeMonitor;
    getMonitoredTransactions(chainName?: string): MonitoredTransaction[];
    dispose(): void;
    static dispose(): void;
}
//# sourceMappingURL=TxMonitor.d.ts.map