import { Hash, SimulateContractParameters } from 'viem';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, IRetryStore, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxResultSubscriber } from '../types/managers/ITxResultSubscriber';
import { ITxWriter } from '../types/managers/ITxWriter';
export declare class TxWriter implements ITxWriter, ITxResultSubscriber {
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
    callContract(network: ConceroNetwork, params: SimulateContractParameters, ensureTxFinality?: boolean): Promise<Hash>;
    notifyTxResult({ txHash, chainName, type, success, }: {
        txHash: Hash;
        chainName: string;
        type: 'inclusion' | 'finality';
        success: boolean;
        blockNumber?: bigint;
    }): Promise<void>;
    private send;
    private nextDelaySeconds;
    private deriveOperationId;
}
//# sourceMappingURL=TxWriter.d.ts.map