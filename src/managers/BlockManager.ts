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
    private lastReportedBlockNumber: bigint = 0n;
    private latestBlock: bigint | null = null;
    public readonly publicClient: PublicClient;
    private network: ConceroNetwork;
    private subscribers: Map<string, Subscriber> = new Map();
    protected logger: ILogger;
    private readonly config: BlockManagerConfig;
    private isDisposed: boolean = false;
    private isPolling: boolean = false;
    private pollingTimeout: NodeJS.Timeout | null = null;

    private constructor(
        config: BlockManagerConfig,
        network: ConceroNetwork,
        publicClient: PublicClient,
        logger: ILogger,
    ) {
        this.publicClient = publicClient;
        this.network = network;
        this.logger = logger;
        this.config = config;
    }

    static async create(
        config: BlockManagerConfig,
        network: ConceroNetwork,
        publicClient: PublicClient,
        logger: ILogger,
    ) {
        logger.debug(`${network.name}: Creating new instance`);
        return new BlockManager(config, network, publicClient, logger);
    }

    public async startPolling() {
        if (this.isPolling) {
            this.logger.debug(`${this.network.name}: Already polling, ignoring start request`);
            return;
        }

        this.lastReportedBlockNumber = await this.fetchLastBlockNumber();
        this.isPolling = true;

        // await this.performCatchup();
        await this.poll();
    }

    private stopPolling() {
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

    private async poll() {
        if (!this.isPolling || this.isDisposed) return;

        try {
            this.latestBlock = await this.fetchLastBlockNumber();

            if (this.latestBlock > this.lastReportedBlockNumber + 1n) {
                await this.notifySubscribers(this.lastReportedBlockNumber + 1n, this.latestBlock);
                this.lastReportedBlockNumber = this.latestBlock;
            }
        } catch (error) {
            this.logger.error(`${this.network.name}: Error in poll cycle: ${error}`);
        } finally {
            if (this.isPolling && !this.isDisposed) {
                this.pollingTimeout = setTimeout(() => this.poll(), this.config.pollingIntervalMs);
            }
        }
    }

    public async getLatestBlock() {
        return this.latestBlock;
    }

    private async fetchLastBlockNumber() {
        return await this.publicClient.getBlockNumber({ cacheTime: 0 });
    }

    private async notifySubscribers(startBlock: bigint, endBlock: bigint) {
        this.logger.debug(
            `${this.network.name}: Processing ${endBlock - startBlock} new blocks from ${startBlock} to ${endBlock}`,
        );

        if (this.subscribers.size > 0) {
            for (const subscriber of this.subscribers.values()) {
                subscriber.onBlockRange(startBlock, endBlock).catch(error => {
                    this.logger.error(
                        `${this.network.name}: Error in block range subscriber ${subscriber.id}: ${error}`,
                    );
                });
            }
        }
    }

    /**
     * Initiates a catchup process from the current processed block to the latest block.
     * This is typically called during initialization.
     */
    // private async performCatchup() {
    //     if (this.isDisposed) {
    //         this.logger.debug(`${this.network.name}: Already disposed, skipping catchup`);
    //         return;
    //     }
    //
    //     try {
    //         this.latestBlock = await this.publicClient.getBlockNumber();
    //         let currentBlock: bigint = this.lastReportedBlockNumber;
    //
    //         this.logger.debug(
    //             `${this.network.name}: Starting catchup from block ${currentBlock}, Chain tip: ${this.latestBlock}`,
    //         );
    //
    //         while (currentBlock < this.latestBlock && !this.isDisposed) {
    //             const startBlock = currentBlock + 1n;
    //             const endBlock =
    //                 startBlock + this.config.catchupBatchSize - 1n > this.latestBlock
    //                     ? this.latestBlock
    //                     : startBlock + this.config.catchupBatchSize - 1n;
    //
    //             await this.notifySubscribers(startBlock, endBlock);
    //             currentBlock = endBlock;
    //         }
    //     } catch (err) {
    //         this.logger.error(`${this.network.name}:`, err);
    //     }
    // }

    /**
     * Registers a subscriber that will be called when new blocks are processed.
     * Returns an unregister function.
     */
    public watchBlocks(options: WatchBlocksOptions) {
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

    public dispose() {
        this.isDisposed = true;
        this.stopPolling();
        this.subscribers.clear();
        this.logger.debug(`${this.network.name}: Disposed`);
    }
}
