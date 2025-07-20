import { Address } from "viem";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { DeploymentManagerConfig } from "../types/ManagerConfigs";
import { IDeploymentsManager, NetworkUpdateListener } from "../types/managers";
import { LoggerInterface } from "../utils/Logger";
import { ManagerBase } from "./ManagerBase";
export declare class DeploymentManager extends ManagerBase implements IDeploymentsManager, NetworkUpdateListener {
    private static instance;
    private conceroRoutersMapByChainName;
    private conceroVerifier;
    private httpClient;
    private logger;
    private config;
    private constructor();
    static createInstance(logger: LoggerInterface, config: DeploymentManagerConfig): DeploymentManager;
    static getInstance(): DeploymentManager;
    initialize(): Promise<void>;
    getRouterByChainName(chainName: string): Promise<Address>;
    getConceroRouters(): Promise<Record<string, Address>>;
    getConceroVerifier(): Promise<Address>;
    updateDeployments(networks?: ConceroNetwork[]): Promise<void>;
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    private extractNetworkName;
    private isLocalhostEnv;
    dispose(): void;
}
//# sourceMappingURL=DeploymentManager.d.ts.map