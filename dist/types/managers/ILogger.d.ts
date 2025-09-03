export interface ILogger {
    error(message: any, ...meta: any[]): void;
    warn(message: any, ...meta: any[]): void;
    info(message: any, ...meta: any[]): void;
    debug(message: any, ...meta: any[]): void;
}
export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
export interface LoggerInterface {
    error(message: unknown, ...meta: unknown[]): void;
    warn(message: unknown, ...meta: unknown[]): void;
    info(message: unknown, ...meta: unknown[]): void;
    debug(message: unknown, ...meta: unknown[]): void;
}
/** Configuration for Logger */
export interface LoggerConfig {
    logDir: string;
    logMaxSize: string;
    logMaxFiles: string | number;
    logLevelDefault: LogLevel;
    logLevelsGranular: Record<string, LogLevel>;
    enableConsoleTransport?: boolean;
    enableFileTransport?: boolean;
    batchFlushIntervalMs?: number;
    batchMaxItems?: number;
    batchMaxBytes?: number;
}
//# sourceMappingURL=ILogger.d.ts.map