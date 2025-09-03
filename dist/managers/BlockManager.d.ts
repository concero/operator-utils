import { PublicClient } from 'viem';
import { BlockManagerConfig, ConceroNetwork, IBlockManager, ILogger } from '../types';
/**
 * BlockManager encapsulates block processing and canonical block emission for a single network.
 * It handles both the polling for new blocks and notifying registered handlers about block ranges.
 */
/** Options for watching blocks */
type WatchBlocksOptions = {
    onBlockRange: (startBlock: bigint, endBlock: bigint) => Promise<void>;
    onError?: (err: unknown) => void;
};
export declare class BlockManager implements IBlockManager {
    private lastProcessedBlockNumber;
    private latestBlock;
    readonly publicClient: PublicClient;
    private network;
    private blockRangeHandlers;
    protected logger: ILogger;
    private config;
    private isDisposed;
    private isPolling;
    private pollingIntervalMs;
    private pollingTimeout;
    private constructor();
    static create(network: ConceroNetwork, publicClient: PublicClient, logger: ILogger, config: BlockManagerConfig): Promise<BlockManager>;
    startPolling(): Promise<void>;
    private stopPolling;
    private poll;
    getLatestBlock(): Promise<bigint | null>;
    /**
     * Process a range of blocks by:
     * 1. Notifying all registered handlers about the new block range
     * 2. Updating the last processed block checkpoint
     */
    private processBlockRange;
    /**
     * Update the last processed block
     */
    private updateLastProcessedBlock;
    /**
     * Initiates a catchup process from the current processed block to the latest block.
     * This is typically called during initialization.
     */
    private performCatchup;
    /**
     * Registers a handler that will be called when new blocks are processed.
     * Returns an unregister function.
     */
    watchBlocks(options: WatchBlocksOptions): () => void;
    dispose(): void;
}
export {};
//# sourceMappingURL=BlockManager.d.ts.map