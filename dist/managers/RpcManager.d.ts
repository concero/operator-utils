import { ConceroNetwork } from "../types/ConceroNetwork";
import { RpcManagerConfig } from "../types/ManagerConfigs";
import { IRpcManager, NetworkUpdateListener } from "../types/managers";
import { LoggerInterface } from "../types/LoggerInterface";
import { ManagerBase } from "./ManagerBase";
export declare class RpcManager extends ManagerBase implements IRpcManager, NetworkUpdateListener {
    private static instance;
    private httpClient;
    private logger;
    private config;
    private rpcUrls;
    constructor(logger: LoggerInterface, config: RpcManagerConfig);
    static createInstance(logger: LoggerInterface, config: RpcManagerConfig): RpcManager;
    static getInstance(): RpcManager;
    initialize(): Promise<void>;
    ensureRpcsForNetwork(network: ConceroNetwork): Promise<void>;
    updateRpcsForNetworks(networks: ConceroNetwork[]): Promise<void>;
    updateRpcs(networks: ConceroNetwork[]): Promise<void>;
    getRpcsForNetwork(networkName: string): string[];
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
}
//# sourceMappingURL=RpcManager.d.ts.map