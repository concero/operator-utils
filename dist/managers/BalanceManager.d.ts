import { ManagerBase } from './ManagerBase';
import type { Address } from 'viem';
import { BalanceManagerConfig, ConceroNetwork, IBalanceManager, ITxReader, IViemClientManager, LoggerInterface, NetworkUpdateListener, TokenConfig } from '../types';
export declare abstract class BalanceManager extends ManagerBase implements IBalanceManager, NetworkUpdateListener {
    private readonly nativeBalances;
    private readonly tokenBalances;
    private readonly minAllowances;
    private readonly tokenConfigs;
    protected readonly activeNetworks: ConceroNetwork[];
    protected readonly watcherIds: string[];
    private readonly viemClientManager;
    private readonly txReader;
    private readonly logger;
    protected constructor(logger: LoggerInterface, viemClientManager: IViemClientManager, txReader: ITxReader, config: BalanceManagerConfig);
    initialize(): Promise<void>;
    dispose(): void;
    watchToken(network: ConceroNetwork, tokenSymbol: string, tokenAddress: Address): string;
    forceUpdate(): Promise<void>;
    getNativeBalances(): Map<string, bigint>;
    getTokenBalance(networkName: string, symbol: string): bigint;
    getTotalTokenBalance(symbol: string): bigint;
    getTokenConfigs(networkName: string): TokenConfig[];
    getTokenConfig(networkName: string, symbol: string): TokenConfig | undefined;
    ensureAllowance(networkName: string, tokenAddress: string, spenderAddress: string, requiredAmount: bigint): Promise<void>;
    getAllowance(networkName: string, tokenAddress: string, spenderAddress: string): Promise<bigint>;
    onNetworksUpdated(networks: ConceroNetwork[]): Promise<void>;
    private onTokenBalanceUpdate;
    private refreshNativeBalances;
    private refreshTokenBalances;
    private getMinAllowance;
    protected clearTokenWatchers(): void;
    private findActiveNetwork;
}
//# sourceMappingURL=BalanceManager.d.ts.map