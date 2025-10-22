import { Hash } from 'viem';

import { IRetryStore, RetryState } from '../types/managers/IRetryStore';

const opKey = (chain: string, key: string) => `${chain}:${key}`;
const txKey = (chain: string, tx: string) => `${chain}:${tx}`;

export class InMemoryRetryStore implements IRetryStore {
    private ops = new Map<string, RetryState<any>>();
    private txIndex = new Map<string, string>();

    async saveRetryAttempt<T = any>(
        key: string,
        chainName: string,
        attempt: number,
        nextTryAt: Date,
        payload?: T,
    ): Promise<void> {
        this.ops.set(opKey(chainName, key), { attempt, nextTryAt, payload });
    }

    async getRetryState<T = any>(key: string, chainName: string): Promise<RetryState<T> | null> {
        return (this.ops.get(opKey(chainName, key)) as RetryState<T>) ?? null;
    }

    async clearRetry(key: string, chainName: string): Promise<void> {
        this.ops.delete(opKey(chainName, key));
    }

    async saveTxIndex(chainName: string, txHash: Hash, opId: string): Promise<void> {
        this.txIndex.set(txKey(chainName, txHash), opId);
    }

    async getOpIdByTx(chainName: string, txHash: Hash): Promise<string | null> {
        return this.txIndex.get(txKey(chainName, txHash)) ?? null;
    }

    async clearTxIndex(chainName: string, txHash: Hash): Promise<void> {
        this.txIndex.delete(txKey(chainName, txHash));
    }
}
