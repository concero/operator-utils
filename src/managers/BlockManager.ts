import { type PublicClient } from 'viem';

import { BlockManagerConfig, ConceroNetwork, IBlockManager, ILogger } from '../types';
import { generateUid } from '../utils';

/**
 * BlockManager encapsulates block processing and canonical block emission for a single network.
 * It handles both the polling for new blocks and notifying registered subscribers about block ranges.
 */

/** Options for watching blocks */
type WatchBlocksOptions = {
    onBlockRange: (startBlock: bigint, endBlock: bigint) => Promise<void>;
};

type Subscriber = {
    id: string;
    onBlockRange: (startBlock: bigint, endBlock: bigint) => Promise<void>;
};

export class BlockManager implements IBlockManager {
    private lastReportedBlockNumber: bigint;
    private latestBlock: bigint | null = null;
    public readonly publicClient: PublicClient;
    private network: ConceroNetwork;
    private subscribers: Map<string, Subscriber> = new Map();

    protected logger: ILogger;
    private config: BlockManagerConfig;

    private isDisposed: boolean = false;
    private isPolling: boolean = false;
    private pollingIntervalMs: number;
    private pollingTimeout: NodeJS.Timeout | null = null;

    private constructor(
        initialBlock: bigint,
        network: ConceroNetwork,
        publicClient: PublicClient,
        logger: ILogger,
        config: BlockManagerConfig,
    ) {
        this.lastReportedBlockNumber = initialBlock;
        this.publicClient = publicClient;
        this.network = network;
        this.logger = logger;
        this.config = config;
        this.pollingIntervalMs = config.pollingIntervalMs;
    }

    static async create(
        network: ConceroNetwork,
        publicClient: PublicClient,
        logger: ILogger,
        config: BlockManagerConfig,
    ): Promise<BlockManager> {
        let initialBlock: bigint;
        const staticLogger = logger;

        initialBlock = await publicClient.getBlockNumber({ cacheTime: 0 });
        staticLogger.debug(`${network.name}: Starting from current chain tip: ${initialBlock}`);

        staticLogger.debug(
            `${network.name}: Creating new instance with initial block ${initialBlock}`,
        );

        const blockManager = new BlockManager(initialBlock, network, publicClient, logger, config);

        return blockManager;
    }

    public async startPolling(): Promise<void> {
        if (this.isPolling) {
            this.logger.debug(`${this.network.name}: Already polling, ignoring start request`);
            return;
        }

        this.isPolling = true;

        // await this.performCatchup();
        await this.poll();
    }

    private stopPolling(): void {
        if (!this.isPolling) {
            return;
        }

        this.logger.info(`${this.network.name}: Stopping block polling`);
        this.isPolling = false;

        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
            this.pollingTimeout = null;
        }
    }

    private async poll(): Promise<void> {
        if (!this.isPolling || this.isDisposed) {
            return;
        }

        try {
            this.latestBlock = await this.fetchLastBlockNumber();

            if (this.latestBlock > this.lastReportedBlockNumber) {
                const startBlock = this.lastReportedBlockNumber + 1n;

                await this.notifySubscribers(startBlock, this.latestBlock);
            }
        } catch (error) {
            this.logger.error(`${this.network.name}: Error in poll cycle: ${error}`);
        } finally {
            if (this.isPolling && !this.isDisposed) {
                this.pollingTimeout = setTimeout(() => this.poll(), this.pollingIntervalMs);
            }
        }
    }

    public async getLatestBlock(): Promise<bigint | null> {
        return this.latestBlock;
    }

    private async fetchLastBlockNumber(): Promise<bigint> {
        return await this.publicClient.getBlockNumber({ cacheTime: 0 });
    }

    private async notifySubscribers(startBlock: bigint, endBlock: bigint): Promise<void> {
        this.logger.debug(
            `${this.network.name}: Processing ${endBlock - startBlock + 1n} new blocks from ${startBlock} to ${endBlock}`,
        );

        if (this.subscribers.size > 0) {
            for (const subscriber of this.subscribers.values()) {
                void subscriber.onBlockRange(startBlock, endBlock).catch(error => {
                    this.logger.error(
                        `${this.network.name}: Error in block range subscriber ${subscriber.id}: ${error}`,
                    );
                });
            }
        }
        this.lastReportedBlockNumber = endBlock;
    }

    /**
     * Initiates a catchup process from the current processed block to the latest block.
     * This is typically called during initialization.
     */
    private async performCatchup(): Promise<void> {
        if (this.isDisposed) {
            this.logger.debug(`${this.network.name}: Already disposed, skipping catchup`);
            return;
        }

        try {
            this.latestBlock = await this.publicClient.getBlockNumber();
            let currentBlock: bigint = this.lastReportedBlockNumber;

            this.logger.debug(
                `${this.network.name}: Starting catchup from block ${currentBlock}, Chain tip: ${this.latestBlock}`,
            );

            while (currentBlock < this.latestBlock && !this.isDisposed) {
                const startBlock = currentBlock + 1n;
                const endBlock =
                    startBlock + this.config.catchupBatchSize - 1n > this.latestBlock
                        ? this.latestBlock
                        : startBlock + this.config.catchupBatchSize - 1n;

                await this.notifySubscribers(startBlock, endBlock);
                currentBlock = endBlock;
            }
        } catch (err) {
            this.logger.error(`${this.network.name}:`, err);
        }
    }

    /**
     * Registers a subscriber that will be called when new blocks are processed.
     * Returns an unregister function.
     */
    public watchBlocks(options: WatchBlocksOptions): () => void {
        const { onBlockRange } = options;
        const subscriberId = generateUid();

        this.subscribers.set(subscriberId, {
            id: subscriberId,
            onBlockRange,
        });

        return () => {
            this.logger.info(
                `${this.network.name}: Unregistered block range subscriber ${subscriberId}`,
            );
            this.subscribers.delete(subscriberId);
        };
    }

    public dispose(): void {
        this.isDisposed = true;
        this.stopPolling();
        this.subscribers.clear();
        this.logger.debug(`${this.network.name}: Disposed`);
    }
}
