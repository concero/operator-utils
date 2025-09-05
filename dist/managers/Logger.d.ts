export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LoggerInterface {
    error: (message: unknown, meta?: Record<string, unknown>) => void;
    warn: (message: unknown, meta?: Record<string, unknown>) => void;
    info: (message: unknown, meta?: Record<string, unknown>) => void;
    debug: (message: unknown, meta?: Record<string, unknown>) => void;
}
export interface LoggerConfig {
    enableConsoleTransport: boolean;
    enableFileTransport: boolean;
    logDir: string;
    logMaxSize: string;
    logMaxFiles: string;
    batchFlushIntervalMs: number;
    batchMaxItems: number;
    batchMaxBytes: number;
    logLevelsGranular: Record<string, LogLevel>;
    logLevelDefault: LogLevel;
}
export declare class Logger {
    private readonly config;
    private static instance?;
    private readonly consoleLogger;
    private readonly fileLogger?;
    private readonly batchers;
    private constructor();
    static createInstance(cfg: LoggerConfig): Logger;
    static getInstance(): Logger;
    getLogger(consumer?: string): LoggerInterface;
    flushBatches(): void;
    close(): void;
    private lte;
    private createConsoleLogger;
    private createFileLogger;
    private flushFileBatch;
}
//# sourceMappingURL=Logger.d.ts.map