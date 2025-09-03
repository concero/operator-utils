import { IBlockManagerRegistry, IConceroNetworkManager, ILogger, ITxMonitor, IViemClientManager, TxMonitorConfig } from '../types';
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
    constructor(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig);
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig): TxMonitor;
    static getInstance(): TxMonitor;
    ensureTxFinality(txHash: string, chainName: string, onFinalityCallback: (txHash: string, chainName: string, isFinalized: boolean) => void): void;
    ensureTxInclusion(txHash: string, chainName: string, onTxIncluded: (txHash: string, networkName: string, blockNumber: bigint, isIncluded: boolean) => void, confirmations?: number): void;
    private generateSubscriberId;
    private checkTransactionStatus;
    private notifyFinalitySubscribers;
    private notifyInclusionSubscribers;
    private getNetwork;
    private checkNetworkTransactions;
    private subscribeToNetwork;
    private removeMonitor;
    getMonitoredTransactions(chainName?: string): Array<{
        txHash: string;
        chainName: string;
        status: 'pending';
    }>;
}
//# sourceMappingURL=TxMonitor.d.ts.map