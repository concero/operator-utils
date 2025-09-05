import { Hash } from 'viem';
export interface ITxMonitor {
    ensureTxFinality(txHash: Hash, chainName: string, onFinalityCallback: (txHash: Hash, chainName: string, isFinalized: boolean) => void): void;
    ensureTxInclusion(txHash: Hash, chainName: string, onTxIncluded: (txHash: Hash, networkName: string, blockNumber: bigint, isIncluded: boolean) => void, confirmations?: number): void;
}
/** Configuration for TxMonitor */
export interface TxMonitorConfig {
    maxInclusionWait?: number;
    maxFinalityWait?: number;
}
//# sourceMappingURL=ITxMonitor.d.ts.map