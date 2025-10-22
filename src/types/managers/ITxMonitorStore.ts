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
export class InMemoryTxMonitorStore implements ITxMonitorStore {
    private map = new Map<string, PersistedMonitor>();

    async upsertMonitor(m: PersistedMonitor) {
        this.map.set(m.txHash, m);
    }
    async getMonitor(txHash: Hash) {
        return this.map.get(txHash) ?? null;
    }
    async listMonitorsByNetwork(chainName: string) {
        return [...this.map.values()].filter(m => m.chainName === chainName);
    }
    async addSubscriber(txHash: Hash, subscriberId: string) {
        const m = this.map.get(txHash);
        if (!m) return;
        if (!m.subscribers.includes(subscriberId)) m.subscribers.push(subscriberId);
    }
    async removeMonitor(txHash: Hash) {
        this.map.delete(txHash);
    }
    async setInclusionBlock(txHash: Hash, block: bigint) {
        const m = this.map.get(txHash);
        if (!m) return;
        m.inclusionBlockNumber = block;
        this.map.set(txHash, m);
    }
    async setFinalityTarget(txHash: Hash, block: bigint) {
        const m = this.map.get(txHash);
        if (!m) return;
        m.finalityBlockNumber = block;
        this.map.set(txHash, m);
    }
}
