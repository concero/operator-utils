import {
    InsufficientFundsError,
    IntrinsicGasTooHighError,
    IntrinsicGasTooLowError,
    TipAboveFeeCapError,
    TransactionTypeNotSupportedError,
    WaitForTransactionReceiptReturnType,
    type PublicClient,
    type SimulateContractParameters,
    type WalletClient,
} from 'viem';
import { asyncRetry } from './asyncRetry';
import { isNonceError } from './viemErrorParser';

import { INonceManager } from '../types';

export interface CallContractConfig {
    simulateTx: boolean;
    defaultGasLimit?: bigint;
}

const isRetryableError = (error: any) => {
    return isNonceError(error);
};

async function executeTransaction(
    publicClient: PublicClient,
    walletClient: WalletClient,
    params: SimulateContractParameters,
    nonceManager: INonceManager,
    config: CallContractConfig,
): Promise<WaitForTransactionReceiptReturnType> {
    // @ts-ignore @todo: fix typings
    const networkName = publicClient.chain.name;
    try {
        const nonce = await nonceManager.consume(networkName);

        let reqParams = {
            ...(config.defaultGasLimit && { gas: config.defaultGasLimit }),
            ...params,
            nonce,
        };

        if (config.simulateTx) {
            const { request } = await publicClient.simulateContract(reqParams);
            // @ts-ignore @todo: fix typings
            reqParams = request;
        }

        // @ts-ignore @todo: fix typings
        const txHash = await walletClient.writeContract(reqParams);

        return await publicClient.waitForTransactionReceipt({ hash: txHash });
    } catch (err) {
        //@dev: When we're absolutely sure that the TX didn't get mined, we decrement the nonce
        if (
            err instanceof InsufficientFundsError ||
            err instanceof IntrinsicGasTooLowError ||
            err instanceof IntrinsicGasTooHighError ||
            err instanceof TipAboveFeeCapError ||
            err instanceof TransactionTypeNotSupportedError
        ) {
            await nonceManager.decrement(networkName);
        }

        if (isNonceError(err)) {
            await nonceManager.refresh(networkName);
        }

        throw err;
    }
}

export async function callContract(
    publicClient: PublicClient,
    walletClient: WalletClient,
    params: SimulateContractParameters,
    nonceManager: INonceManager,
    config: CallContractConfig,
): Promise<WaitForTransactionReceiptReturnType> {
    return await asyncRetry<WaitForTransactionReceiptReturnType>(
        async () => executeTransaction(publicClient, walletClient, params, nonceManager, config),
        {
            maxRetries: 10,
            delayMs: 150,
            isRetryableError,
        },
    );
}
