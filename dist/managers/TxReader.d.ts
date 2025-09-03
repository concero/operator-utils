import { Abi, AbiEvent, Address, Log } from 'viem';
import { ConceroNetwork, IConceroNetworkManager, IViemClientManager, TxReaderConfig } from '../types';
import { ILogger, ITxReader, LogQuery } from '../types/managers';
type BulkCallback = (payload: {
    bulkId: string;
    results: {
        watcherId: string;
        network: ConceroNetwork;
        value: any;
    }[];
    errors: {
        watcherId: string;
        network: ConceroNetwork;
        error: unknown;
    }[];
}) => Promise<void>;
export declare class TxReader implements ITxReader {
    private readonly logger;
    private readonly networkManager;
    private readonly viemClientManager;
    private static instance;
    private readonly logWatchers;
    private readonly readContractWatchers;
    private readonly methodWatchers;
    private readonly bulkCallbacks;
    private globalReadInterval?;
    private readonly watcherIntervalMs;
    private constructor();
    static createInstance(logger: ILogger, networkManager: IConceroNetworkManager, viemClientManager: IViemClientManager, config: TxReaderConfig): TxReader;
    static getInstance(): TxReader;
    initialize(): Promise<void>;
    logWatcher: {
        create: (contractAddress: Address, network: ConceroNetwork, onLogs: (logs: Log[], network: ConceroNetwork) => Promise<void>, event: AbiEvent, blockManager: any) => string;
        remove: (id: string) => boolean;
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
    private stopGlobalLoopIfIdle;
    private executeGlobalReadLoop;
    private groupByNetwork;
    private executeContractBatch;
    private executeMethodBatch;
    private withTimeout;
    private fetchLogsForWatcher;
    getLogs(q: LogQuery, n: ConceroNetwork): Promise<Log[]>;
}
export {};
//# sourceMappingURL=TxReader.d.ts.map