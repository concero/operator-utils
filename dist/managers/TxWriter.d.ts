import { SimulateContractParameters } from "viem";
import { LoggerInterface } from "../types/LoggerInterface";
import { ConceroNetwork } from "../types/ConceroNetwork";
import { TxWriterConfig } from "../types/ManagerConfigs";
import { INonceManager, ITxMonitor, IViemClientManager } from "../types/managers";
import { ITxWriter } from "../types/managers/ITxWriter";
export declare class TxWriter implements ITxWriter {
    private static instance;
    private viemClientManager;
    private txMonitor;
    private logger;
    private config;
    private nonceManager;
    private constructor();
    static createInstance(logger: LoggerInterface, viemClientManager: IViemClientManager, txMonitor: ITxMonitor, nonceManager: INonceManager, config: TxWriterConfig): TxWriter;
    static getInstance(): TxWriter;
    initialize(): Promise<void>;
    callContract(network: ConceroNetwork, params: SimulateContractParameters): Promise<string>;
    private createRetryCallback;
    private createFinalityCallback;
    dispose(): void;
}
//# sourceMappingURL=TxWriter.d.ts.map