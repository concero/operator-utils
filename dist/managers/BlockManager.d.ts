import { type PublicClient } from 'viem';
import { BlockManagerConfig, ConceroNetwork, IBlockManager, ILogger } from '../types';
/**
 * BlockManager encapsulates block processing and canonical block emission for a single network.
 * It handles both the polling for new blocks and notifying registered subscribers about block ranges.
 */
/** Options for watching blocks */
type WatchBlocksOptions = {
    onBlockRange: (startBlock: bigint, endBlock: bigint) => Promise<void>;
};
export declare class BlockManager implements IBlockManager {
    private lastReportedBlockNumber;
    private latestBlock;
    readonly publicClient: PublicClient;
    private network;
    private subscribers;
    protected logger: ILogger;
    private readonly config;
    private isDisposed;
    private isPolling;
    private pollingTimeout;
    private constructor();
    static create(config: BlockManagerConfig, network: ConceroNetwork, publicClient: PublicClient, logger: ILogger): Promise<BlockManager>;
    startPolling(): Promise<void>;
    private stopPolling;
    private poll;
    getLatestBlock(): Promise<bigint | null>;
    private fetchLastBlockNumber;
    private notifySubscribers;
    /**
     * Initiates a catchup process from the current processed block to the latest block.
     * This is typically called during initialization.
     */
    /**
     * Registers a subscriber that will be called when new blocks are processed.
     * Returns an unregister function.
     */
    watchBlocks(options: WatchBlocksOptions, subscriberId?: string): () => void;
    dispose(): void;
}
export {};
//# sourceMappingURL=BlockManager.d.ts.map