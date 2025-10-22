import { Hash } from 'viem';
import { IRetryStore, RetryState } from '../types/managers/IRetryStore';
export declare class InMemoryRetryStore implements IRetryStore {
    private ops;
    private txIndex;
    saveRetryAttempt<T = any>(key: string, chainName: string, attempt: number, nextTryAt: Date, payload?: T): Promise<void>;
    getRetryState<T = any>(key: string, chainName: string): Promise<RetryState<T> | null>;
    clearRetry(key: string, chainName: string): Promise<void>;
    saveTxIndex(chainName: string, txHash: Hash, opId: string): Promise<void>;
    getOpIdByTx(chainName: string, txHash: Hash): Promise<string | null>;
    clearTxIndex(chainName: string, txHash: Hash): Promise<void>;
}
//# sourceMappingURL=InMemoryRetryStore.d.ts.map