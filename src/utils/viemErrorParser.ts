import {
    BaseError,
    ContractFunctionExecutionError,
    NonceTooHighError,
    NonceTooLowError,
    TransactionExecutionError,
} from 'viem';

/**

 * Production-ready nonce error detection for arbitrary RPC providers
 * Handles JSON-RPC 2.0 standard errors and custom RPC formats
 */
export function isNonceError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const errorTree = extractErrorTree(error);

    return errorTree.some(node => isViemNonceError(node) || isStringNonceError(node));
}

/**
 * Extracts all error nodes from the error tree using breadth-first traversal
 * Handles both .cause and .error chains with cycle detection
 */
function extractErrorTree(error: unknown): any[] {
    const nodes: any[] = [];
    const visited = new WeakSet();
    const queue: any[] = [error];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== 'object' || visited.has(current)) {
            continue;
        }

        visited.add(current);
        nodes.push(current);

        if (current.cause) queue.push(current.cause);
        if (current.error) queue.push(current.error);
        if (current.message) queue.push(current.message);
    }

    return nodes;
}

/**
 * Checks for Viem's native nonce error types
 */
function isViemNonceError(error: any): boolean {
    return (
        error instanceof NonceTooHighError ||
        error instanceof NonceTooLowError ||
        (error instanceof ContractFunctionExecutionError &&
            error.cause instanceof TransactionExecutionError &&
            (error.cause.cause instanceof NonceTooHighError ||
                error.cause.cause instanceof NonceTooLowError))
    );
}

/**
 * Checks error messages for nonce-related patterns
 * Uses regex for robust pattern matching across different RPC formats
 */
function isStringNonceError(error: any): boolean {
    const NONCE_REGEX = /nonce/i;
    if (!error.message || typeof error.message !== 'string') {
        return false;
    }

    const message = error.message.toLowerCase();

    return NONCE_REGEX.test(message);
}
