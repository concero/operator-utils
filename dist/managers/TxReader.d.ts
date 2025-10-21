import { Abi, AbiEvent, Address, Log } from 'viem';
import { ConceroNetwork, ILogger, ITxReader, IViemClientManager, LogQuery, TxReaderConfig } from '../types';
import { ILogsListenerStore } from '../types/managers/ILogsListenerStore';
export type LogsWatcherId = string;
export interface BulkCallbackResult<V = unknown> {
    watcherId: string;
    network: ConceroNetwork;
    value: V;
}
export interface BulkCallbackError {
    watcherId: string;
    network: ConceroNetwork;
    error: unknown;
}
export interface BulkCallbackPayload {
    bulkId: string;
    results: BulkCallbackResult[];
    errors: BulkCallbackError[];
}
type BulkCallback = (payload: BulkCallbackPayload) => Promise<void>;
export declare class TxReader implements ITxReader {
    private readonly config;
    private readonly logger;
    private readonly viemClientManager;
    private readonly logsListenerBlockCheckpointStore?;
    private static instance;
    private readonly logWatchers;
    private readonly readContractWatchers;
    private readonly methodWatchers;
    private readonly bulkCallbacks;
    private globalReadInterval?;
    private isGlobalLoopRunning;
    private readonly pollingIntervalMs;
    private targetBlockHeight;
    private lastRequestedBlocks;
    private readonly pQueues;
    private constructor();
    static createInstance(config: TxReaderConfig, logger: ILogger, viemClientManager: IViemClientManager, logsListenerBlockCheckpointStore?: ILogsListenerStore): TxReader;
    static getInstance(): TxReader;
    initialize(): Promise<void>;
    logWatcher: {
        create: (contractAddress: Address, network: ConceroNetwork, onLogs: (logs: Log[], network: ConceroNetwork) => Promise<void>, event: AbiEvent, blockManager: any) => Promise<LogsWatcherId>;
        remove: (id: LogsWatcherId) => boolean;
    };
    readContractWatcher: {
        create: (contractAddress: Address, network: ConceroNetwork, functionName: string, abi: Abi, callback: (result: any, network: ConceroNetwork) => Promise<void>, intervalMs?: number, args?: any[]) => string;
        bulkCreate: (items: {
            contractAddress: Address;
            network: ConceroNetwork;
            functionName: string;
            abi: Abi;
            args?: any[];
        }[], options: {
            timeoutMs?: number;
        }, onResult: BulkCallback) => {
            bulkId: string;
            watcherIds: string[];
        };
        remove: (id: string) => boolean;
        removeBulk: (bulkId: string) => boolean;
    };
    methodWatcher: {
        create: (method: string, network: ConceroNetwork, callback: (result: any, network: ConceroNetwork) => Promise<void>, intervalMs?: number, args?: any[]) => string;
        remove: (id: string) => boolean;
    };
    private ensureGlobalLoop;
    private scheduleNextGlobalRead;
    private stopGlobalLoopIfIdle;
    private executeGlobalReadLoop;
    private groupByNetwork;
    private executeContractBatch;
    private executeMethodBatch;
    private withTimeout;
    private pumpGetLogsQueue;
    private fetchLogsForWatcher;
    getLogs(q: LogQuery, n: ConceroNetwork): Promise<import("viem").GetLogsReturnType<AbiEvent, [AbiEvent], undefined, bigint, bigint>>;
}
export {};
//# sourceMappingURL=TxReader.d.ts.map