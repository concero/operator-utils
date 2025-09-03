import { ConceroNetwork } from '../ConceroNetwork';

export interface ITxMonitor {
    ensureTxFinality(
        txHash: string,
        chainName: string,
        onFinalityCallback: (txHash: string, chainName: string, isFinalized: boolean) => void,
    ): void;
    ensureTxInclusion(
        txHash: string,
        chainName: string,
        onTxIncluded: (
            txHash: string,
            networkName: string,
            blockNumber: bigint,
            isIncluded: boolean,
        ) => void,
        confirmations?: number,
    ): void;
    getMonitoredTransactions(chainName?: string): Array<{
        txHash: string;
        chainName: string;
        status: 'pending';
    }>;
}

/** Configuration for TxMonitor */
export interface TxMonitorConfig {
    maxInclusionWait?: number; // Maximum time to wait for inclusion in milliseconds
    maxFinalityWait?: number; // Maximum time to wait for finality in milliseconds
}
