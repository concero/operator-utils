import { NetworkUpdateListener } from './NetworkUpdateListener';

import type { Address } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface TokenConfig {
    symbol: string;
    address: string;
}

export interface BalanceManagerConfig {
    minAllowances?: Map<string, Map<string, bigint>>; // network → token → minAllowance
    pollingIntervalMs?: number;
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
        tokenAddress: string,
        spenderAddress: string,
        requiredAmount: bigint,
    ): Promise<void>;

    getAllowance(
        networkName: string,
        tokenAddress: string,
        spenderAddress: string,
    ): Promise<bigint>;
}
