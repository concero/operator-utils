import { Hash, SimulateContractParameters } from 'viem';
import { ITxResultSubscriber } from 'src/types/managers/ITxResultSubscriber';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxWriter } from '../types/managers/ITxWriter';
export declare class TxWriter implements ITxWriter, ITxResultSubscriber {
    private static instance;
    private viemClientManager;
    private txMonitor;
    private logger;
    private config;
    private nonceManager;
    private readonly ctxByTx;
    readonly id = "tx-writer";
    private static readonly BACKOFF_SECONDS;
    private constructor();
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, txMonitor: ITxMonitor, nonceManager: INonceManager, config: TxWriterConfig): TxWriter;
    static getInstance(): TxWriter;
    get name(): string;
    initialize(): Promise<void>;
    callContract(network: ConceroNetwork, params: SimulateContractParameters, ensureTxFinality?: boolean): Promise<Hash>;
    notifyTxResult({ txHash, chainName, type, success }: any): Promise<void>;
    private send;
    private nextDelaySeconds;
}
//# sourceMappingURL=TxWriter.d.ts.map