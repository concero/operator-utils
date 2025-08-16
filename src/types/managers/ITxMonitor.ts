import { ConceroNetwork } from '../ConceroNetwork';

export interface TransactionInfo {
    id: string;
    txHash: string;
    chainName: string;
    submittedAt: number;
    submissionBlock: bigint | null;
    status: string;
    metadata?: {
        functionName?: string;
        contractAddress?: string;
        [key: string]: any;
    };
}

export interface MonitoredTransaction {
    txHash: string;
    chainName: string;
    submittedAt: number;
    blockNumber: bigint | null;
    status: string;
}

export interface ITxMonitor {
    ensureTxFinality(
        txInfo: TransactionInfo,
        onFinalityCallback: (txInfo: TransactionInfo, isFinalized: boolean) => void,
    ): void;
    getMonitoredTransactions(chainName?: string): MonitoredTransaction[];
    dispose(): void;
}
