import { SimulateContractParameters, WaitForTransactionReceiptReturnType } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface ITxWriter {
    callContract(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality?: boolean,
        opts?: {
            confirmations?: number; // TODO(v3)
            operationId?: string;
        },
    ): Promise<WaitForTransactionReceiptReturnType>;
    initialize(): Promise<void>;
}

/** Configuration for TxWriter */
export interface TxWriterConfig {
    dryRun: boolean;
    simulateTx: boolean;
    defaultGasLimit?: bigint;
    maxCallbackRetries: number;
}
