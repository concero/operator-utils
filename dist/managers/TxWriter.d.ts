import { SimulateContractParameters, WaitForTransactionReceiptReturnType } from 'viem';
import { ConceroNetwork, ILogger, INonceManager, IRetryStore, ITxMonitor, ITxWriter, IViemClientManager, TxWriterConfig } from '../types';
export declare class TxWriter implements ITxWriter {
    private static instance;
    private viemClientManager;
    private txMonitor;
    private logger;
    private config;
    private nonceManager;
    private retryStore;
    readonly id = "tx-writer";
    private static readonly BACKOFF_SECONDS;
    private constructor();
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, txMonitor: ITxMonitor, nonceManager: INonceManager, config: TxWriterConfig, retryStore?: IRetryStore): TxWriter;
    static getInstance(): TxWriter;
    get name(): string;
    initialize(): Promise<void>;
    callContract(network: ConceroNetwork, params: SimulateContractParameters, ensureTxFinality?: boolean): Promise<WaitForTransactionReceiptReturnType>;
}
//# sourceMappingURL=TxWriter.d.ts.map