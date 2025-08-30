import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { ManagerBase } from '../managers/ManagerBase';
import { LogLevel, LoggerConfig, LoggerInterface } from '../types/ManagerConfigs';

type BatchItem = { level: LogLevel; message: unknown; meta: unknown[] };

class LogBatcher {
    private buffer: BatchItem[] = [];
    private byteEstimate = 0;
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly flushFn: (items: BatchItem[]) => void,
        private readonly intervalMs: number,
        private readonly maxItems: number,
        private readonly maxBytes: number,
    ) {}

    enqueue(item: BatchItem) {
        this.buffer.push(item);
        this.byteEstimate += this.sizeOf(item);
        if (this.buffer.length >= this.maxItems || this.byteEstimate >= this.maxBytes) {
            this.flushNow();
            return;
        }
        if (!this.timer) {
            this.timer = setTimeout(() => this.flushNow(), this.intervalMs);
            if (this.timer.unref) this.timer.unref();
        }
    }

    flushNow() {
        if (!this.buffer.length) return;
        const batch = this.buffer;
        this.buffer = [];
        this.byteEstimate = 0;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        this.flushFn(batch);
    }

    dispose() {
        this.flushNow();
    }

    private sizeOf(item: BatchItem): number {
        let size = 0;
        try {
            size +=
                typeof item.message === 'string'
                    ? item.message.length
                    : JSON.stringify(item.message).length;
        } catch {
            size += 64;
        }
        for (const m of item.meta) {
            try {
                size += typeof m === 'string' ? m.length : JSON.stringify(m).length;
            } catch {
                size += 64;
            }
        }
        return size + 16;
    }
}

export class Logger extends ManagerBase {
    private static instance?: Logger;
    private baseLogger: winston.Logger;
    private consumerLoggers = new Map<string, LoggerInterface>();
    private batchers = new Map<string, LogBatcher>();
    private config: Required<
        Pick<
            LoggerConfig,
            | 'enableConsoleTransport'
            | 'enableFileTransport'
            | 'batchFlushIntervalMs'
            | 'batchMaxItems'
            | 'batchMaxBytes'
        >
    > &
        LoggerConfig;

    private constructor(cfg: LoggerConfig) {
        super();
        this.config = {
            enableConsoleTransport: cfg.enableConsoleTransport ?? true,
            enableFileTransport: cfg.enableFileTransport ?? false,
            batchFlushIntervalMs: cfg.batchFlushIntervalMs ?? 200,
            batchMaxItems: cfg.batchMaxItems ?? 50,
            batchMaxBytes: cfg.batchMaxBytes ?? 64 * 1024,
            ...cfg,
        };
        this.baseLogger = this.createBaseLogger();
    }

    public static createInstance(config: LoggerConfig): Logger {
        if (!Logger.instance) Logger.instance = new Logger(config);
        return Logger.instance;
    }

    public static getInstance(): Logger {
        if (!Logger.instance)
            throw new Error('Logger is not initialized. Call createInstance() first.');
        return Logger.instance;
    }

    private safeStringify(obj: unknown, indent?: number): string {
        return JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v), indent);
    }

    private createBaseLogger(): winston.Logger {
        const consoleFormat = winston.format.combine(
            winston.format.colorize({ level: true }),
            winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, consumer, ...rest }) => {
                const prefix = consumer ? `${consumer}` : '';
                const msg =
                    typeof message === 'object' ? this.safeStringify(message, 2) : String(message);
                const meta = rest && Object.keys(rest).length ? this.safeStringify(rest, 2) : '';
                return `${timestamp} ${level} ${prefix}: ${msg} ${meta}`.trim();
            }),
        );

        const transports: winston.transport[] = [];

        if (this.config.enableFileTransport) {
            transports.push(
                new DailyRotateFile({
                    level: 'debug',
                    dirname: this.config.logDir,
                    filename: 'log-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: this.config.logMaxSize,
                    maxFiles: this.config.logMaxFiles,
                }),
                new DailyRotateFile({
                    level: 'error',
                    dirname: this.config.logDir,
                    filename: 'error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxSize: this.config.logMaxSize,
                    maxFiles: this.config.logMaxFiles,
                }),
            );
        }

        if (this.config.enableConsoleTransport) {
            transports.push(
                new winston.transports.Console({
                    level: 'debug',
                    format: consoleFormat,
                }),
            );
        }

        return winston.createLogger({
            level: 'debug',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports,
        });
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        super.initialize();
        this.getLogger('Logger').info('Initialized');
    }

    getLogger(consumerName?: string): LoggerInterface {
        const key = consumerName || '__default__';
        const existing = this.consumerLoggers.get(key);
        if (existing) return existing;

        const logger = this.createConsumerLogger(consumerName);
        this.consumerLoggers.set(key, logger);

        if (this.shouldBatch()) {
            const batcher = new LogBatcher(
                items => this.flushBatch(items, consumerName),
                this.config.batchFlushIntervalMs,
                this.config.batchMaxItems,
                this.config.batchMaxBytes,
            );
            this.batchers.set(key, batcher);
        }

        return logger;
    }

    private createConsumerLogger(consumerName?: string): LoggerInterface {
        const levelFor = (): LogLevel =>
            (consumerName
                ? this.config.logLevelsGranular[consumerName]
                : this.config.logLevelDefault) || this.config.logLevelDefault;

        const rank: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
        const shouldLog = (lvl: LogLevel) => rank[lvl] <= rank[levelFor()];

        const write = (lvl: LogLevel, message: unknown, meta: unknown[]) => {
            const metaObj = consumerName ? { consumer: consumerName } : {};
            if (this.shouldBatch() && lvl !== 'error') {
                const batcher = this.batchers.get(consumerName || '__default__')!;
                batcher.enqueue({ level: lvl, message, meta: [metaObj] });
                return;
            }
            this.baseLogger[lvl](message as any, metaObj);
        };

        return {
            error: (message: unknown, ...meta: unknown[]) => write('error', message, meta),
            warn: (message: unknown, ...meta: unknown[]) => {
                if (shouldLog('warn')) write('warn', message, meta);
            },
            info: (message: unknown, ...meta: unknown[]) => {
                if (shouldLog('info')) write('info', message, meta);
            },
            debug: (message: unknown, ...meta: unknown[]) => {
                if (shouldLog('debug')) write('debug', message, meta);
            },
        };
    }

    private flushBatch(items: BatchItem[], consumerName?: string) {
        if (!items.length) return;

        for (const { level, message } of items) {
            const metaObj = {
                ...(consumerName ? { consumer: consumerName } : {}),
            };
            this.baseLogger[level](message as any, metaObj);
        }
    }

    private shouldBatch(): boolean {
        return this.config.enableFileTransport === true;
    }
}
