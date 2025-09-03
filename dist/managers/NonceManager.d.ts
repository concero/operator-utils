import { ManagerBase } from './ManagerBase';
import { ViemClientManager } from './ViemClientManager';
import { LoggerInterface } from '../types/LoggerInterface';
import { NonceManagerConfig } from '../types/ManagerConfigs';
import { INonceManager } from '../types/managers/INonceManager';
export declare class NonceManager extends ManagerBase implements INonceManager {
    private static instance;
    private noncesMap;
    private mutexMap;
    private logger;
    private config;
    private viemClientManager;
    protected constructor(logger: LoggerInterface, viemClientManager: ViemClientManager, config: NonceManagerConfig);
    static createInstance(logger: LoggerInterface, viemClientManager: ViemClientManager, config: NonceManagerConfig): NonceManager;
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