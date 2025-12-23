import { createPublicClient, createWalletClient, fallback, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts/types';
import { ManagerBase } from './ManagerBase';

import {
    ConceroNetwork,
    ILogger,
    IRpcManager,
    IViemClientManager,
    ViemClientManagerConfig,
} from '../types';
import { createCustomHttpTransport, isNonceError } from '../utils';

export interface ViemClients {
    walletClient: WalletClient;
    publicClient: PublicClient;
    account: PrivateKeyAccount;
}

//todo: what happens when we update networks while having in-flight requests in existing clients?
// Creates & updates Viem Fallback Clients for each network
export class ViemClientManager extends ManagerBase implements IViemClientManager {
    private static instance: ViemClientManager;
    private clients: Map<string, ViemClients> = new Map();
    private rpcManager: IRpcManager;
    private logger: ILogger;
    // @ts-ignore @todo: fix typings
    private account: PrivateKeyAccount;

    private config: ViemClientManagerConfig;

    private constructor(logger: ILogger, rpcManager: IRpcManager, config: ViemClientManagerConfig) {
        super();
        this.rpcManager = rpcManager;
        this.logger = logger;
        this.config = config;
    }

    public static createInstance(
        logger: ILogger,
        rpcManager: IRpcManager,
        config: ViemClientManagerConfig,
    ): ViemClientManager {
        ViemClientManager.instance = new ViemClientManager(logger, rpcManager, config);
        return ViemClientManager.instance;
    }
    public static getInstance(): ViemClientManager {
        if (!ViemClientManager.instance) {
            throw new Error('ViemClientManager is not initialized. Call createInstance() first.');
        }
        return ViemClientManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        // @ts-ignore @todo: fix typings
        this.account = privateKeyToAccount(`0x${this.config.operatorPrivateKey}`);

        await super.initialize();
        this.logger.debug('Initialized');
    }

    private createTransport(chain: ConceroNetwork) {
        const rpcUrls = this.rpcManager.getRpcsForNetwork(chain.name);

        if (!rpcUrls || rpcUrls.length === 0) {
            throw new Error(`No RPC URLs available for chain ${chain.name}`);
        }

        return fallback(
            rpcUrls.map(url => createCustomHttpTransport(url, this.config.httpTransportConfig)),
            {
                ...this.config.fallbackTransportOptions,
                shouldThrow: error => {
                    if (isNonceError(error)) return true;
                    return false;
                },
            },
        );
    }

    private initializeClients(chain: ConceroNetwork): ViemClients {
        const transport = this.createTransport(chain);

        const publicClient = createPublicClient({
            transport,
            chain: chain.viemChain,
        });

        const walletClient = createWalletClient({
            transport,
            chain: chain.viemChain,
            // @ts-ignore @todo: fix typings
            account: this.account,
        });

        return {
            publicClient,
            walletClient,
            account: this.account,
        };
    }

    public getClients(networkName: string): ViemClients {
        if (!this.initialized) {
            throw new Error('ViemClientManager not initialized');
        }

        const clients = this.clients.get(networkName);
        if (!clients) {
            throw new Error(`No clients found for network: ${networkName}`);
        }

        return clients;
    }

    public async onNetworksUpdated(networks: ConceroNetwork[]): Promise<void> {
        const activeNetworkNames = new Set(networks.map(n => n.name));

        const currentNetworkNames = Array.from(this.clients.keys());
        for (const networkName of currentNetworkNames) {
            if (!activeNetworkNames.has(networkName)) {
                this.clients.delete(networkName);
                this.logger.debug(`Removed clients for inactive network: ${networkName}`);
            }
        }

        await this.updateClientsForNetworks(networks);
    }

    public async updateClientsForNetworks(networks: ConceroNetwork[]): Promise<void> {
        for (const network of networks) {
            try {
                const newClient = this.initializeClients(network);
                this.clients.set(network.name, newClient);
                this.logger.debug(`Updated clients for chain ${network.name}`);
            } catch (error) {
                this.logger.error(`Failed to update clients for chain ${network.name}: ${error}`);
            }
        }
    }
}
