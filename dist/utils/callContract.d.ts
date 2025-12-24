import { WaitForTransactionReceiptReturnType, type PublicClient, type SimulateContractParameters, type WalletClient } from 'viem';
import { INonceManager } from '../types';
export interface CallContractConfig {
    simulateTx: boolean;
    defaultGasLimit?: bigint;
}
export declare function callContract(publicClient: PublicClient, walletClient: WalletClient, params: SimulateContractParameters, nonceManager: INonceManager, config: CallContractConfig): Promise<WaitForTransactionReceiptReturnType>;
//# sourceMappingURL=callContract.d.ts.map