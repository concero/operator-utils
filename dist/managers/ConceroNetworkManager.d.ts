import { ManagerBase } from './ManagerBase';
import { ConceroNetwork, NetworkManagerConfig } from '../types';
import { IConceroNetworkManager, ILogger, NetworkUpdateListener } from '../types/';
import { HttpClient } from '../utils';
export declare class ConceroNetworkManager extends ManagerBase implements IConceroNetworkManager {
    private static instance;
    private mainnetNetworks;
    private testnetNetworks;
    private allNetworks;
    private activeNetworks;
    private updateListeners;
    private logger;
    private config;
    private httpClient;
    private isPolling;
    private constructor();
    static getInstance(): ConceroNetworkManager;
    static createInstance(logger: ILogger, httpClient: HttpClient, config: NetworkManagerConfig): ConceroNetworkManager;
    initialize(): Promise<void>;
    registerUpdateListener(listener: NetworkUpdateListener): void;
    unregisterUpdateListener(listener: NetworkUpdateListener): void;
    getMainnetNetworks(): Record<string, ConceroNetwork>;
    getTestnetNetworks(): Record<string, ConceroNetwork>;
    getAllNetworks(): Record<string, ConceroNetwork>;
    getActiveNetworks(): ConceroNetwork[];
    getNetworkById(chainId: number): ConceroNetwork;
    getNetworkByName(name: string): ConceroNetwork;
    getNetworkBySelector(selector: string): ConceroNetwork;
    excludeNetwork(networkName: string, reason: string): void;
    getVerifierNetwork(): ConceroNetwork;
    getDefaultFinalityConfirmations(): number;
    updateNetworks(): Promise<void>;
    private notifyListeners;
    startPolling(): Promise<void>;
    private createNetworkConfig;
    private getTestingNetworks;
    private filterNetworks;
}
//# sourceMappingURL=ConceroNetworkManager.d.ts.map