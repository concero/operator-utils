import { NetworkUpdateListener } from './NetworkUpdateListener';

import type { Address } from 'viem';

import { ConceroNetwork } from '../ConceroNetwork';

export interface TokenConfig {
    symbol: string;
    address: string;
    decimals: number;
}

export interface TokenBalance {
    native: bigint;
    tokens: Map<string, bigint>;
}

export interface BalanceManagerConfig {
    updateIntervalMs: number;
    minAllowances?: Map<string, Map<string, bigint>>;
    tokenDecimals?: Map<string, Map<string, number>>;
    tokens?: Map<string, TokenConfig[]>;
}

export interface IBalanceManager extends NetworkUpdateListener {
    initialize(): Promise<void>;
    dispose(): void;

    addTokenWatcher(network: ConceroNetwork, tokenSymbol: string, tokenAddress: Address): string;

    updateBalances(networks: ConceroNetwork[]): Promise<void>;
    forceUpdate(): Promise<void>;

    getBalance(networkName: string): TokenBalance | undefined;
    getAllBalances(): Map<string, TokenBalance>;
    getTokenBalance(networkName: string, symbol: string): bigint;
    getTotalTokenBalance(symbol: string): bigint;

    hasNativeBalance(networkName: string, minimumBalance?: bigint): boolean;

    hasTokenBalance(networkName: string, symbol: string, minimumBalance?: bigint): boolean;

    registerToken(networkName: string, tokenConfig: TokenConfig): void;
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
