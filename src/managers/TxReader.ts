import { v4 as uuidv4 } from 'uuid';
import { Abi, AbiEvent, Address, Log } from 'viem';

import { ConceroNetwork } from '../types/ConceroNetwork';
import { LoggerInterface } from '../types/LoggerInterface';
import { TxReaderConfig } from '../types/ManagerConfigs';
import { INetworkManager, IViemClientManager } from '../types/managers';
import { ITxReader, LogQuery, LogWatcher, ReadContractWatcher } from '../types/managers/ITxReader';

type Watcher = ReadContractWatcher & {
    timeoutMs?: number;
    lastExecuted: number;
    bulkId?: string;
};

type MethodWatcher = {
    id: string;
    network: ConceroNetwork;
    method: string;
    args?: any[];
    intervalMs: number;
    callback: (result: any, network: ConceroNetwork) => Promise<void>;
    lastExecuted: number;
    bulkId?: string;
    timeoutMs?: number;
};

type BulkCallback = (payload: {
    bulkId: string;
    results: { watcherId: string; network: ConceroNetwork; value: any }[];
    errors: { watcherId: string; network: ConceroNetwork; error: unknown }[];
}) => Promise<void>;

export class TxReader implements ITxReader {
    private static instance: TxReader | undefined;

    private readonly logWatchers = new Map<string, LogWatcher>();
    private readonly readContractWatchers = new Map<string, Watcher>();
    private readonly methodWatchers = new Map<string, MethodWatcher>();
    private readonly bulkCallbacks = new Map<string, BulkCallback>();

    private globalReadInterval?: NodeJS.Timeout;
    private readonly watcherIntervalMs: number;

    private constructor(
        private readonly logger: LoggerInterface,
        private readonly networkManager: INetworkManager,
        private readonly viemClientManager: IViemClientManager,
        config: TxReaderConfig,
    ) {
        this.watcherIntervalMs = config.watcherIntervalMs ?? 10_000;
        this.logger.debug(
            `TxReader: Initialized with watcher interval ${this.watcherIntervalMs}ms`,
        );
    }

    public static createInstance(
        logger: LoggerInterface,
        networkManager: INetworkManager,
        viemClientManager: IViemClientManager,
        config: TxReaderConfig,
    ): TxReader {
        TxReader.instance = new TxReader(logger, networkManager, viemClientManager, config);
        return TxReader.instance;
    }

    public static getInstance(): TxReader {
        if (!TxReader.instance) throw new Error('TxReader is not initialized.');
        return TxReader.instance;
    }

    public async initialize(): Promise<void> {
        this.logger.info('Initialized');
    }

    public logWatcher = {
        create: (
            contractAddress: Address,
            network: ConceroNetwork,
            onLogs: (logs: Log[], network: ConceroNetwork) => Promise<void>,
            event: AbiEvent,
            blockManager: any,
        ): string => {
            const id = uuidv4();
            const unwatch = blockManager.watchBlocks({
                onBlockRange: (from: bigint, to: bigint) => this.fetchLogsForWatcher(id, from, to),
            });
            this.logWatchers.set(id, {
                id,
                network,
                contractAddress,
                event,
                callback: onLogs,
                blockManager,
                unwatch,
            });
            this.logger.debug(
                `Created log watcher for ${network.name}:${contractAddress} (${event.name})`,
            );
            return id;
        },
        remove: (id: string): boolean => {
            const w = this.logWatchers.get(id);
            if (!w) return false;
            w.unwatch();
            this.logWatchers.delete(id);
            return true;
        },
    };

    public readContractWatcher = {
        create: (
            contractAddress: Address,
            network: ConceroNetwork,
            functionName: string,
            abi: Abi,
            callback: (result: any, network: ConceroNetwork) => Promise<void>,
            intervalMs = 10_000,
            args?: any[],
        ): string => {
            const id = uuidv4();
            this.readContractWatchers.set(id, {
                id,
                network,
                contractAddress,
                functionName,
                abi,
                args,
                intervalMs,
                callback,
                lastExecuted: 0,
            });
            this.ensureGlobalLoop();
            this.logger.debug(
                `Created read contract watcher for ${network.name}:${contractAddress}.${functionName}`,
            );
            return id;
        },

        bulkCreate: (
            items: {
                contractAddress: Address;
                network: ConceroNetwork;
                functionName: string;
                abi: Abi;
                args?: any[];
            }[],
            options: { timeoutMs?: number },
            onResult: BulkCallback,
        ): { bulkId: string; watcherIds: string[] } => {
            const timeoutMs = options.timeoutMs || this.watcherIntervalMs;
            let effectiveInterval = this.watcherIntervalMs;

            if (timeoutMs > this.watcherIntervalMs) {
                this.logger.warn(
                    `TxReader.bulkCreate: timeoutMs (${timeoutMs} ms) is greater than the ` +
                        `global polling interval (${this.watcherIntervalMs} ms). ` +
                        `Using timeoutMs as the interval for this bulk to prevent overlapping reads.`,
                );
                effectiveInterval = timeoutMs;
            }

            const bulkId = uuidv4();
            const watcherIds: string[] = [];

            for (const c of items) {
                const id = uuidv4();
                watcherIds.push(id);
                this.readContractWatchers.set(id, {
                    id,
                    bulkId,
                    network: c.network,
                    contractAddress: c.contractAddress,
                    functionName: c.functionName,
                    abi: c.abi,
                    args: c.args,
                    intervalMs: effectiveInterval,
                    timeoutMs: options?.timeoutMs,
                    callback: async () => {}, // not used for bulks
                    lastExecuted: 0,
                });
            }

            this.bulkCallbacks.set(bulkId, onResult);
            this.ensureGlobalLoop();
            this.logger.debug(
                `Bulk-created ${watcherIds.length} watchers ${bulkId} (timeout: ${options?.timeoutMs ?? '∞'} ms)`,
            );
            return { bulkId, watcherIds };
        },

        remove: (id: string): boolean => {
            const removed = this.readContractWatchers.delete(id);
            this.stopGlobalLoopIfIdle();
            return removed;
        },

        removeBulk: (bulkId: string): boolean => {
            let changed = false;
            for (const [id, w] of this.readContractWatchers.entries()) {
                if (w.bulkId === bulkId) {
                    this.readContractWatchers.delete(id);
                    changed = true;
                }
            }
            this.bulkCallbacks.delete(bulkId);
            this.stopGlobalLoopIfIdle();
            return changed;
        },
    };

    public methodWatcher = {
        create: (
            method: string,
            network: ConceroNetwork,
            callback: (result: any, network: ConceroNetwork) => Promise<void>,
            intervalMs = 10_000,
            args?: any[],
        ): string => {
            const id = uuidv4();
            this.methodWatchers.set(id, {
                id,
                network,
                method,
                args,
                intervalMs,
                callback,
                lastExecuted: 0,
            });
            this.ensureGlobalLoop();
            this.logger.debug(
                `Created method watcher ${id} for ${network.name}:${method} with interval ${intervalMs}ms`,
            );
            return id;
        },

        remove: (id: string): boolean => {
            const removed = this.methodWatchers.delete(id);
            this.stopGlobalLoopIfIdle();
            return removed;
        },
    };

    private ensureGlobalLoop(): void {
        if (this.globalReadInterval) return;
        this.globalReadInterval = setInterval(
            () => this.executeGlobalReadLoop(),
            this.watcherIntervalMs,
        );
        this.logger.debug(
            `TxReader: Started global read loop with ${this.watcherIntervalMs}ms interval`,
        );
    }

    private stopGlobalLoopIfIdle(): void {
        if (
            this.readContractWatchers.size === 0 &&
            this.methodWatchers.size === 0 &&
            this.globalReadInterval
        ) {
            clearInterval(this.globalReadInterval);
            this.globalReadInterval = undefined;
            this.logger.debug('TxReader: Stopped global read loop - no more watchers');
        }
    }

    private async executeGlobalReadLoop(): Promise<void> {
        const now = Date.now();
        const dueContractWatchers: Watcher[] = [];
        const dueMethodWatchers: MethodWatcher[] = [];

        this.logger.debug(
            `TxReader: Checking ${this.readContractWatchers.size} contract watchers and ${this.methodWatchers.size} method watchers`,
        );

        for (const w of this.readContractWatchers.values()) {
            if (now - w.lastExecuted >= w.intervalMs) {
                w.lastExecuted = now;
                dueContractWatchers.push(w);
            }
        }

        for (const w of this.methodWatchers.values()) {
            if (now - w.lastExecuted >= w.intervalMs) {
                w.lastExecuted = now;
                dueMethodWatchers.push(w);
            }
        }

        if (dueContractWatchers.length === 0 && dueMethodWatchers.length === 0) {
            this.logger.debug('TxReader: No watchers due for execution');
            return;
        }

        this.logger.debug(
            `TxReader: Executing ${dueContractWatchers.length} contract watchers and ${dueMethodWatchers.length} method watchers`,
        );

        const contractOutcomes =
            dueContractWatchers.length > 0
                ? (
                      await Promise.all(
                          [...this.groupByNetwork(dueContractWatchers).values()].map(group =>
                              this.executeContractBatch(group),
                          ),
                      )
                  ).flat()
                : [];

        const methodOutcomes =
            dueMethodWatchers.length > 0
                ? (
                      await Promise.all(
                          [...this.groupByNetwork(dueMethodWatchers).values()].map(group =>
                              this.executeMethodBatch(group),
                          ),
                      )
                  ).flat()
                : [];

        const outcomes = [...contractOutcomes, ...methodOutcomes];

        const bulkBuckets = new Map<string, typeof outcomes>();
        for (const o of outcomes) {
            if (o.watcher.bulkId) {
                const b = o.watcher.bulkId;
                if (!bulkBuckets.has(b)) bulkBuckets.set(b, []);
                bulkBuckets.get(b)!.push(o);
            } else {
                if (o.status === 'fulfilled') {
                    // single-watcher callback
                    o.watcher
                        .callback(o.value, o.watcher.network)
                        .catch(err =>
                            this.logger.error(
                                `single callback failed (${o.watcher.id}): ${err instanceof Error ? err.message : String(err)}`,
                            ),
                        );
                } else {
                    this.logger.error(
                        `readContract failed (${o.watcher.id}): ${o.reason instanceof Error ? o.reason.message : String(o.reason)}`,
                    );
                }
            }
        }

        for (const [bulkId, bucket] of bulkBuckets.entries()) {
            const cb = this.bulkCallbacks.get(bulkId);
            if (!cb) continue;

            const results = bucket
                .filter(x => x.status === 'fulfilled')
                .map(x => ({
                    watcherId: x.watcher.id,
                    network: x.watcher.network,
                    value: (x as any).value,
                }));

            const errors = bucket
                .filter(x => x.status === 'rejected')
                .map(x => ({
                    watcherId: x.watcher.id,
                    network: x.watcher.network,
                    error: (x as any).reason,
                }));

            try {
                await cb({ bulkId, results, errors });
            } catch (e) {
                this.logger.error(
                    `bulk callback failed (${bulkId}): ${e instanceof Error ? e.message : String(e)}`,
                );
            }
        }
    }

    private groupByNetwork(watchers: any[]): Map<string, any[]> {
        const byNetwork = new Map<string, any[]>();
        for (const w of watchers) {
            const key = w.network.name;
            if (!byNetwork.has(key)) byNetwork.set(key, []);
            byNetwork.get(key)!.push(w);
        }
        return byNetwork;
    }

    private async executeContractBatch(ws: Watcher[]) {
        const network = ws[0].network;
        const { publicClient } = this.viemClientManager.getClients(network.name);

        const reads = ws.map(w =>
            publicClient.readContract({
                address: w.contractAddress,
                abi: w.abi,
                functionName: w.functionName,
                args: w.args,
            }),
        );

        const settled = await Promise.allSettled(
            ws.map((w, i) => (w.timeoutMs ? this.withTimeout(reads[i], w.timeoutMs) : reads[i])),
        );

        return settled.map((res, i) =>
            res.status === 'fulfilled'
                ? { status: 'fulfilled' as const, watcher: ws[i], value: res.value }
                : { status: 'rejected' as const, watcher: ws[i], reason: res.reason },
        );
    }

    private async executeMethodBatch(ws: MethodWatcher[]) {
        const network = ws[0].network;
        const { publicClient } = this.viemClientManager.getClients(network.name);

        this.logger.debug(`Executing method batch for ${network.name}: ${ws.length} watchers`);

        const reads = ws.map(w => {
            switch (w.method) {
                case 'getBalance':
                    return publicClient.getBalance({ address: w.args?.[0] });
                default:
                    throw new Error(`Unsupported method: ${w.method}`);
            }
        });

        const settled = await Promise.allSettled(
            ws.map((w, i) => (w.timeoutMs ? this.withTimeout(reads[i], w.timeoutMs) : reads[i])),
        );

        this.logger.debug(`Method batch completed for ${network.name}: ${settled.length} results`);

        return settled.map((res, i) =>
            res.status === 'fulfilled'
                ? { status: 'fulfilled' as const, watcher: ws[i], value: res.value }
                : { status: 'rejected' as const, watcher: ws[i], reason: res.reason },
        );
    }

    private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
        return Promise.race([
            p,
            new Promise<T>((_, r) => setTimeout(() => r(new Error('timeout')), ms)),
        ]);
    }

    private async fetchLogsForWatcher(id: string, from: bigint, to: bigint): Promise<void> {
        const w = this.logWatchers.get(id);
        if (!w) return;

        try {
            const logs = await this.getLogs(
                {
                    address: w.contractAddress,
                    event: w.event,
                    fromBlock: from,
                    toBlock: to,
                },
                w.network,
            );
            if (logs.length)
                w.callback(logs, w.network).catch(e =>
                    this.logger.error(`fetchLogs failed (${id})`, e),
                );
        } catch (e) {
            this.logger.error(
                `fetchLogs failed (${id}): ${e instanceof Error ? e.message : String(e)}`,
            );
        }
    }

    public async getLogs(q: LogQuery, n: ConceroNetwork): Promise<Log[]> {
        const { publicClient } = this.viemClientManager.getClients(n.name);
        try {
            return await publicClient.getLogs({
                address: q.address,
                fromBlock: q.fromBlock,
                toBlock: q.toBlock,
                event: q.event,
                ...(q.args && { args: q.args }),
            });
        } catch (e) {
            this.logger.error(
                `getLogs failed on ${n.name}: ${e instanceof Error ? e.message : String(e)}`,
            );
            return [];
        }
    }
}
