import {
    Hash,
    InsufficientFundsError,
    IntrinsicGasTooHighError,
    IntrinsicGasTooLowError,
    TipAboveFeeCapError,
    TransactionTypeNotSupportedError,
    UserRejectedRequestError,
    type PublicClient,
    type SimulateContractParameters,
    type WalletClient,
} from 'viem';
import { asyncRetry } from './asyncRetry';
import { isNonceError } from './viemErrorParser';

import { INonceManager } from '../types/managers';

export interface CallContractConfig {
    simulateTx: boolean;
    defaultGasLimit?: bigint;
}

async function executeTransaction(
    publicClient: PublicClient,
    walletClient: WalletClient,
    params: SimulateContractParameters,
    nonceManager: INonceManager,
    config: CallContractConfig,
): Promise<Hash> {
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
        return txHash;
    } catch (err) {
        //@dev: When we're absolutely sure that the TX didn't get mined, we decrement the nonce
        if (
            err instanceof UserRejectedRequestError ||
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

const isRetryableError = (error: any) => {
    if (isNonceError(error)) return true;
    return false;
};

export async function callContract(
    publicClient: PublicClient,
    walletClient: WalletClient,
    params: SimulateContractParameters,
    nonceManager: INonceManager,
    config: CallContractConfig,
): Promise<Hash> {
    const txHash = await asyncRetry<Hash>(
        async () => executeTransaction(publicClient, walletClient, params, nonceManager, config),
        {
            maxRetries: 10,
            delayMs: 150,
            isRetryableError,
        },
    );

    if (!txHash) {
        throw new Error('All attempts exhausted');
    }

    return txHash;
}
