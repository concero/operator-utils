import { ConceroNetworkManager } from './ConceroNetworkManager';
import { ManagerBase } from './ManagerBase';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { RpcManagerConfig } from '../types/ManagerConfigs';
import { IRpcManager, NetworkUpdateListener } from '../types/managers';
export declare class RpcManager extends ManagerBase implements IRpcManager, NetworkUpdateListener {
    private static instance;
    private httpClient;
    private logger;
    private config;
    private rpcUrls;
    private networkManager;
    constructor(logger: LoggerInterface, networkManager: ConceroNetworkManager, config: RpcManagerConfig);
    static createInstance(logger: LoggerInterface, networkManager: ConceroNetworkManager, config: RpcManagerConfig): RpcManager;
    static getInstance(): RpcManager;
    static dispose(): void;
    initialize(): Promise<void>;
    ensureRpcsForNetwork(network: ConceroNetwork): Promise<void>;
    updateRpcsForNetworks(networks: ConceroNetwork[]): Promise<void>;
    updateRpcs(networks: ConceroNetwork[]): Promise<void>;
    getRpcsForNetwork(networkName: string): string[];
    hasValidRpcs(networkName: string): boolean;
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
}
//# sourceMappingURL=RpcManager.d.ts.map