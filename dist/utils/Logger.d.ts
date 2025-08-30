import { ManagerBase } from '../managers/ManagerBase';
import { LoggerConfig, LoggerInterface } from '../types/ManagerConfigs';
export declare class Logger extends ManagerBase {
    private static instance?;
    private baseLogger;
    private consumerLoggers;
    private batchers;
    private config;
    private constructor();
    static createInstance(config: LoggerConfig): Logger;
    static getInstance(): Logger;
    private safeStringify;
    private createBaseLogger;
    initialize(): Promise<void>;
    getLogger(consumerName?: string): LoggerInterface;
    private createConsumerLogger;
    private flushBatch;
    private shouldBatch;
}
//# sourceMappingURL=Logger.d.ts.map