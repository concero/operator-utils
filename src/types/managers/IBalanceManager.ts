import type { Address } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface TokenConfig {
    symbol: string;
    address: Address;
}

export interface BalanceManagerConfig {
    pollingIntervalMs: number;
    minAllowances?: Map<string, Map<string, bigint>>; // network → token → minAllowance
}

export interface IBalanceManager {
    initialize(): Promise<void>;

    registerToken(network: ConceroNetwork, tokenSymbol: string, tokenAddress: Address): void;
    deregisterToken(networkName: string, tokenSymbol: string, tokenAddress: Address): void;
    beginWatching(): void;
    setActiveNetworks(networks: ConceroNetwork[]): void;
    forceUpdate(): Promise<void>;

    getTokenBalance(networkName: string, symbol: string): bigint;
    getTotalTokenBalance(symbol: string): bigint;
    getNativeBalances(): Map<string, bigint>;

    getTokenConfigs(networkName: string): TokenConfig[];
    getTokenConfig(networkName: string, symbol: string): TokenConfig | undefined;

    ensureAllowance(
        networkName: string,
        tokenAddress: Address,
        spenderAddress: Address,
        requiredAmount: bigint,
    ): Promise<void>;

    getAllowance(
        networkName: string,
        tokenAddress: Address,
        spenderAddress: Address,
    ): Promise<bigint>;
}
