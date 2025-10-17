import { Hash, SimulateContractParameters } from 'viem';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { IRetryStore } from '../types/managers/IRetryStore';
import { ITxWriter } from '../types/managers/ITxWriter';
export declare class TxWriter implements ITxWriter {
    private static instance;
    private viemClientManager;
    private txMonitor;
    private logger;
    private config;
    private nonceManager;
    private readonly retryStore;
    private static readonly BACKOFF_SECONDS;
    private constructor();
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, txMonitor: ITxMonitor, nonceManager: INonceManager, config: TxWriterConfig, retryStore?: IRetryStore): TxWriter;
    static getInstance(): TxWriter;
    initialize(): Promise<void>;
    callContract(network: ConceroNetwork, params: SimulateContractParameters, ensureTxFinality?: boolean): Promise<Hash>;
    private callContractWithMonitoring;
    private nextDelaySeconds;
    private deriveOperationId;
    private createRetryCallback;
}
//# sourceMappingURL=TxWriter.d.ts.map