import { PublicClient, WalletClient } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts/types';
import { ManagerBase } from './ManagerBase';
import { ConceroNetwork, ILogger, IRpcManager, IViemClientManager, ViemClientManagerConfig } from '../types';
export interface ViemClients {
    walletClient: WalletClient;
    publicClient: PublicClient;
    account: PrivateKeyAccount;
}
export declare class ViemClientManager extends ManagerBase implements IViemClientManager {
    private static instance;
    private clients;
    private rpcManager;
    private logger;
    private account;
    private config;
    private constructor();
    static createInstance(logger: ILogger, rpcManager: IRpcManager, config: ViemClientManagerConfig): ViemClientManager;
    static getInstance(): ViemClientManager;
    initialize(): Promise<void>;
    private createTransport;
    private initializeClients;
    getClients(networkName: string): ViemClients;
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    updateClientsForNetworks(networks: ConceroNetwork[]): Promise<void>;
}
//# sourceMappingURL=ViemClientManager.d.ts.map