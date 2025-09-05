import { SimulateContractParameters } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface ITxWriter {
    callContract(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality?: boolean,
    ): Promise<string>;
    initialize(): Promise<void>;
}

/** Configuration for TxWriter */
export interface TxWriterConfig {
    dryRun: boolean;
    simulateTx: boolean;
    defaultGasLimit?: bigint;
    maxCallbackRetries: number;
}
