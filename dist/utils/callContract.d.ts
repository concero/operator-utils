import { Hash, type PublicClient, type SimulateContractParameters, type WalletClient } from 'viem';
import { INonceManager } from '../types/managers';
export interface CallContractConfig {
    simulateTx: boolean;
    defaultGasLimit?: bigint;
}
export declare function callContract(publicClient: PublicClient, walletClient: WalletClient, params: SimulateContractParameters, nonceManager: INonceManager, config: CallContractConfig): Promise<Hash>;
//# sourceMappingURL=callContract.d.ts.map