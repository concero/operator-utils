import { ManagerBase } from './ManagerBase';

import { ConceroNetwork, NetworkManagerConfig, NetworkType } from '../types';
import { IConceroNetworkManager, ILogger, NetworkUpdateListener } from '../types/';
import { fetchNetworkConfigs, generateUid, HttpClient, localhostViemChain } from '../utils';

export class ConceroNetworkManager extends ManagerBase implements IConceroNetworkManager {
    private static instance: ConceroNetworkManager;

    private mainnetNetworks: Record<string, ConceroNetwork> = {};
    private testnetNetworks: Record<string, ConceroNetwork> = {};
    private allNetworks: Record<string, ConceroNetwork> = {};
    private activeNetworks: ConceroNetwork[] = [];

    private updateListeners: NetworkUpdateListener[] = [];
    private logger: ILogger;
    private config: NetworkManagerConfig;
    private httpClient: HttpClient;
    private isPolling = false;

    private constructor(logger: ILogger, httpClient: HttpClient, config: NetworkManagerConfig) {
        super();
        this.config = config;
        this.logger = logger;
        this.httpClient = httpClient;
    }

    public static getInstance(): ConceroNetworkManager {
        return ConceroNetworkManager.instance;
    }

    public static createInstance(
        logger: ILogger,
        httpClient: HttpClient,
        config: NetworkManagerConfig,
    ): ConceroNetworkManager {
        this.instance = new ConceroNetworkManager(logger, httpClient, config);
        return this.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await this.updateNetworks();
            this.initialized = true;
            this.logger.debug('Initialized');
        } catch (error) {
            this.logger.error(
                `Failed to initialize networks: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }

    public registerUpdateListener(listener: NetworkUpdateListener): void {
        const existingIndex = this.updateListeners.findIndex(
            existing => existing.constructor.name === listener.constructor.name,
        );

        if (existingIndex === -1) {
            this.updateListeners.push(listener);
        } else {
            this.logger.warn(`Update listener already registered: ${listener.constructor.name}`);
        }
    }

    public unregisterUpdateListener(listener: NetworkUpdateListener): void {
        const index = this.updateListeners.indexOf(listener);
        if (index !== -1) {
            this.updateListeners.splice(index, 1);
        }
    }

    public getMainnetNetworks(): Record<string, ConceroNetwork> {
        return { ...this.mainnetNetworks };
    }

    public getTestnetNetworks(): Record<string, ConceroNetwork> {
        return { ...this.testnetNetworks };
    }

    public getAllNetworks(): Record<string, ConceroNetwork> {
        return { ...this.allNetworks };
    }

    public getActiveNetworks(): ConceroNetwork[] {
        return [...this.activeNetworks];
    }

    public getNetworkById(chainId: number): ConceroNetwork {
        const network = Object.values(this.allNetworks).find(network => network.id === chainId);
        if (!network) {
            throw new Error(`Network with chain ID ${chainId} not found`);
        }
        return network;
    }

    public getNetworkByName(name: string): ConceroNetwork {
        const network = Object.values(this.allNetworks).find(network => network.name === name);
        if (!network) {
            throw new Error(`Network with name "${name}" not found`);
        }
        return network;
    }

    public getNetworkBySelector(selector: string): ConceroNetwork {
        const network = Object.values(this.allNetworks).find(
            network => network.chainSelector === selector,
        );
        if (!network) {
            throw new Error(`Network with selector "${selector}" not found`);
        }
        return network;
    }

    public excludeNetwork(networkName: string, reason: string): void {
        this.activeNetworks = this.activeNetworks.filter(network => network.name !== networkName);
        this.logger.warn(`Network "${networkName}" excluded from active networks. ${reason}`);
    }

    public getVerifierNetwork(): ConceroNetwork {
        if (this.config.networkMode === 'mainnet') {
            return this.mainnetNetworks['arbitrum'];
        } else if (this.config.networkMode === 'testnet') {
            return this.testnetNetworks['arbitrumSepolia'];
        } else if (this.config.networkMode === 'localhost') {
            const localNetwork = this.testnetNetworks['localhost'];

            if (!localNetwork) {
                this.logger.error(
                    `Available testnet networks: ${Object.keys(this.testnetNetworks).join(', ')}`,
                );
                throw new Error('Localhost network not found in testnetNetworks');
            }

            this.logger.debug(
                `Using localhost network: ${localNetwork.name} (id: ${localNetwork.id})`,
            );
            return localNetwork;
        } else {
            throw new Error(`Unsupported network mode: ${this.config.networkMode}`);
        }
    }

    public getDefaultFinalityConfirmations(): number {
        return this.config.defaultFinalityConfirmations;
    }

    public async updateNetworks(): Promise<void> {
        let networksFetched = false;
        try {
            if (this.config.networkMode === 'localhost') {
                // In localhost mode, skip fetching remote network configs
                this.mainnetNetworks = {};
                const localhostNetworks = this.getTestingNetworks();
                this.testnetNetworks = localhostNetworks;
                this.logger.debug(
                    `Using localhost networks only: ${Object.keys(localhostNetworks).join(', ')}`,
                );
                networksFetched = true;
            } else {
                try {
                    const { mainnetNetworks: fetchedMainnet, testnetNetworks: fetchedTestnet } =
                        await fetchNetworkConfigs(
                            this.logger,
                            this.httpClient,
                            this.config.networkMode,
                            {
                                mainnet: this.config.mainnetUrl,
                                testnet: this.config.testnetUrl,
                            },
                        );

                    const hasMainnetNetworks = Object.keys(fetchedMainnet).length > 0;
                    const hasTestnetNetworks = Object.keys(fetchedTestnet).length > 0;

                    if (hasMainnetNetworks) {
                        this.mainnetNetworks = this.createNetworkConfig(fetchedMainnet, 'mainnet');
                    } else {
                        this.logger.warn(
                            'No mainnet networks fetched, keeping existing mainnet networks',
                        );
                    }

                    if (hasTestnetNetworks) {
                        this.testnetNetworks = this.createNetworkConfig(fetchedTestnet, 'testnet');
                    } else {
                        this.logger.warn(
                            'No testnet networks fetched, keeping existing testnet networks',
                        );
                    }

                    networksFetched = true;
                } catch (error) {
                    this.logger.warn(
                        `Failed to fetch network configurations. Will retry on next update cycle: ${error instanceof Error ? error.message : String(error)}`,
                    );
                    if (Object.keys(this.allNetworks).length === 0) {
                        this.logger.error(
                            'No network configurations available. Unable to initialize services.',
                        );
                    }
                }
            }

            this.allNetworks = { ...this.testnetNetworks, ...this.mainnetNetworks };

            const filteredNetworks = this.filterNetworks(this.config.networkMode);

            if (networksFetched) {
                this.activeNetworks = [...filteredNetworks];
                this.logger.debug(
                    `Networks loaded - Initial networks: ${this.activeNetworks.length} (${this.activeNetworks.map(n => n.name).join(', ')})`,
                );
            }

            if (networksFetched) {
                await this.notifyListeners();
            }
        } catch (error) {
            this.logger.error(
                `Failed to update networks: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private async notifyListeners(): Promise<void> {
        for (const listener of this.updateListeners) {
            try {
                await listener.onNetworksUpdated(this.activeNetworks);
            } catch (error) {
                this.logger.error(
                    `Error in network update listener: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }
    }

    public async startPolling(): Promise<void> {
        if (this.isPolling) {
            this.logger.warn('Network polling is already running');
            return;
        }

        this.logger.debug(
            'Starting network polling and triggering initial updates for all listeners',
        );

        for (const listener of this.updateListeners) {
            try {
                this.logger.debug(`Triggering initial update for ${listener.constructor.name}`);
                await listener.onNetworksUpdated(this.activeNetworks);
                this.logger.debug(`Completed initial update for ${listener.constructor.name}`);
            } catch (error) {
                this.logger.error(
                    `Error in initial update for ${listener.constructor.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
                throw error;
            }
        }

        this.logger.debug('Completed all initial updates');

        this.isPolling = true;
        setInterval(async () => {
            try {
                await this.updateNetworks();
            } catch (error) {
                this.logger.error('Failed to update networks during polling:', error);
            }
        }, this.config.pollingIntervalMs);
    }

    private createNetworkConfig<T extends string>(
        networks: Record<string, any>,
        networkType: NetworkType,
    ): Record<T, ConceroNetwork> {
        return Object.fromEntries(
            Object.entries(networks).map(([key, network]) => {
                const networkKey = key as T;
                return [
                    networkKey,
                    {
                        name: network.name || networkKey,
                        type: networkType,
                        id: network.chainId,
                        accounts: [this.config.operatorPrivateKey],
                        chainSelector: network.chainSelector || network.chainId.toString(),
                        viemChain: network.viemChain,
                        finalityConfirmations:
                            network.finalityConfirmations ||
                            this.config.defaultFinalityConfirmations,
                    },
                ];
            }),
        ) as Record<T, ConceroNetwork>;
    }

    private getTestingNetworks(): Record<string, ConceroNetwork> {
        return {
            localhost: {
                name: 'localhost',
                type: 'localhost',
                id: 1,
                accounts: [this.config.operatorPrivateKey],
                chainSelector: '1',
                confirmations: 0,
                viemChain: localhostViemChain,
            },
        };
    }

    private filterNetworks(networkType: NetworkType): ConceroNetwork[] {
        let networks: ConceroNetwork[] = [];
        const ignoredIds = this.config.ignoredNetworkIds || [];
        const whitelistedIds = this.config.whitelistedNetworkIds[networkType] || [];

        switch (networkType) {
            case 'localhost':
                networks = Object.values(this.getTestingNetworks());
                break;
            case 'testnet':
                networks = Object.values(this.testnetNetworks);
                break;
            case 'mainnet':
                networks = Object.values(this.mainnetNetworks);
                break;
        }

        networks = networks.filter(network => !ignoredIds.includes(network.id));

        if (whitelistedIds.length > 0) {
            networks = networks.filter(network => whitelistedIds.includes(network.id));
        }

        return networks;
    }
}
