import { NetworkUpdateListener } from './NetworkUpdateListener';
import { NetworkType } from '@/types/ConceroNetwork';
import { ConceroNetwork } from '../ConceroNetwork';
export interface IConceroNetworkManager {
    initialize(): Promise<void>;
    getMainnetNetworks(): Record<string, ConceroNetwork>;
    getTestnetNetworks(): Record<string, ConceroNetwork>;
    getAllNetworks(): Record<string, ConceroNetwork>;
    getActiveNetworks(): ConceroNetwork[];
    getNetworkById(chainId: number): ConceroNetwork;
    getNetworkByName(name: string): ConceroNetwork;
    getNetworkBySelector(selector: string): ConceroNetwork;
    getVerifierNetwork(): ConceroNetwork | undefined;
    getDefaultFinalityConfirmations(): number;
    startPolling(): Promise<void>;
    updateNetworks(): Promise<void>;
    registerUpdateListener(listener: NetworkUpdateListener): void;
    unregisterUpdateListener(listener: NetworkUpdateListener): void;
    excludeNetwork(networkName: string, reason: string): void;
}
/** Configuration for NetworkManager */
export type NetworkManagerConfig = {
    networkMode: NetworkType;
    pollingIntervalMs: number;
    operatorPrivateKey: string;
    ignoredNetworkIds: number[];
    whitelistedNetworkIds: {
        mainnet: number[];
        testnet: number[];
        localhost: number[];
    };
    defaultFinalityConfirmations: number;
    mainnetUrl: string;
    testnetUrl: string;
};
//# sourceMappingURL=IConceroNetworkManager.d.ts.map