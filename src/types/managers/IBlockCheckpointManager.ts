export interface IBlockCheckpointManager {
    getCheckpoint(chainSelector: number): Promise<bigint | undefined>;
    updateLastProcessedBlock(chainSelector: number, blockNumber: bigint): Promise<void>;
}
