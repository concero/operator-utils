import { Hash } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface ITxMonitor {
    ensureTxFinality(
        txHash: Hash,
        chainName: string,
        onFinalityCallback: (txHash: Hash, chainName: string, isFinalized: boolean) => void,
    ): void;
    ensureTxInclusion(
        txHash: Hash,
        chainName: string,
        onTxIncluded: (
            txHash: Hash,
            networkName: string,
            blockNumber: bigint,
            isIncluded: boolean,
        ) => void,
        confirmations?: number,
    ): void;
}

/** Configuration for TxMonitor */
export interface TxMonitorConfig {
    maxInclusionWait?: number; // Maximum time to wait for inclusion in milliseconds
    maxFinalityWait?: number; // Maximum time to wait for finality in milliseconds
}
