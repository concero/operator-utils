export interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
    isRetryableError?: (error: any) => Promise<boolean>;
}
export declare function asyncRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=asyncRetry.d.ts.map