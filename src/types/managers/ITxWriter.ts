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
