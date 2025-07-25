import { PublicClient } from "viem";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { BlockManagerConfig } from "../types/ManagerConfigs";
import { IBlockManager } from "../types/managers";
import { IBlockCheckpointManager } from "../types/managers";
import { LoggerInterface } from "../types/LoggerInterface";
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
    private blockCheckpointManager;
    private blockRangeHandlers;
    protected logger: LoggerInterface;
    private config;
    private isDisposed;
    private isPolling;
    private pollingIntervalMs;
    private pollingTimeout;
    private constructor();
    static create(network: ConceroNetwork, publicClient: PublicClient, blockCheckpointManager: IBlockCheckpointManager, logger: LoggerInterface, config: BlockManagerConfig): Promise<BlockManager>;
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
     * Update the last processed block checkpoint
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