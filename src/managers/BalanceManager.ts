import { ManagerBase } from './ManagerBase';

import type { Address } from 'viem';

import { abi as ERC20_ABI } from '../constants/erc20Abi.json';
import {
    BalanceManagerConfig,
    ConceroNetwork,
    IBalanceManager,
    ITxReader,
    IViemClientManager,
    LoggerInterface,
    NetworkUpdateListener,
    TokenConfig,
} from '../types';

export abstract class BalanceManager
    extends ManagerBase
    implements IBalanceManager, NetworkUpdateListener
{
    private readonly nativeBalances = new Map<string, bigint>();
    private readonly tokenBalances = new Map<string, Map<string, bigint>>();

    private readonly minAllowances: Record<string, Record<string, bigint>>;
    private readonly tokenConfigs: Record<string, TokenConfig[]> = {};

    protected readonly activeNetworks: ConceroNetwork[] = [];
    protected readonly watcherIds: string[] = [];

    private readonly viemClientManager: IViemClientManager;
    private readonly txReader: ITxReader;
    private readonly logger: LoggerInterface;

    protected constructor(
        logger: LoggerInterface,
        viemClientManager: IViemClientManager,
        txReader: ITxReader,
        config: BalanceManagerConfig,
    ) {
        super();
        this.logger = logger;
        this.viemClientManager = viemClientManager;
        this.txReader = txReader;
        this.minAllowances = config.minAllowances ?? {};
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;
        this.logger.debug('BalanceManager initialized');
    }

    public dispose(): void {
        this.clearTokenWatchers();
        this.nativeBalances.clear();
        this.tokenBalances.clear();
        super.dispose();
        this.logger.debug('BalanceManager disposed');
    }

    public watchToken(network: ConceroNetwork, tokenSymbol: string, tokenAddress: Address): string {
        const watcherId = this.txReader.readContractWatcher.create(
            tokenAddress,
            network,
            'balanceOf',
            ERC20_ABI,
            async (b: bigint): Promise<void> =>
                this.onTokenBalanceUpdate(network.name, tokenSymbol, b),
            10_000,
            [this.viemClientManager.getClients(network).account.address],
        );
        this.watcherIds.push(watcherId);
        return watcherId;
    }

    public async forceUpdate(): Promise<void> {
        await this.refreshTokenBalances(this.activeNetworks);
        await this.refreshNativeBalances(this.activeNetworks);
        this.logger.debug('Balances force-updated');
    }

    public getNativeBalances(): Map<string, bigint> {
        return new Map(this.nativeBalances);
    }

    public getTokenBalance(networkName: string, symbol: string): bigint {
        return this.tokenBalances.get(networkName)?.get(symbol) ?? 0n;
    }

    public getTotalTokenBalance(symbol: string): bigint {
        let total = 0n;
        for (const m of this.tokenBalances.values()) total += m.get(symbol) ?? 0n;
        return total;
    }

    public getTokenConfigs(networkName: string): TokenConfig[] {
        return this.tokenConfigs[networkName] ?? [];
    }

    public getTokenConfig(networkName: string, symbol: string): TokenConfig | undefined {
        return this.getTokenConfigs(networkName).find(c => c.symbol === symbol);
    }

    public async ensureAllowance(
        networkName: string,
        tokenAddress: string,
        spenderAddress: string,
        requiredAmount: bigint,
    ): Promise<void> {
        const net = this.findActiveNetwork(networkName);
        const { publicClient, walletClient } = this.viemClientManager.getClients(net);
        if (!walletClient) throw new Error(`Wallet client not available for ${networkName}`);

        const min = this.getMinAllowance(networkName, tokenAddress);
        console.log(`Min allowance: ${min}`);
        console.log(`Required amount: ${requiredAmount}`);
        const current = (await publicClient.readContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [walletClient.account.address, spenderAddress as Address],
        })) as bigint;
        const target = requiredAmount > min ? requiredAmount : min;
        if (current >= target) {
            this.logger.debug(`Allowance sufficient (${current} ≥ ${target})`);
            return;
        }
        const txHash = await walletClient.writeContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spenderAddress as Address, target],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        this.logger.info(`Allowance updated to ${target} on ${networkName}`);
    }

    public async getAllowance(
        networkName: string,
        tokenAddress: string,
        spenderAddress: string,
    ): Promise<bigint> {
        const net = this.findActiveNetwork(networkName);
        const { publicClient, walletClient } = this.viemClientManager.getClients(net);
        if (!walletClient) throw new Error(`Wallet client not available for ${networkName}`);
        return (await publicClient.readContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [walletClient.account.address, spenderAddress as Address],
        })) as bigint;
    }

    public async onNetworksUpdated(networks: ConceroNetwork[]): Promise<void> {
        this.activeNetworks.splice(0, this.activeNetworks.length, ...networks);
        const names = new Set(networks.map(n => n.name));
        for (const n of [...this.nativeBalances.keys()])
            if (!names.has(n)) {
                this.nativeBalances.delete(n);
                this.tokenBalances.delete(n);
            }
        await this.refreshNativeBalances(networks);
    }

    private onTokenBalanceUpdate(net: string, sym: string, bal: bigint): void {
        const map = this.tokenBalances.get(net) ?? new Map<string, bigint>();
        map.set(sym, bal);
        this.tokenBalances.set(net, map);
    }

    private async refreshNativeBalances(networks: ConceroNetwork[]): Promise<void> {
        await Promise.all(
            networks.map(async n => {
                const { publicClient, account } = this.viemClientManager.getClients(n);
                const bal = await publicClient.getBalance({ address: account.address });
                this.nativeBalances.set(n.name, bal);
            }),
        );
    }

    private async refreshTokenBalances(networks: ConceroNetwork[]): Promise<void> {
        for (const n of networks) {
            const { publicClient, account } = this.viemClientManager.getClients(n);
            const map = new Map<string, bigint>();
            for (const cfg of this.getTokenConfigs(n.name)) {
                try {
                    const bal = (await publicClient.readContract({
                        address: cfg.address as Address,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [account.address],
                    })) as bigint;
                    map.set(cfg.symbol, bal);
                } catch {
                    map.set(cfg.symbol, 0n);
                }
            }
            this.tokenBalances.set(n.name, map);
        }
    }

    private getMinAllowance(net: string, token: string): bigint {
        return this.minAllowances[net]?.[token.toLowerCase()] ?? 0n;
    }

    protected clearTokenWatchers(): void {
        this.watcherIds.forEach(id => this.txReader.readContractWatcher.remove(id));
        this.watcherIds.length = 0;
    }

    private findActiveNetwork(name: string): ConceroNetwork {
        const net = this.activeNetworks.find(n => n.name === name);
        if (!net) throw new Error(`Network ${name} is not active`);
        return net;
    }
}
