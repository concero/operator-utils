import { Abi, AbiEvent, Address, Log } from "viem";
import { LoggerInterface } from "../types/LoggerInterface";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { TxReaderConfig } from "../types/ManagerConfigs";
import { INetworkManager, IViemClientManager } from "../types/managers";
import { ITxReader, LogQuery } from "../types/managers/ITxReader";
export declare class TxReader implements ITxReader {
    private static instance;
    private logWatchers;
    private readContractWatchers;
    private readContractIntervals;
    private logger;
    private networkManager;
    private viemClientManager;
    private constructor();
    static createInstance(logger: LoggerInterface, networkManager: INetworkManager, viemClientManager: IViemClientManager, config: TxReaderConfig): TxReader;
    static getInstance(): TxReader;
    initialize(): Promise<void>;
    logWatcher: {
        create: (contractAddress: Address, network: ConceroNetwork, onLogs: (logs: Log[], network: ConceroNetwork) => Promise<void>, event: AbiEvent, blockManager: any) => string;
        remove: (watcherId: string) => boolean;
    };
    readContractWatcher: {
        create: (contractAddress: Address, network: ConceroNetwork, functionName: string, abi: Abi, callback: (result: any, network: ConceroNetwork) => Promise<void>, intervalMs?: number, args?: any[]) => string;
        remove: (watcherId: string) => boolean;
    };
    private fetchLogsForWatcher;
    private executeReadContract;
    getLogs(query: LogQuery, network: ConceroNetwork): Promise<Log[]>;
    dispose(): void;
}
//# sourceMappingURL=TxReader.d.ts.map