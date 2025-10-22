import { Hash } from 'viem';

export interface RetryState<T = any> {
    attempt: number;
    nextTryAt: Date;
    payload?: T;
}

export interface IRetryStore {
    saveRetryAttempt<T = any>(
        key: string,
        chainName: string,
        attempt: number,
        nextTryAt: Date,
        payload?: T,
    ): Promise<void>;

    getRetryState<T = any>(key: string, chainName: string): Promise<RetryState<T> | null>;

    clearRetry(key: string, chainName: string): Promise<void>;

    saveTxIndex(chainName: string, txHash: Hash, opId: string): Promise<void>;
    getOpIdByTx(chainName: string, txHash: Hash): Promise<string | null>;
    clearTxIndex(chainName: string, txHash: Hash): Promise<void>;
}
