import { Hash } from 'viem';
export type MonitorType = 'inclusion' | 'finality';
export interface PersistedMonitor {
    txHash: Hash;
    chainName: string;
    type: MonitorType;
    requiredConfirmations: number;
    inclusionBlockNumber?: bigint;
    finalityBlockNumber?: bigint;
    startTime: number;
    subscribers: string[];
}
export interface ITxMonitorStore {
    upsertMonitor(m: PersistedMonitor): Promise<void>;
    getMonitor(txHash: Hash): Promise<PersistedMonitor | null>;
    listMonitorsByNetwork(chainName: string): Promise<PersistedMonitor[]>;
    addSubscriber(txHash: Hash, subscriberId: string): Promise<void>;
    removeMonitor(txHash: Hash): Promise<void>;
    setInclusionBlock(txHash: Hash, block: bigint): Promise<void>;
    setFinalityTarget(txHash: Hash, block: bigint): Promise<void>;
}
/** Default for development */
export declare class InMemoryTxMonitorStore implements ITxMonitorStore {
    private map;
    upsertMonitor(m: PersistedMonitor): Promise<void>;
    getMonitor(txHash: Hash): Promise<PersistedMonitor | null>;
    listMonitorsByNetwork(chainName: string): Promise<PersistedMonitor[]>;
    addSubscriber(txHash: Hash, subscriberId: string): Promise<void>;
    removeMonitor(txHash: Hash): Promise<void>;
    setInclusionBlock(txHash: Hash, block: bigint): Promise<void>;
    setFinalityTarget(txHash: Hash, block: bigint): Promise<void>;
}
//# sourceMappingURL=ITxMonitorStore.d.ts.map