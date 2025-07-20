import { LoggerConfig } from "../types/ManagerConfigs";
import { ManagerBase } from "../managers/ManagerBase";
export interface LoggerInterface {
    error(message: any, ...meta: any[]): void;
    warn(message: any, ...meta: any[]): void;
    info(message: any, ...meta: any[]): void;
    debug(message: any, ...meta: any[]): void;
}
export declare class Logger extends ManagerBase {
    private static instance;
    private baseLogger;
    private consumerLoggers;
    private config;
    private constructor();
    static createInstance(config: LoggerConfig): Logger;
    static getInstance(): Logger;
    private createBaseLogger;
    initialize(): Promise<void>;
    getLogger(consumerName?: string): LoggerInterface;
    private createConsumerLogger;
    dispose(): void;
}
//# sourceMappingURL=Logger.d.ts.map