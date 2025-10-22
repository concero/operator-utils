import { Hash } from 'viem';
export interface ITxMonitor {
    trackTxInclusion(txHash: Hash, chainName: string, subscriberId: string, confirmations?: number): void;
    trackTxFinality(txHash: Hash, chainName: string, subscriberId: string): void;
    cancel(txHash: Hash, subscriberId?: string): Promise<void>;
}
export interface TxMonitorConfig {
    maxInclusionWait?: number;
    maxFinalityWait?: number;
}
//# sourceMappingURL=ITxMonitor.d.ts.map