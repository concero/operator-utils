import { ConceroNetwork, NetworkType } from '../ConceroNetwork';

export interface IRpcManager {
    initialize(): Promise<void>;
    ensureRpcsForNetwork(network: ConceroNetwork): Promise<void>;
    updateRpcsForNetworks(networks: ConceroNetwork[]): Promise<void>;
    getRpcsForNetwork(networkName: string): string[];
}

/** Configuration for RpcManager */
export interface RpcManagerConfig {
    networkMode: NetworkType;
    rpcOverrides: Record<string, string[]>;
    rpcExtensions: Record<string, string[]>;
    conceroRpcsUrl: string;
}
