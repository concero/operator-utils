export interface LoggerInterface {
    error(message: any, ...meta: any[]): void;

    warn(message: any, ...meta: any[]): void;

    info(message: any, ...meta: any[]): void;

    debug(message: any, ...meta: any[]): void;
}
