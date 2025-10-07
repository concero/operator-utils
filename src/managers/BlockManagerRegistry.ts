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
    private readonly logger: ILogger;
    private readonly config: BlockManagerConfig;

    private constructor(
        config: BlockManagerConfig,
        logger: ILogger,
        networkManager: IConceroNetworkManager,
        viemClientManager: IViemClientManager,
    ) {
        super();
        this.logger = logger;
        this.networkManager = networkManager;
        this.viemClientManager = viemClientManager;
        this.config = config;
    }

    public async onNetworksUpdated(networks: ConceroNetwork[]) {
        this.logger.info(`Networks updated, syncing BlockManagers for ${networks.length} networks`);
        try {
            await this.updateBlockManagers(networks);
        } catch (error) {
            this.logger.error(`Failed to sync BlockManagers after network update: ${error}`);
            throw error;
        }
    }

    private async ensureBlockManagerForNetwork(network: ConceroNetwork) {
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

    private async updateBlockManagers(networks: ConceroNetwork[]) {
        if (!this.initialized) return;

        this.logger.info(`Syncing BlockManagers for ${networks.length} active networks`);
        const currentNetworkNames = new Set(this.blockManagers.keys());
        const newNetworkNames = new Set(networks.map(network => network.name));

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

        const newNetworks = networks.filter(network => !currentNetworkNames.has(network.name));
        if (newNetworks.length > 0) {
            this.logger.debug(`Creating ${newNetworks.length} new BlockManagers`);

            await Promise.allSettled(
                newNetworks.map(network => this.ensureBlockManagerForNetwork(network)),
            );
        }
    }

    public static createInstance(
        config: BlockManagerRegistryConfig,
        logger: ILogger,
        networkManager: IConceroNetworkManager,
        viemClientManager: IViemClientManager,
    ) {
        BlockManagerRegistry.instance = new BlockManagerRegistry(
            config,
            logger,
            networkManager,
            viemClientManager,
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

    public startPolling() {
        for (const blockManager of this.getAllBlockManagers()) {
            blockManager.startPolling().catch(e => this.logger.error(e));
        }
    }

    public async createBlockManager(network: ConceroNetwork, publicClient: PublicClient) {
        if (this.blockManagers.has(network.name)) {
            return this.blockManagers.get(network.name)!;
        }

        const blockManager = await BlockManager.create(
            this.config,
            network,
            publicClient,
            this.logger,
        );

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
