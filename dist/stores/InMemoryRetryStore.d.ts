import { IRetryStore } from '../types/managers/IRetryStore';
export declare class InMemoryRetryStore implements IRetryStore {
    private store;
    private key;
    saveRetryAttempt(key: string, chainName: string, attempt: number, nextTryAt: Date): Promise<void>;
    getRetryState(key: string, chainName: string): Promise<{
        attempt: number;
        nextTryAt: Date;
    } | null>;
    clearRetry(key: string, chainName: string): Promise<void>;
}
//# sourceMappingURL=InMemoryRetryStore.d.ts.map