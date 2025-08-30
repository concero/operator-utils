import { BlockManager } from './BlockManager';
import { ManagerBase } from './ManagerBase';
import { PublicClient } from 'viem';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { BlockManagerRegistryConfig } from '../types/ManagerConfigs';
import { IBlockManagerRegistry, INetworkManager, IRpcManager, IViemClientManager, NetworkUpdateListener } from '../types/managers/';
export declare class BlockManagerRegistry extends ManagerBase implements IBlockManagerRegistry, NetworkUpdateListener {
    private static instance;
    private blockManagers;
    private networkManager;
    private viemClientManager;
    private rpcManager;
    private logger;
    private config;
    private constructor();
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    private ensureBlockManagerForNetwork;
    private updateBlockManagers;
    static createInstance(logger: LoggerInterface, networkManager: INetworkManager, viemClientManager: IViemClientManager, rpcManager: IRpcManager, config: BlockManagerRegistryConfig): BlockManagerRegistry;
    static getInstance(): BlockManagerRegistry;
    initialize(): Promise<void>;
    createBlockManager(network: ConceroNetwork, publicClient: PublicClient): Promise<BlockManager>;
    getBlockManager(networkName: string): BlockManager | undefined;
    getAllBlockManagers(): BlockManager[];
    getAllManagedNetworks(): string[];
    getLatestBlockForChain(networkName: string): Promise<bigint | null>;
}
//# sourceMappingURL=BlockManagerRegistry.d.ts.map