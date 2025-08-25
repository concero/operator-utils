import { ManagerBase } from './ManagerBase';

import { PublicClient, WalletClient, createPublicClient, createWalletClient, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts/types';

import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { ViemClientManagerConfig } from '../types/ManagerConfigs';
import { IRpcManager, NetworkUpdateListener } from '../types/managers';
import { createCustomHttpTransport, getEnvVar } from '../utils';
import { isNonceError } from '../utils/viemErrorParser';

export interface ViemClients {
    walletClient: WalletClient;
    publicClient: PublicClient;
    // TODO: do we really use this account? walletClient already has the account
    account: PrivateKeyAccount;
}
// Creates & updates Viem Fallback Clients for each network
export class ViemClientManager extends ManagerBase implements NetworkUpdateListener {
    private static instance: ViemClientManager;
    private clients: Map<string, ViemClients> = new Map();
    private rpcManager: IRpcManager;
    private logger: LoggerInterface;
    private account: PrivateKeyAccount;

    private config: ViemClientManagerConfig;

    private constructor(
        logger: LoggerInterface,
        rpcManager: IRpcManager,
        config: ViemClientManagerConfig,
    ) {
        super();
        this.rpcManager = rpcManager;
        this.logger = logger;
        this.config = config;
    }

    public static createInstance(
        logger: LoggerInterface,
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

        const privateKey = getEnvVar('OPERATOR_PRIVATE_KEY');
        this.account = privateKeyToAccount(`0x${privateKey}`);

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
            account: this.account,
        });

        return {
            publicClient,
            walletClient,
            account: this.account,
        };
    }

    public getClients(chain: ConceroNetwork): ViemClients {
        if (!this.initialized) {
            throw new Error('ViemClientManager not properly initialized');
        }

        if (!chain) {
            throw new Error('Cannot get clients: chain parameter is undefined or null');
        }

        if (!chain.name) {
            this.logger.error(`Invalid chain object provided: ${JSON.stringify(chain)}`);
            throw new Error('Cannot get clients: chain.name is missing');
        }

        const cachedClients = this.clients.get(chain.name);
        if (cachedClients) {
            return cachedClients;
        }

        this.logger.debug(`Creating new clients for chain: ${chain.name} (id: ${chain.id})`);
        const newClients = this.initializeClients(chain);
        this.clients.set(chain.name, newClients);

        return newClients;
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
                this.logger.error(
                    `Failed to update clients for chain ${network.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
    }
}
