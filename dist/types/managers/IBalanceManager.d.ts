import { NetworkUpdateListener } from './NetworkUpdateListener';
import type { Address } from 'viem';
import { ConceroNetwork } from '../ConceroNetwork';
export interface TokenConfig {
    symbol: string;
    address: string;
}
export interface BalanceManagerConfig {
    minAllowances?: Map<string, Map<string, bigint>>;
}
export interface IBalanceManager extends NetworkUpdateListener {
    initialize(): Promise<void>;
    dispose(): void;
    watchToken(network: ConceroNetwork, tokenSymbol: string, tokenAddress: Address): string;
    updateNativeBalances(): Promise<void>;
    forceUpdate(): Promise<void>;
    getAllBalances(): Map<string, bigint>;
    getTokenBalance(networkName: string, symbol: string): bigint;
    getTotalTokenBalance(symbol: string): bigint;
    hasNativeBalance(networkName: string, minimumBalance?: bigint): boolean;
    hasTokenBalance(networkName: string, symbol: string, minimumBalance?: bigint): boolean;
    getTokenConfigs(networkName: string): TokenConfig[];
    getTokenConfig(networkName: string, symbol: string): TokenConfig | undefined;
    ensureAllowance(networkName: string, tokenAddress: string, spenderAddress: string, requiredAmount: bigint): Promise<void>;
    getAllowance(networkName: string, tokenAddress: string, spenderAddress: string): Promise<bigint>;
}
//# sourceMappingURL=IBalanceManager.d.ts.map