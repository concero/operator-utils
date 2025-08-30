/** Base configuration interface for all managers */
export interface BaseManagerConfig {
}
/** Configuration for BlockManager */
export interface BlockManagerConfig extends BaseManagerConfig {
    pollingIntervalMs: number;
    catchupBatchSize: bigint;
    useCheckpoints: boolean;
}
/** Configuration for NetworkManager */
export interface NetworkManagerConfig extends BaseManagerConfig {
    networkMode: 'mainnet' | 'testnet' | 'localhost';
    ignoredNetworkIds: number[];
    whitelistedNetworkIds: {
        mainnet: number[];
        testnet: number[];
        localhost: number[];
    };
    defaultConfirmations: number;
    defaultFinalityConfirmations: number;
    mainnetUrl: string;
    testnetUrl: string;
}
/** Configuration for RpcManager */
export interface RpcManagerConfig extends BaseManagerConfig {
    rpcOverrides: Record<string, string[]>;
    rpcExtensions: Record<string, string[]>;
    conceroRpcsUrl: string;
    networkMode: 'mainnet' | 'testnet' | 'localhost';
}
/** Configuration for DeploymentManager */
export interface DeploymentManagerConfig extends BaseManagerConfig {
    conceroDeploymentsUrl: string;
    networkMode: 'mainnet' | 'testnet' | 'localhost';
}
/** Configuration for TxWriter */
export interface TxWriterConfig extends BaseManagerConfig {
    dryRun: boolean;
    simulateTx: boolean;
    defaultGasLimit?: bigint;
    txReceiptOptions: {
        confirmations?: number;
        retryCount?: number;
        retryDelay?: number;
        timeout?: number;
    };
}
/** Configuration for TxMonitor */
export interface TxMonitorConfig extends BaseManagerConfig {
    maxInclusionWait?: number;
    maxFinalityWait?: number;
}
/** Configuration for NonceManager */
export interface NonceManagerConfig extends BaseManagerConfig {
}
/** Configuration for TxReader */
export interface TxReaderConfig extends BaseManagerConfig {
    watcherIntervalMs?: number;
}
/** Configuration for BlockManagerRegistry */
export interface BlockManagerRegistryConfig extends BaseManagerConfig {
    blockManagerConfig: BlockManagerConfig;
}
/** Configuration for ViemClientManager */
export interface ViemClientManagerConfig extends BaseManagerConfig {
    fallbackTransportOptions: {
        rank?: boolean | {
            interval?: number;
            sampleCount?: number;
            staleThreshold?: number;
            weight?: number;
        };
        retryCount?: number;
        retryDelay?: number;
        timeout?: number;
    };
    httpTransportConfig: {
        timeout: number;
        batch: boolean;
        retryCount: number;
        retryDelay: number;
    };
}
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LoggerInterface {
    error(message: unknown, ...meta: unknown[]): void;
    warn(message: unknown, ...meta: unknown[]): void;
    info(message: unknown, ...meta: unknown[]): void;
    debug(message: unknown, ...meta: unknown[]): void;
}
/** Configuration for Logger */
export interface LoggerConfig extends BaseManagerConfig {
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
/** Configuration for HttpClient */
export interface HttpClientConfig extends BaseManagerConfig {
    retryDelay: number;
    maxRetries: number;
    defaultTimeout: number;
}
//# sourceMappingURL=ManagerConfigs.d.ts.map