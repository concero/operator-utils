import { Hash } from 'viem';
import { IBlockManagerRegistry, IConceroNetworkManager, ILogger, ITxMonitor, IViemClientManager, TxMonitorConfig } from '../types';
export declare class TxMonitor implements ITxMonitor {
    private static instance;
    private monitors;
    private viemClientManager;
    private logger;
    private config;
    private networkSubscriptions;
    private blockManagerRegistry;
    private networkManager;
    constructor(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig);
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig): TxMonitor;
    static getInstance(): TxMonitor;
    ensureTxFinality(txHash: Hash, chainName: string, onFinalityCallback: (txHash: string, chainName: string, isFinalized: boolean) => void): void;
    ensureTxInclusion(txHash: Hash, chainName: string, onTxIncluded: (txHash: Hash, networkName: string, blockNumber: bigint, isIncluded: boolean) => void, confirmations?: number): void;
    private checkTransactionStatus;
    private notifyFinalitySubscribers;
    private notifyInclusionSubscribers;
    private checkNetworkTransactions;
    private subscribeToNetwork;
    private removeMonitor;
}
//# sourceMappingURL=TxMonitor.d.ts.map