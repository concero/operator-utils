import {
    BaseError,
    ContractFunctionExecutionError,
    NonceTooHighError,
    NonceTooLowError,
    TransactionExecutionError,
    TransactionNotFoundError,
    WaitForTransactionReceiptTimeoutError,
} from 'viem';

export function isNonceError(error: Error) {
    return (
        (error instanceof ContractFunctionExecutionError &&
            error.cause instanceof TransactionExecutionError &&
            (error.cause.cause instanceof NonceTooHighError ||
                error.cause.cause instanceof NonceTooLowError)) ||
        error instanceof NonceTooHighError ||
        error instanceof NonceTooLowError
    );
}

export function isWaitingForReceiptError(error: Error) {
    return (
        error instanceof TransactionNotFoundError ||
        error instanceof WaitForTransactionReceiptTimeoutError
    );
}
