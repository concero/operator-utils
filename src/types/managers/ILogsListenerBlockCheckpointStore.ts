import { Address } from 'viem';

export interface ILogsListenerBlockCheckpointStore {
    getBlockCheckpoint(
        chainSelector: number,
        contractAddress: Address,
    ): Promise<bigint | undefined>;
    updateBlockCheckpoint(
        chainSelector: number,
        contractAddress: Address,
        blockNumber: bigint,
    ): Promise<void>;
}
