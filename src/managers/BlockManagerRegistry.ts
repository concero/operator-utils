import { PublicClient } from 'viem';
import { BlockManager } from './BlockManager';
import { ManagerBase } from './ManagerBase';

import {
    BlockManagerConfig,
    BlockManagerRegistryConfig,
    ConceroNetwork,
    IBlockManagerRegistry,
    IConceroNetworkManager,
    ILogger,
    IViemClientManager,
    NetworkUpdateListener,
} from '../types';

export class BlockManagerRegistry
    extends ManagerBase
    implements IBlockManagerRegistry, NetworkUpdateListener
{
    private static instance: BlockManagerRegistry;
    private blockManagers: Map<string, BlockManager> = new Map();
    private networkManager: IConceroNetworkManager;
    private viemClientManager: IViemClientManager;
    private logger: ILogger;
    private config: BlockManagerConfig;

    private constructor(
        logger: ILogger,
        networkManager: IConceroNetworkManager,
        viemClientManager: IViemClientManager,
        config: BlockManagerConfig,
    ) {
        super();
        this.logger = logger;
        this.networkManager = networkManager;
        this.viemClientManager = viemClientManager;
        this.config = config;
    }

    public async onNetworksUpdated(networks: ConceroNetwork[]): Promise<void> {
        this.logger.info(`Networks updated, syncing BlockManagers for ${networks.length} networks`);
        try {
            await this.updateBlockManagers(networks);
        } catch (error) {
            this.logger.error(`Failed to sync BlockManagers after network update: ${error}`);
            throw error;
        }
    }

    private async ensureBlockManagerForNetwork(
        network: ConceroNetwork,
    ): Promise<BlockManager | null> {
        // If we already have a BlockManager for this network, return it
        if (this.blockManagers.has(network.name)) {
            this.logger.debug(`Using existing BlockManager for network ${network.name}`);
            return this.blockManagers.get(network.name)!;
        }

        try {
            const { publicClient } = this.viemClientManager.getClients(network.name);

            return await this.createBlockManager(network, publicClient);
        } catch (error) {
            this.logger.warn(`Failed to create BlockManager for network ${network.name}: ${error}`);
            this.networkManager.excludeNetwork(
                network.name,
                `Failed to create BlockManager: ${error}`,
            );
            return null;
        }
    }

    private async updateBlockManagers(networks: ConceroNetwork[]): Promise<void> {
        if (!this.initialized) return;

        this.logger.info(`Syncing BlockManagers for ${networks.length} active networks`);
        const currentNetworkNames = new Set(this.blockManagers.keys());
        const newNetworkNames = new Set(networks.map(network => network.name));

        // Remove BlockManagers for networks that are no longer active
        for (const networkName of currentNetworkNames) {
            if (!newNetworkNames.has(networkName)) {
                this.logger.info(`Removing BlockManager for inactive network ${networkName}`);
                const blockManager = this.blockManagers.get(networkName);
                if (blockManager && 'dispose' in blockManager) {
                    blockManager.dispose();
                }
                this.blockManagers.delete(networkName);
            }
        }

        // Create BlockManagers for new networks
        const newNetworks = networks.filter(network => !currentNetworkNames.has(network.name));
        if (newNetworks.length > 0) {
            this.logger.debug(`Creating ${newNetworks.length} new BlockManagers`);

            await Promise.all(
                newNetworks.map(network => this.ensureBlockManagerForNetwork(network)),
            );
        }
    }

    public static createInstance(
        logger: ILogger,
        networkManager: IConceroNetworkManager,
        viemClientManager: IViemClientManager,
        config: BlockManagerRegistryConfig,
    ): BlockManagerRegistry {
        BlockManagerRegistry.instance = new BlockManagerRegistry(
            logger,
            networkManager,
            viemClientManager,
            config,
        );
        return BlockManagerRegistry.instance;
    }

    public static getInstance(): BlockManagerRegistry {
        if (!BlockManagerRegistry.instance) {
            throw new Error(
                'BlockManagerRegistry is not initialized. Call createInstance() first.',
            );
        }
        return BlockManagerRegistry.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await super.initialize();
            this.logger.debug('Initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize: ${error}`);
            throw error;
        }
    }

    public async createBlockManager(
        network: ConceroNetwork,
        publicClient: PublicClient,
    ): Promise<BlockManager> {
        if (this.blockManagers.has(network.name)) {
            return this.blockManagers.get(network.name)!;
        }

        const blockManager = await BlockManager.create(network, publicClient, this.logger, {
            pollingIntervalMs: this.config.pollingIntervalMs,
            catchupBatchSize: this.config.catchupBatchSize,
        });

        this.blockManagers.set(network.name, blockManager);
        this.logger.debug(`Created BlockManager for network ${network.name}`);

        return blockManager;
    }

    public getBlockManager(networkName: string): BlockManager | undefined {
        if (this.blockManagers.has(networkName)) {
            return this.blockManagers.get(networkName)!;
        }

        this.logger.warn(`BlockManager for ${networkName} not found`);
        return undefined;
    }

    public getAllBlockManagers(): BlockManager[] {
        return Array.from(this.blockManagers.values());
    }

    public getAllManagedNetworks(): string[] {
        return Array.from(this.blockManagers.keys());
    }

    public async getLatestBlockForChain(networkName: string): Promise<bigint | null> {
        const blockManager = this.getBlockManager(networkName);
        if (!blockManager) {
            this.logger.error(`BlockManager for ${networkName} not found`);
            return null;
        }

        return blockManager.getLatestBlock();
    }
}
