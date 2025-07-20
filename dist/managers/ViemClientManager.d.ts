import { PublicClient, WalletClient } from "viem";
import type { PrivateKeyAccount } from "viem/accounts/types";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { ViemClientManagerConfig } from "../types/ManagerConfigs";
import { IRpcManager, NetworkUpdateListener } from "../types/managers";
import { LoggerInterface } from "../types/LoggerInterface";
import { ManagerBase } from "./ManagerBase";
export interface ViemClients {
    walletClient: WalletClient;
    publicClient: PublicClient;
    account: PrivateKeyAccount;
}
export declare class ViemClientManager extends ManagerBase implements NetworkUpdateListener {
    private static instance;
    private clients;
    private rpcManager;
    private logger;
    private config;
    private constructor();
    static createInstance(logger: LoggerInterface, rpcManager: IRpcManager, config: ViemClientManagerConfig): ViemClientManager;
    static getInstance(): ViemClientManager;
    initialize(): Promise<void>;
    private createTransport;
    private initializeClients;
    getClients(chain: ConceroNetwork): ViemClients;
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    updateClientsForNetworks(networks: ConceroNetwork[]): Promise<void>;
    dispose(): void;
}
//# sourceMappingURL=ViemClientManager.d.ts.map