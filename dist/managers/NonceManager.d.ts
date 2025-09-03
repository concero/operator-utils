import { ManagerBase } from './ManagerBase';
import { ViemClientManager } from './ViemClientManager';
import { ILogger, INonceManager, NonceManagerConfig } from '../types';
export declare class NonceManager extends ManagerBase implements INonceManager {
    private static instance;
    private noncesMap;
    private mutexMap;
    private logger;
    private config;
    private viemClientManager;
    protected constructor(logger: ILogger, viemClientManager: ViemClientManager, config: NonceManagerConfig);
    static createInstance(logger: ILogger, viemClientManager: ViemClientManager, config: NonceManagerConfig): NonceManager;
    static getInstance(): NonceManager;
    get(networkName: string): Promise<number>;
    consume(networkName: string): Promise<number>;
    reset(networkName: string): void;
    refresh(networkName: string): Promise<void>;
    decrement(networkName: string): Promise<void>;
    private set;
    private getOrLoadNonce;
    private fetchNonce;
    private getMutex;
}
//# sourceMappingURL=NonceManager.d.ts.map