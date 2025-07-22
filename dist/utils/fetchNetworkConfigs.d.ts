import { createViemChain } from "./createViemChain";
import { HttpClient } from "./HttpClient";
import { LoggerInterface } from "./Logger";
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
export declare function fetchNetworkConfigs(logger: LoggerInterface, httpClient: HttpClient, networkMode?: "mainnet" | "testnet" | "localhost", urls?: {
    mainnet: string;
    testnet: string;
}): Promise<NetworkConfigs>;
//# sourceMappingURL=fetchNetworkConfigs.d.ts.map