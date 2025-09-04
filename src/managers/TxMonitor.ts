import { Hash } from 'viem';

import {
    ConceroNetwork,
    IBlockManagerRegistry,
    IConceroNetworkManager,
    ILogger,
    ITxMonitor,
    IViemClientManager,
    TxMonitorConfig,
} from '../types';

interface Subscriber {
    id: string;
    finalityCallback?: (txHash: string, chainName: string, isFinalized: boolean) => Promise<void>;
    inclusionCallback?: (
        txHash: string,
        networkName: string,
        blockNumber: bigint,
        isIncluded: boolean,
    ) => Promise<void>;
}

interface TransactionMonitor {
    txHash: Hash;
    chainName: string;
    subscribers: Map<string, Subscriber>;
    type: 'inclusion' | 'finality';
    requiredConfirmations: number; // Used for both inclusion and finality, depending on type
    inclusionBlockNumber?: bigint;
    finalityBlockNumber?: bigint;
    startTime: number;
}

export class TxMonitor implements ITxMonitor {
    private static instance: TxMonitor | undefined;
    private monitors: Map<string, TransactionMonitor> = new Map();
    private viemClientManager: IViemClientManager;
    private logger: ILogger;
    private config: TxMonitorConfig;
    private networkSubscriptions: Map<string, () => void> = new Map();
    private blockManagerRegistry: IBlockManagerRegistry;
    private networkManager: IConceroNetworkManager;

    constructor(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
    ) {
        this.viemClientManager = viemClientManager;
        this.logger = logger;
        this.config = config;
        this.blockManagerRegistry = blockManagerRegistry;
        this.networkManager = networkManager;
        this.logger.info('initialized');
    }

    public static createInstance(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        blockManagerRegistry: IBlockManagerRegistry,
        networkManager: IConceroNetworkManager,
        config: TxMonitorConfig,
    ): TxMonitor {
        if (!TxMonitor.instance) {
            TxMonitor.instance = new TxMonitor(
                logger,
                viemClientManager,
                blockManagerRegistry,
                networkManager,
                config,
            );
        }
        return TxMonitor.instance;
    }

    public static getInstance(): TxMonitor {
        if (!TxMonitor.instance) {
            throw new Error('TxMonitor is not initialized. Call createInstance() first.');
        }
        return TxMonitor.instance;
    }

    public ensureTxFinality(
        txHash: string,
        chainName: string,
        onFinalityCallback: (txHash: string, chainName: string, isFinalized: boolean) => void,
    ): void {
        const existingMonitor = this.monitors.get(txHash);
        const subscriberId = this.generateSubscriberId();

        if (existingMonitor) {
            existingMonitor.subscribers.set(subscriberId, {
                id: subscriberId,
                finalityCallback: onFinalityCallback,
            });
            this.logger.debug(
                `Added subscriber ${subscriberId} to existing monitor for tx ${txHash}`,
            );
            return;
        }

        const monitor: TransactionMonitor = {
            txHash,
            chainName,
            subscribers: new Map(),
            type: 'finality',
            requiredConfirmations: 1,
            startTime: Date.now(),
        };

        monitor.subscribers.set(subscriberId, {
            id: subscriberId,
            finalityCallback: onFinalityCallback,
        });

        this.subscribeToNetwork(chainName);

        this.monitors.set(txHash, monitor);
        this.logger.debug(`Started monitoring tx ${txHash} on ${chainName} for finality`);
    }

    public ensureTxInclusion(
        txHash: string,
        chainName: string,
        onTxIncluded: (
            txHash: string,
            networkName: string,
            blockNumber: bigint,
            isIncluded: boolean,
        ) => void,
        confirmations = 1,
    ): void {
        const existingMonitor = this.monitors.get(txHash);
        const subscriberId = this.generateSubscriberId();

        if (existingMonitor) {
            existingMonitor.subscribers.set(subscriberId, {
                id: subscriberId,
                inclusionCallback: onTxIncluded,
            });
            this.logger.debug(
                `Added subscriber ${subscriberId} to existing monitor for tx ${txHash}`,
            );
            return;
        }

        const monitor: TransactionMonitor = {
            txHash,
            chainName,
            subscribers: new Map(),
            type: 'inclusion',
            requiredConfirmations: confirmations,
            startTime: Date.now(),
        };

        monitor.subscribers.set(subscriberId, {
            id: subscriberId,
            inclusionCallback: onTxIncluded,
        });

        this.subscribeToNetwork(chainName);

        this.monitors.set(txHash, monitor);
        this.logger.debug(
            `Started monitoring tx ${txHash} on ${chainName} for inclusion with ${confirmations} confirmations`,
        );
    }

    private generateSubscriberId(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private async checkTransactionStatus(
        monitor: TransactionMonitor,
        currentBlock: bigint,
        finalityConfirmations: bigint,
        network: ConceroNetwork,
    ): Promise<void> {
        try {
            const elapsedTime = Date.now() - monitor.startTime;

            if (
                monitor.type === 'inclusion' &&
                this.config.maxInclusionWait &&
                elapsedTime >= this.config.maxInclusionWait
            ) {
                this.logger.warn(
                    `Transaction ${monitor.txHash} inclusion monitoring timed out after ${elapsedTime}ms`,
                );
                this.notifyInclusionSubscribers(monitor, 0n, false);
                this.removeMonitor(monitor.txHash);
                return;
            }

            if (
                monitor.type === 'finality' &&
                this.config.maxFinalityWait &&
                elapsedTime >= this.config.maxFinalityWait
            ) {
                this.logger.warn(
                    `Transaction ${monitor.txHash} finality monitoring timed out after ${elapsedTime}ms`,
                );
                this.notifyFinalitySubscribers(monitor, false);
                this.removeMonitor(monitor.txHash);
                return;
            }

            const { publicClient } = this.viemClientManager.getClients(network.name);

            let inclusionBlockNumber = monitor.inclusionBlockNumber;
            if (!inclusionBlockNumber) {
                const receipt = await publicClient
                    .getTransactionReceipt({
                        hash: monitor.txHash,
                    })
                    .catch(() => null);

                if (!receipt) {
                    return;
                }

                inclusionBlockNumber = receipt.blockNumber;
                monitor.inclusionBlockNumber = inclusionBlockNumber;
            }

            if (monitor.type === 'inclusion') {
                const confirmations = currentBlock - inclusionBlockNumber + 1n;

                if (confirmations >= BigInt(monitor.requiredConfirmations)) {
                    this.notifyInclusionSubscribers(monitor, inclusionBlockNumber);
                    this.removeMonitor(monitor.txHash);
                }
            } else if (monitor.type === 'finality') {
                if (!monitor.finalityBlockNumber) {
                    monitor.finalityBlockNumber = inclusionBlockNumber + finalityConfirmations;
                }

                if (currentBlock >= monitor.finalityBlockNumber) {
                    const currentReceipt = await publicClient
                        .getTransactionReceipt({
                            hash: monitor.txHash as `0x${string}`,
                        })
                        .catch(() => null);

                    if (currentReceipt && currentReceipt.blockNumber === inclusionBlockNumber) {
                        this.notifyFinalitySubscribers(monitor, true);
                        this.removeMonitor(monitor.txHash);
                    } else {
                        this.notifyFinalitySubscribers(monitor, false);
                        this.removeMonitor(monitor.txHash);
                    }
                }
            }
        } catch (error) {
            this.logger.error(
                `Error checking transaction ${monitor.txHash}: ${error instanceof Error ? error.message : String(error)}`,
            );

            if (monitor.type === 'finality') {
                this.notifyFinalitySubscribers(monitor, false);
            } else {
                this.notifyInclusionSubscribers(monitor, 0n, false);
            }
            this.removeMonitor(monitor.txHash);
        }
    }

    private notifyFinalitySubscribers(monitor: TransactionMonitor, isFinalized: boolean): void {
        this.logger.debug(
            `Transaction ${monitor.txHash} ${isFinalized ? 'finalized' : 'failed/dropped'} - notifying finality subscribers`,
        );

        monitor.subscribers.forEach(subscriber => {
            if (subscriber.finalityCallback) {
                try {
                    subscriber.finalityCallback(monitor.txHash, monitor.chainName, isFinalized);
                } catch (error) {
                    this.logger.error(
                        `Error in finality callback for tx ${monitor.txHash}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }
        });
    }

    private notifyInclusionSubscribers(
        monitor: TransactionMonitor,
        blockNumber: bigint,
        isIncluded = true,
    ): void {
        this.logger.debug(
            `Transaction ${monitor.txHash} ${isIncluded ? 'included' : 'dropped'} at block ${blockNumber} - notifying inclusion subscribers`,
        );

        monitor.subscribers.forEach(subscriber => {
            if (subscriber.inclusionCallback) {
                try {
                    subscriber.inclusionCallback(
                        monitor.txHash,
                        monitor.chainName,
                        blockNumber,
                        isIncluded,
                    );
                } catch (error) {
                    this.logger.error(
                        `Error in inclusion callback for tx ${monitor.txHash}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }
        });
    }

    private async checkNetworkTransactions(networkName: string, endBlock: bigint): Promise<void> {
        const network = this.networkManager.getNetworkByName(networkName);
        if (!network) return;

        const activeMonitors = Array.from(this.monitors.values()).filter(
            monitor => monitor.chainName === networkName,
        );

        const finalityConfirmations = BigInt(
            network.finalityConfirmations ?? this.networkManager.getDefaultFinalityConfirmations(),
        );

        for (const monitor of activeMonitors) {
            if (!this.monitors.has(monitor.txHash)) {
                continue;
            }

            await this.checkTransactionStatus(monitor, endBlock, finalityConfirmations, network);
        }
    }

    private subscribeToNetwork(networkName: string): void {
        if (this.networkSubscriptions.has(networkName)) {
            return;
        }

        const blockManager = this.blockManagerRegistry.getBlockManager(networkName);
        if (!blockManager) {
            this.logger.warn(`BlockManager for ${networkName} not found`);
            return;
        }

        const unsubscribe = blockManager.watchBlocks({
            onBlockRange: async (startBlock: bigint, endBlock: bigint) => {
                await this.checkNetworkTransactions(networkName, endBlock);
            },
        });

        this.networkSubscriptions.set(networkName, unsubscribe);
        this.logger.debug(`Subscribed to blocks for network ${networkName}`);
    }

    private removeMonitor(txHash: string): void {
        this.monitors.delete(txHash);
    }

    public getMonitoredTransactions(chainName?: string): Array<{
        txHash: string;
        chainName: string;
        status: 'pending';
    }> {
        return Array.from(this.monitors.values())
            .filter(monitor => !chainName || monitor.chainName === chainName)
            .map(monitor => ({
                txHash: monitor.txHash,
                chainName: monitor.chainName,
                status: 'pending',
            }));
    }
}
