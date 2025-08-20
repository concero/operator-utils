import { TransactionNotFoundError, WaitForTransactionReceiptTimeoutError } from 'viem';
export declare function isNonceError(error: Error): boolean;
export declare function isWaitingForReceiptError(error: Error): error is TransactionNotFoundError | WaitForTransactionReceiptTimeoutError;
//# sourceMappingURL=viemErrorParser.d.ts.map