import { ManagerBase } from './ManagerBase';

import type { Address } from 'viem';
import { erc20Abi } from 'viem';
import { zeroAddress } from 'viem';

import {
    BalanceManagerConfig,
    ConceroNetwork,
    IBalanceManager,
    ITxReader,
    IViemClientManager,
    LoggerInterface,
    TokenConfig,
} from '../types';

export abstract class BalanceManager extends ManagerBase implements IBalanceManager {
    private readonly nativeBalances = new Map<string, bigint>();
    private readonly tokenBalances = new Map<string, Map<string, bigint>>();

    private readonly minAllowances: Record<string, Record<string, bigint>>;
    private readonly tokenConfigs: Record<string, TokenConfig[]> = {};
    private readonly registeredTokens: Map<string, Map<string, Address>> = new Map();
    private readonly registeredNativeBalances: Set<string> = new Set();
    private readonly pollingIntervalMs: number;

    protected readonly activeNetworks: ConceroNetwork[] = [];
    protected readonly watcherIds: string[] = [];

    private readonly tokenWatchers: Map<string, Map<string, string>> = new Map();
    private readonly nativeWatchers: Map<string, string> = new Map();

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
        this.pollingIntervalMs = config.pollingIntervalMs ?? 10_000;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;
        this.logger.info('BalanceManager initialized');
    }

    public registerToken(
        network: ConceroNetwork,
        tokenSymbol: string,
        tokenAddress: Address,
    ): void {
        if (tokenAddress === zeroAddress) {
            this.registeredNativeBalances.add(network.name);
        } else {
            if (!this.registeredTokens.has(network.name)) {
                this.registeredTokens.set(network.name, new Map());
            }
            this.registeredTokens.get(network.name)!.set(tokenSymbol, tokenAddress);
        }
    }

    public deregisterToken(networkName: string, tokenSymbol: string, tokenAddress: Address): void {
        const isNative = tokenAddress === zeroAddress;

        if (isNative) {
            const watcherId = this.nativeWatchers.get(networkName);
            if (watcherId) {
                this.txReader.methodWatcher.remove(watcherId);
                this.watcherIds = this.watcherIds.filter(id => id !== watcherId);
                this.nativeWatchers.delete(networkName);
                this.logger.debug(`Stopped native balance watcher for ${networkName}`);
            }

            this.registeredNativeBalances.delete(networkName);

            this.nativeBalances.delete(networkName);
        } else {
            const networkWatchers = this.tokenWatchers.get(networkName);
            if (networkWatchers) {
                const watcherId = networkWatchers.get(tokenSymbol);
                if (watcherId) {
                    this.txReader.readContractWatcher.remove(watcherId);
                    this.watcherIds = this.watcherIds.filter(id => id !== watcherId);
                    networkWatchers.delete(tokenSymbol);
                    this.logger.debug(`Stopped watcher for ${tokenSymbol} on ${networkName}`);
                }
                if (networkWatchers.size === 0) {
                    this.tokenWatchers.delete(networkName);
                }
            }

            this.registeredTokens.get(networkName)?.delete(tokenSymbol);
            if (this.registeredTokens.get(networkName)?.size === 0) {
                this.registeredTokens.delete(networkName);
            }

            const networkBalances = this.tokenBalances.get(networkName);
            if (networkBalances) {
                networkBalances.delete(tokenSymbol);
                if (networkBalances.size === 0) {
                    this.tokenBalances.delete(networkName);
                }
            }
        }
    }

    public beginWatching(): void {
        this.clearTokenWatchers();

        for (const network of this.activeNetworks) {
            if (this.registeredNativeBalances.has(network.name)) {
                this.watchNativeBalance(network);
            }

            const networkTokens = this.registeredTokens.get(network.name);
            if (networkTokens) {
                for (const [symbol, address] of networkTokens) {
                    this.watchTokenBalance(network, symbol, address);
                }
            }
        }
    }

    private watchNativeBalance(network: ConceroNetwork): string {
        const { account } = this.viemClientManager.getClients(network);
        const watcherId = this.txReader.methodWatcher.create(
            'getBalance',
            network,
            async (b: bigint): Promise<void> => this.onNativeBalanceUpdate(network.name, b),
            this.pollingIntervalMs,
            [account.address],
        );
        this.watcherIds.push(watcherId);
        this.nativeWatchers.set(network.name, watcherId);
        return watcherId;
    }

    private watchTokenBalance(
        network: ConceroNetwork,
        tokenSymbol: string,
        tokenAddress: Address,
    ): string {
        const { account } = this.viemClientManager.getClients(network);
        const watcherId = this.txReader.readContractWatcher.create(
            tokenAddress,
            network,
            'balanceOf',
            erc20Abi,
            async (b: bigint): Promise<void> =>
                this.onTokenBalanceUpdate(network.name, tokenSymbol, b),
            this.pollingIntervalMs,
            [account.address],
        );
        this.watcherIds.push(watcherId);

        if (!this.tokenWatchers.has(network.name)) {
            this.tokenWatchers.set(network.name, new Map());
        }
        this.tokenWatchers.get(network.name)!.set(tokenSymbol, watcherId);

        return watcherId;
    }

    public setActiveNetworks(networks: ConceroNetwork[]): void {
        this.activeNetworks.splice(0, this.activeNetworks.length, ...networks);
        const names = new Set(networks.map(n => n.name));

        for (const n of [...this.nativeBalances.keys()])
            if (!names.has(n)) {
                this.nativeBalances.delete(n);
                this.tokenBalances.delete(n);
            }
    }

    public async forceUpdate(): Promise<void> {
        await this.updateTokenBalances(this.activeNetworks);
        await this.updateNativeBalances(this.activeNetworks);
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

        const current = (await publicClient.readContract({
            address: tokenAddress as Address,
            abi: erc20Abi,
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
            abi: erc20Abi,
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
            abi: erc20Abi,
            functionName: 'allowance',
            args: [walletClient.account.address, spenderAddress as Address],
        })) as bigint;
    }

    private onTokenBalanceUpdate(net: string, sym: string, bal: bigint): void {
        const map = this.tokenBalances.get(net) ?? new Map<string, bigint>();
        map.set(sym, bal);
        this.tokenBalances.set(net, map);
    }

    private onNativeBalanceUpdate(net: string, bal: bigint): void {
        this.nativeBalances.set(net, bal);
        this.logger.debug(`Updated native balance for ${net}: ${bal.toString()}`);
    }

    // todo: this needs to be handled by TxManager with a method-centric subscription (eth_balance)
    private async updateNativeBalances(networks: ConceroNetwork[]): Promise<void> {
        await Promise.all(
            networks.map(async n => {
                const { publicClient, account } = this.viemClientManager.getClients(n);
                const bal = await publicClient.getBalance({ address: account.address });
                this.nativeBalances.set(n.name, bal);
            }),
        );
    }

    private async updateTokenBalances(networks: ConceroNetwork[]): Promise<void> {
        for (const n of networks) {
            const { publicClient, account } = this.viemClientManager.getClients(n);
            const map = new Map<string, bigint>();
            for (const cfg of this.getTokenConfigs(n.name)) {
                try {
                    const bal = (await publicClient.readContract({
                        address: cfg.address as Address,
                        abi: erc20Abi,
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
        this.watcherIds.forEach(id => {
            this.txReader.readContractWatcher.remove(id);
            this.txReader.methodWatcher.remove(id);
        });
        this.watcherIds.length = 0;
        this.tokenWatchers.clear();
        this.nativeWatchers.clear();
    }

    private findActiveNetwork(name: string): ConceroNetwork {
        const net = this.activeNetworks.find(n => n.name === name);
        if (!net) throw new Error(`Network ${name} is not active`);
        return net;
    }
}
