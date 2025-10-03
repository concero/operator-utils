import { inspect } from 'node:util';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

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
    logMaxSize: string; // e.g. "20m"
    logMaxFiles: string; // e.g. "14d"
    batchFlushIntervalMs: number;
    batchMaxItems: number;
    batchMaxBytes: number;
    logLevelsGranular: Record<string, LogLevel>; // per-consumer threshold
    logLevelDefault: LogLevel; // default threshold for consumers
}

type BatchItem = { level: LogLevel; message: unknown; meta: Record<string, unknown> };

class FileBatcher {
    private buffer: BatchItem[] = [];
    private approxBytes = 0;
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly flushFn: (items: BatchItem[]) => void,
        private readonly intervalMs: number,
        private readonly maxItems: number,
        private readonly maxBytes: number,
    ) {}

    enqueue(item: BatchItem) {
        this.buffer.push(item);
        this.approxBytes += this.estimate(item);

        if (this.buffer.length >= this.maxItems || this.approxBytes >= this.maxBytes) {
            this.flushNow();
            return;
        }

        if (!this.timer) {
            this.timer = setTimeout(() => this.flushNow(), this.intervalMs);
            this.timer.unref?.();
        }
    }

    flushNow() {
        if (this.buffer.length === 0) return;
        const batch = this.buffer;
        this.buffer = [];
        this.approxBytes = 0;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        this.flushFn(batch);
    }

    private estimate(item: BatchItem): number {
        const msgCost = typeof item.message === 'string' ? Buffer.byteLength(item.message) : 128;
        const metaCost = 64 + Object.keys(item.meta ?? {}).length * 32;
        return msgCost + metaCost + 16;
    }
}

export class Logger {
    private static instance?: Logger;

    private readonly consoleLogger: winston.Logger;
    private readonly fileLogger?: winston.Logger;
    private readonly batchers = new Map<string, FileBatcher>();

    private constructor(private readonly config: LoggerConfig) {
        this.consoleLogger = this.createConsoleLogger();
        this.fileLogger = this.config.enableFileTransport ? this.createFileLogger() : undefined;
    }

    static createInstance(cfg: LoggerConfig): Logger {
        if (!Logger.instance) Logger.instance = new Logger(cfg);
        return Logger.instance;
    }

    static getInstance(): Logger {
        if (!Logger.instance)
            throw new Error('Logger not initialized. Call createInstance() first.');
        return Logger.instance;
    }

    getLogger(consumer?: string): LoggerInterface {
        const name = consumer ?? 'default';

        if (this.fileLogger && !this.batchers.has(name)) {
            this.batchers.set(
                name,
                new FileBatcher(
                    items => this.flushFileBatch(items),
                    this.config.batchFlushIntervalMs,
                    this.config.batchMaxItems,
                    this.config.batchMaxBytes,
                ),
            );
        }

        const shouldLog = (candidate: LogLevel) => {
            const threshold = this.config.logLevelsGranular[name] ?? this.config.logLevelDefault;
            return this.lte(threshold, candidate);
        };

        const write = (lvl: LogLevel, message: unknown, meta?: Record<string, unknown>) => {
            const fullMeta = { consumer: consumer ?? undefined, ...(meta ?? {}) };

            if (this.config.enableConsoleTransport) {
                this.consoleLogger.log({ level: lvl, message, ...fullMeta });
            }

            if (this.fileLogger) {
                if (lvl === 'error') {
                    this.fileLogger.log({ level: lvl, message, ...fullMeta });
                } else {
                    this.batchers.get(name)!.enqueue({ level: lvl, message, meta: fullMeta });
                }
            }
        };

        return {
            error: (msg, meta) => write('error', msg, meta),
            warn: (msg, meta) => {
                if (shouldLog('warn')) write('warn', msg, meta);
            },
            info: (msg, meta) => {
                if (shouldLog('info')) write('info', msg, meta);
            },
            debug: (msg, meta) => {
                if (shouldLog('debug')) write('debug', msg, meta);
            },
        };
    }

    flushBatches(): void {
        this.batchers.forEach(b => b.flushNow());
    }

    close(): void {
        this.flushBatches();
        if (this.fileLogger) {
            for (const t of this.fileLogger.transports) (t as any).close?.();
        }
        for (const t of this.consoleLogger.transports) (t as any).close?.();
    }

    // ---- internals ----

    private lte(threshold: LogLevel, candidate: LogLevel): boolean {
        const order: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
        return order[candidate] <= order[threshold];
    }

    private createConsoleLogger(): winston.Logger {
        const fmt = winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp({ format: 'MM-DD HH:mm:ss' }),
            winston.format.colorize({ level: true }),
            winston.format.splat(),
            winston.format.printf(info => {
                const { timestamp, level, message, consumer } = info as any;

                // Format main message
                const text =
                    message instanceof Error
                        ? `${message.name}: ${message.message}`
                        : typeof message === 'string'
                          ? message
                          : inspect(message, { depth: 1, breakLength: 120 });

                // Pick a single error-like meta if present (common keys: error/err)
                const errLike = (info as any).error ?? (info as any).err;
                const errSuffix =
                    errLike instanceof Error ? ` ${errLike.name}: ${errLike.message}` : '';

                const prefix = consumer ? `${consumer}: ` : '';

                // Final line (no meta dump, no Symbols)
                return `${timestamp} ${level} ${prefix}${text}${errSuffix}`;
            }),
        );

        return winston.createLogger({
            level: 'debug',
            exitOnError: false,
            transports: this.config.enableConsoleTransport
                ? [
                      new winston.transports.Console({
                          level: 'debug',
                          format: fmt,
                      }),
                  ]
                : [],
            // Keep handlers; they will also print in the same concise shape
            exceptionHandlers: this.config.enableConsoleTransport
                ? [new winston.transports.Console({ format: fmt })]
                : [],
            rejectionHandlers: this.config.enableConsoleTransport
                ? [new winston.transports.Console({ format: fmt })]
                : [],
        });
    }

    private createFileLogger(): winston.Logger {
        const common = {
            dirname: this.config.logDir,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: this.config.logMaxSize,
            maxFiles: this.config.logMaxFiles,
            createSymlink: true,
            symlinkName: 'current.log',
        };

        const all = new DailyRotateFile({ filename: 'log-%DATE%.log', level: 'debug', ...common });
        const err = new DailyRotateFile({
            filename: 'error-%DATE%.log',
            level: 'error',
            ...common,
        });

        all.on('error', e =>
            this.consoleLogger.log({ level: 'error', message: 'file transport error', err: e }),
        );
        err.on('error', e =>
            this.consoleLogger.log({ level: 'error', message: 'file transport error', err: e }),
        );

        const bigintSafe = winston.format(info => {
            const normalize = (v: any): any => {
                if (typeof v === 'bigint') return `${v}n`;
                if (Array.isArray(v)) return v.map(normalize);
                if (v && typeof v === 'object') {
                    for (const k of Object.keys(v)) (v as any)[k] = normalize((v as any)[k]);
                }
                return v;
            };
            normalize(info);
            return info;
        });

        const fmt = winston.format.combine(
            winston.format.errors({ stack: true }),
            bigintSafe(),
            winston.format.timestamp(),
            winston.format.json(),
        );

        return winston.createLogger({
            level: 'debug',
            format: fmt,
            exitOnError: false,
            transports: [all, err],
            exceptionHandlers: [
                new DailyRotateFile({ filename: 'exceptions-%DATE%.log', ...common }),
            ],
            rejectionHandlers: [
                new DailyRotateFile({ filename: 'rejections-%DATE%.log', ...common }),
            ],
        });
    }

    private flushFileBatch(items: BatchItem[]) {
        if (!this.fileLogger || items.length === 0) return;
        for (const i of items) {
            this.fileLogger.log({ level: i.level, message: i.message, ...i.meta });
        }
    }
}
