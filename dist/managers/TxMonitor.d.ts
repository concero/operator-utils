import { Hash } from 'viem';
import { IBlockManagerRegistry, IConceroNetworkManager, ILogger, ITxMonitor, IViemClientManager, TxMonitorConfig } from '../types';
import { ITxMonitorStore } from '../types/managers';
export declare class TxMonitor implements ITxMonitor {
    private static instance;
    private viemClientManager;
    private logger;
    private config;
    private networkSubscriptions;
    private blockManagerRegistry;
    private networkManager;
    private store;
    private hub;
    constructor(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig, store?: ITxMonitorStore);
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, blockManagerRegistry: IBlockManagerRegistry, networkManager: IConceroNetworkManager, config: TxMonitorConfig, store?: ITxMonitorStore): TxMonitor;
    static getInstance(): TxMonitor;
    trackTxFinality(txHash: Hash, chainName: string, subscriberId: string): void;
    trackTxInclusion(txHash: Hash, chainName: string, subscriberId: string, confirmations?: number): void;
    cancel(txHash: Hash, subscriberId?: string): Promise<void>;
    private upsertMonitor;
    private checkNetworkTransactions;
    private checkTransactionStatus;
    private notifySubscribers;
    private subscribeToNetwork;
}
//# sourceMappingURL=TxMonitor.d.ts.map