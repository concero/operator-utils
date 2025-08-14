import { NetworkUpdateListener } from './NetworkUpdateListener';
import { ConceroNetwork } from '../ConceroNetwork';
export interface IConceroNetworkManager {
    initialize(): Promise<void>;
    dispose(): void;
    getMainnetNetworks(): Record<string, ConceroNetwork>;
    getTestnetNetworks(): Record<string, ConceroNetwork>;
    getAllNetworks(): Record<string, ConceroNetwork>;
    getActiveNetworks(): ConceroNetwork[];
    getNetworkById(chainId: number): ConceroNetwork;
    getNetworkByName(name: string): ConceroNetwork;
    getNetworkBySelector(selector: string): ConceroNetwork;
    getVerifierNetwork(): ConceroNetwork | undefined;
    getDefaultFinalityConfirmations(): number;
    forceUpdate(): Promise<void>;
    triggerInitialUpdates(): Promise<void>;
    registerUpdateListener(listener: NetworkUpdateListener): void;
    unregisterUpdateListener(listener: NetworkUpdateListener): void;
}
export type INetworkManager = IConceroNetworkManager;
//# sourceMappingURL=INetworkManager.d.ts.map