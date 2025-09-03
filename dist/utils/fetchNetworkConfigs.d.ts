import { createViemChain } from './createViemChain';
import { HttpClient } from './HttpClient';
import { NetworkType } from '@/types';
import { LoggerInterface } from '../managers/Logger';
export interface V2Network {
    name: string;
    chainId: number;
    chainSelector: number;
    rpcUrls: string[];
    blockExplorers: {
        name: string;
        url: string;
        apiUrl: string;
    }[];
    faucets?: string[];
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
}
export interface ProcessedNetwork {
    name: string;
    chainId: number;
    chainSelector: string;
    viemChain: ReturnType<typeof createViemChain>;
}
export interface NetworkConfigs {
    mainnetNetworks: Record<string, ProcessedNetwork>;
    testnetNetworks: Record<string, ProcessedNetwork>;
}
export declare function fetchNetworkConfigs(logger: LoggerInterface, httpClient: HttpClient, networkMode?: NetworkType, urls?: {
    mainnet: string;
    testnet: string;
}): Promise<NetworkConfigs>;
//# sourceMappingURL=fetchNetworkConfigs.d.ts.map