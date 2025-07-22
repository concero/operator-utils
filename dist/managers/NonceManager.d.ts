import { NonceManagerConfig } from "../types/ManagerConfigs";
import { IGetNonceParams, INonceManager, INonceManagerParams } from "../types/managers/INonceManager";
import { LoggerInterface } from "../utils/Logger";
import { ManagerBase } from "./ManagerBase";
export declare class NonceManager extends ManagerBase implements INonceManager {
    private static instance;
    private noncesMap;
    private mutexMap;
    private logger;
    private config;
    protected constructor(logger: LoggerInterface, config: NonceManagerConfig);
    static createInstance(logger: LoggerInterface, config: NonceManagerConfig): NonceManager;
    static getInstance(): NonceManager;
    static dispose(): void;
    get(params: IGetNonceParams): Promise<number>;
    consume(params: IGetNonceParams): Promise<number>;
    reset(params: INonceManagerParams): void;
    set(params: INonceManagerParams, nonce: number): void;
    private fetchNonce;
    private getMutex;
    private createPublicCLientFromGetNonceParams;
}
//# sourceMappingURL=NonceManager.d.ts.map