import { PublicClient } from 'viem';
import { BlockManager } from './BlockManager';
import { ManagerBase } from './ManagerBase';
import { IBlockCheckpointManager } from '@/types/managers/IBlockCheckpointManager';
import { BlockManagerRegistryConfig, ConceroNetwork, IBlockManagerRegistry, IConceroNetworkManager, ILogger, IViemClientManager, NetworkUpdateListener } from '../types';
export declare class BlockManagerRegistry extends ManagerBase implements IBlockManagerRegistry, NetworkUpdateListener {
    private blockCheckpointManager?;
    private static instance;
    private blockManagers;
    private networkManager;
    private viemClientManager;
    private readonly logger;
    private readonly config;
    private constructor();
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    private ensureBlockManagerForNetwork;
    private updateBlockManagers;
    static createInstance(config: BlockManagerRegistryConfig, logger: ILogger, networkManager: IConceroNetworkManager, viemClientManager: IViemClientManager, blockCheckpointManager?: IBlockCheckpointManager): BlockManagerRegistry;
    static getInstance(): BlockManagerRegistry;
    initialize(): Promise<void>;
    createBlockManager(network: ConceroNetwork, publicClient: PublicClient): Promise<BlockManager>;
    getBlockManager(networkName: string): BlockManager | undefined;
    getAllBlockManagers(): BlockManager[];
    getAllManagedNetworks(): string[];
    getLatestBlockForChain(networkName: string): Promise<bigint | null>;
}
//# sourceMappingURL=BlockManagerRegistry.d.ts.map