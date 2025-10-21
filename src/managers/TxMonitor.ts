import { Hash } from 'viem';

import { generateUid } from '../utils';
import {
    ConceroNetwork,
    IBlockManagerRegistry,
    IConceroNetworkManager,
    ILogger,
    ITxMonitor,
    IViemClientManager,
    TxMonitorConfig,
} from '../types';
import { ITxMonitorStore, PersistedMonitor } from '../types/managers';
import { InMemoryTxMonitorStore } from '../types/managers/ITxMonitorStore';
import { TxNotificationHub } from '../types/managers/ITxResultSubscriber';

export class TxMonitor implements ITxMonitor {
    private static instance: TxMonitor | undefined;

    private viemClientManager: IViemClientManager;
    private logger: ILogger;
    private config: TxMonitorConfig;
    private networkSubscriptions: Map<string, () => void> = new Map();
    private blockManagerRegistry: IBlockManagerRegistry;
    private networkManager: IConceroNetworkManager;

    private store: ITxMonitorStore;
    private hub = TxNotificationHub.getInstance();

    constructor(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
        store?: ITxMonitorStore,
    ) {
        this.viemClientManager = viemClientManager;
        this.logger = logger;
        this.config = config;
        this.blockManagerRegistry = blockManagerRegistry;
        this.networkManager = networkManager;
        this.store = store ?? new InMemoryTxMonitorStore();
        this.logger.info('initialized');
    }

    public static createInstance(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
        store?: ITxMonitorStore,
    ): TxMonitor {
        if (!TxMonitor.instance) {
            TxMonitor.instance = new TxMonitor(
                logger,
                viemClientManager,
                blockManagerRegistry,
                networkManager,
                config,
                store,
            );
        }
        return TxMonitor.instance;
    }

    public static getInstance(): TxMonitor {
        if (!TxMonitor.instance) throw new Error('TxMonitor is not initialized.');
        return TxMonitor.instance;
    }

    public trackTxFinality(txHash: Hash, chainName: string, subscriberId: string): void {
        this.upsertMonitor({
            txHash,
            chainName,
            type: 'finality',
            requiredConfirmations: 1,
            startTime: Date.now(),
            subscribers: [subscriberId],
        });
    }

    public trackTxInclusion(
        txHash: Hash,
        chainName: string,
        subscriberId: string,
        confirmations = 1,
    ): void {
        this.upsertMonitor({
            txHash,
            chainName,
            type: 'inclusion',
            requiredConfirmations: confirmations,
            startTime: Date.now(),
            subscribers: [subscriberId],
        });
    }

    public async cancel(txHash: Hash, subscriberId?: string): Promise<void> {
        if (!subscriberId) {
            await this.store.removeMonitor(txHash);
            return;
        }
        const m = await this.store.getMonitor(txHash);
        if (!m) return;
        m.subscribers = m.subscribers.filter(s => s !== subscriberId);
        if (m.subscribers.length === 0) await this.store.removeMonitor(txHash);
        else await this.store.upsertMonitor(m);
    }

    private async upsertMonitor(m: PersistedMonitor) {
        const existing = await this.store.getMonitor(m.txHash);
        if (existing) {
            const merged: PersistedMonitor = {
                ...existing,
                type: existing.type,
                requiredConfirmations: m.requiredConfirmations ?? existing.requiredConfirmations,
                startTime: existing.startTime ?? m.startTime,
                subscribers: Array.from(new Set([...existing.subscribers, ...m.subscribers])),
            };
            await this.store.upsertMonitor(merged);
        } else {
            await this.store.upsertMonitor(m);
        }
        this.subscribeToNetwork(m.chainName);
        this.logger.debug(`Started tracking ${m.type} for ${m.txHash} on ${m.chainName}`);
    }

    private async checkNetworkTransactions(networkName: string, endBlock: bigint): Promise<void> {
        const network = this.networkManager.getNetworkByName(networkName);
        if (!network) return;

        const finalityConfirmations = BigInt(
            network.finalityConfirmations ?? this.networkManager.getDefaultFinalityConfirmations(),
        );

        const monitors = await this.store.listMonitorsByNetwork(networkName);
        for (const monitor of monitors) {
            await this.checkTransactionStatus(monitor, endBlock, finalityConfirmations, network);
        }
    }

    private async checkTransactionStatus(
        monitor: PersistedMonitor,
        currentBlock: bigint,
        finalityConfirmations: bigint,
        network: ConceroNetwork,
    ): Promise<void> {
        try {
            const elapsed = Date.now() - monitor.startTime;

            if (
                monitor.type === 'inclusion' &&
                this.config.maxInclusionWait &&
                elapsed >= this.config.maxInclusionWait
            ) {
                this.logger.warn(`Tx ${monitor.txHash} inclusion timeout after ${elapsed}ms`);
                await this.notifySubscribers(monitor, false, 0n);
                await this.store.removeMonitor(monitor.txHash);
                return;
            }
            if (
                monitor.type === 'finality' &&
                this.config.maxFinalityWait &&
                elapsed >= this.config.maxFinalityWait
            ) {
                this.logger.warn(`Tx ${monitor.txHash} finality timeout after ${elapsed}ms`);
                await this.notifySubscribers(monitor, false);
                await this.store.removeMonitor(monitor.txHash);
                return;
            }

            const { publicClient } = this.viemClientManager.getClients(network.name);

            let inclusionBlock = monitor.inclusionBlockNumber;
            if (!inclusionBlock) {
                const receipt = await publicClient
                    .getTransactionReceipt({ hash: monitor.txHash })
                    .catch(() => null);
                if (!receipt) return;
                inclusionBlock = receipt.blockNumber;
                await this.store.setInclusionBlock(monitor.txHash, inclusionBlock);
            }

            if (monitor.type === 'inclusion') {
                const confirmations = currentBlock - inclusionBlock + 1n;
                if (confirmations >= BigInt(monitor.requiredConfirmations)) {
                    await this.notifySubscribers(monitor, true, inclusionBlock);
                    await this.store.removeMonitor(monitor.txHash);
                }
            } else {
                if (!monitor.finalityBlockNumber) {
                    await this.store.setFinalityTarget(
                        monitor.txHash,
                        inclusionBlock + finalityConfirmations,
                    );
                    monitor = (await this.store.getMonitor(monitor.txHash))!;
                }
                if (currentBlock >= monitor.finalityBlockNumber!) {
                    const receiptStillThere = await publicClient
                        .getTransactionReceipt({ hash: monitor.txHash })
                        .catch(() => null);
                    await this.notifySubscribers(monitor, !!receiptStillThere);
                    await this.store.removeMonitor(monitor.txHash);
                }
            }
        } catch (e) {
            this.logger.error(`Error checking tx ${monitor.txHash}: ${e}`);
            await this.notifySubscribers(monitor, false);
            await this.store.removeMonitor(monitor.txHash);
        }
    }

    private async notifySubscribers(m: PersistedMonitor, success: boolean, blockNumber?: bigint) {
        this.logger.debug(
            `Tx ${m.txHash} ${m.type}: ${success ? 'OK' : 'FAIL'} — notifying [${m.subscribers.join(', ')}]`,
        );
        await this.hub.notifyMany(m.subscribers, {
            txHash: m.txHash,
            chainName: m.chainName,
            type: m.type,
            success,
            blockNumber,
        });
    }
    private subscribeToNetwork(networkName: string): void {
        if (this.networkSubscriptions.has(networkName)) return;

        const blockManager = this.blockManagerRegistry.getBlockManager(networkName);
        if (!blockManager) {
            this.logger.warn(`BlockManager for ${networkName} not found`);
            return;
        }
        const unsubscribe = blockManager.watchBlocks({
            onBlockRange: async (_start: bigint, end: bigint) => {
                await this.checkNetworkTransactions(networkName, end);
            },
        });
        this.networkSubscriptions.set(networkName, unsubscribe);
        this.logger.debug(`Subscribed to blocks for ${networkName}`);
    }
}
