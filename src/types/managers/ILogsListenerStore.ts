import { Address } from 'viem';

export interface IStuckBlockRange {
    from: bigint;
    to: bigint;
}

export interface ILogsListenerStore {
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
