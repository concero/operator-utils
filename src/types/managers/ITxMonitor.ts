import { Hash } from 'viem';

export interface ITxMonitor {
    trackTxInclusion(
        txHash: Hash,
        chainName: string,
        subscriberId: string,
        confirmations?: number, // default 1
    ): void;

    trackTxFinality(txHash: Hash, chainName: string, subscriberId: string): void;

    cancel(txHash: Hash, subscriberId?: string): Promise<void>;
}

export interface TxMonitorConfig {
    maxInclusionWait?: number; // ms
    maxFinalityWait?: number; // ms
}
