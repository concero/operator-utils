export interface IBlockManager {
    getLatestBlock(): Promise<bigint | null>;
    watchBlocks(options: {
        onBlockRange: (startBlock: bigint, endBlock: bigint, finalizedBlock?: bigint) => Promise<void>;
    }): () => void;
    dispose(): void;
}

export type BlockManagerConfig = {
    pollingIntervalMs: number;
    catchupBatchSize: bigint;
    useCheckpoints: boolean;
};
