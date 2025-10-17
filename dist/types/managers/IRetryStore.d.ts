export interface IRetryStore {
    saveRetryAttempt(key: string, chainName: string, attempt: number, nextTryAt: Date): Promise<void>;
    getRetryState(key: string, chainName: string): Promise<{
        attempt: number;
        nextTryAt: Date;
    } | null>;
    clearRetry(key: string, chainName: string): Promise<void>;
}
//# sourceMappingURL=IRetryStore.d.ts.map