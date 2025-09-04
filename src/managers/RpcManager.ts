import { ConceroNetworkManager } from './ConceroNetworkManager';
import { ManagerBase } from './ManagerBase';

import {
    ConceroNetwork,
    ILogger,
    IRpcManager,
    NetworkUpdateListener,
    RpcManagerConfig,
} from '../types';
import { HttpClient } from '../utils';

// Watches @concero/rpcs and keeps an updatable list of RPC endpoints for networks
export class RpcManager extends ManagerBase implements IRpcManager, NetworkUpdateListener {
    private static instance: RpcManager;
    private httpClient: HttpClient;
    private logger: ILogger;
    private config: RpcManagerConfig;
    private rpcUrls: Record<string, string[]> = {};
    private networkManager: ConceroNetworkManager;

    constructor(logger: ILogger, networkManager: ConceroNetworkManager, config: RpcManagerConfig) {
        super();
        this.httpClient = HttpClient.getInstance(); //todo: injecct ready instance instead
        this.logger = logger;
        this.networkManager = networkManager;
        this.config = config;
    }

    public static createInstance(
        logger: ILogger,
        networkManager: ConceroNetworkManager,
        config: RpcManagerConfig,
    ): RpcManager {
        RpcManager.instance = new RpcManager(logger, networkManager, config);
        return RpcManager.instance;
    }

    public static getInstance(): RpcManager {
        if (!RpcManager.instance) {
            throw new Error('RpcManager is not initialized. Call createInstance() first.');
        }
        return RpcManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        await super.initialize();
        this.logger.debug('Initialized');
    }

    // todo: may be unused, remove?
    public async ensureRpcsForNetwork(network: ConceroNetwork): Promise<void> {
        if (!this.rpcUrls[network.name] || this.rpcUrls[network.name].length === 0) {
            await this.updateRpcs([network]);
        }
    }

    public async updateRpcsForNetworks(networks: ConceroNetwork[]): Promise<void> {
        await this.updateRpcs(networks);
    }

    private applyRpcConfiguration(networkName: string, freshRemoteRpcs: string[]): string[] {
        const overrides = this.config.rpcOverrides?.[networkName];
        if (overrides && overrides.length > 0) {
            return [...overrides];
        }

        const extensions = this.config.rpcExtensions?.[networkName];
        if (!extensions || extensions.length === 0) {
            return freshRemoteRpcs;
        }

        const uniqueRpcs = new Set<string>([...freshRemoteRpcs, ...extensions]);
        return Array.from(uniqueRpcs);
    }

    private cleanupInactiveNetworks(activeNetworkNames: Set<string>): void {
        const networksToRemove: string[] = [];

        for (const networkName in this.rpcUrls) {
            if (!activeNetworkNames.has(networkName)) {
                networksToRemove.push(networkName);
            }
        }

        for (const networkName of networksToRemove) {
            delete this.rpcUrls[networkName];
            this.logger.debug(`Cleaned up inactive network: ${networkName}`);
        }
    }

    public async updateRpcs(networks: ConceroNetwork[]): Promise<void> {
        if (this.config.networkMode === 'localhost') {
            this.logger.debug('Skipping RPC updates in localhost mode');
            return;
        }

        try {
            const activeNetworkNames = new Set(networks.map(n => n.name));
            this.cleanupInactiveNetworks(activeNetworkNames);

            const networksNeedingRemoteRpcs = networks.filter(
                n => !this.config.rpcOverrides?.[n.name]?.length,
            );

            let remoteRpcData: Record<
                string,
                { rpcUrls: string[]; chainSelector: string | number }
            > = {};

            if (networksNeedingRemoteRpcs.length > 0) {
                const url = `${this.config.conceroRpcsUrl}/${this.config.networkMode}.json`;
                const response = await this.httpClient.get<typeof remoteRpcData>(url);

                if (!response) {
                    throw new Error('Failed to fetch RPC data');
                }
                remoteRpcData = response;
            }

            for (const network of networks) {
                this.rpcUrls[network.name] = this.applyRpcConfiguration(
                    network.name,
                    remoteRpcData[network.name]?.rpcUrls || [],
                );
            }

            this.logger.debug(`Updated RPCs for ${networks.length} active networks`);
        } catch (error) {
            this.logger.error(
                `Failed to update RPCs: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    //todo:  exposes mutable arrays; callers could modify the returned array and inadvertently corrupt internal state
    public getRpcsForNetwork(networkName: string): string[] {
        if (this.config.networkMode === 'localhost') {
            return ['http://127.0.0.1:8545'];
        }
        return this.rpcUrls[networkName] || [];
    }

    public hasValidRpcs(networkName: string): boolean {
        const rpcUrls = this.getRpcsForNetwork(networkName);
        //todo: maybe implement a health check instead of just checking for non-empty array?
        return rpcUrls.length > 0;
    }

    public async onNetworksUpdated(networks: ConceroNetwork[]): Promise<void> {
        try {
            await this.updateRpcs(networks);

            if (this.config.networkMode !== 'localhost') {
                for (const network of networks) {
                    if (!this.hasValidRpcs(network.name)) {
                        this.networkManager.excludeNetwork(network.name, 'No RPC URLs available');
                    }
                }
            }
        } catch (err) {
            this.logger.error(
                `Failed to update RPCs after network update: ${err instanceof Error ? err.message : String(err)}`,
            );
            throw err;
        }
    }
}
