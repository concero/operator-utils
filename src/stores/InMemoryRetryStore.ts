import { IRetryStore } from '../types/managers/IRetryStore';

export class InMemoryRetryStore implements IRetryStore {
    private store = new Map<string, { attempt: number; nextTryAt: Date }>();

    private key(k: string, chain: string) {
        return `${chain}:${k}`;
    }

    async saveRetryAttempt(key: string, chainName: string, attempt: number, nextTryAt: Date) {
        this.store.set(this.key(key, chainName), { attempt, nextTryAt });
    }

    async getRetryState(key: string, chainName: string) {
        return this.store.get(this.key(key, chainName)) ?? null;
    }

    async clearRetry(key: string, chainName: string) {
        this.store.delete(this.key(key, chainName));
    }
}
