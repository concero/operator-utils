import { SimulateContractParameters } from 'viem';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxWriter } from '../types/managers/ITxWriter';
export declare class TxWriter implements ITxWriter {
    private static instance;
    private viemClientManager;
    private txMonitor;
    private logger;
    private config;
    private nonceManager;
    private constructor();
    static createInstance(logger: ILogger, viemClientManager: IViemClientManager, txMonitor: ITxMonitor, nonceManager: INonceManager, config: TxWriterConfig): TxWriter;
    static getInstance(): TxWriter;
    initialize(): Promise<void>;
    callContract(network: ConceroNetwork, params: SimulateContractParameters, ensureTxFinality?: boolean): Promise<string>;
    private callContractWithMonitoring;
    private createRetryCallback;
}
//# sourceMappingURL=TxWriter.d.ts.map