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
    networkMode: "mainnet" | "testnet" | "localhost";
    ignoredNetworkIds: number[];
    whitelistedNetworkIds: {
        mainnet: number[];
        testnet: number[];
        localhost: number[];
    };
    defaultConfirmations: number;
    mainnetUrl: string;
    testnetUrl: string;
}
/** Configuration for RpcManager */
export interface RpcManagerConfig extends BaseManagerConfig {
    rpcOverrides: Record<string, string[]>;
    rpcExtensions: Record<string, string[]>;
    conceroRpcsUrl: string;
    networkMode: "mainnet" | "testnet" | "localhost";
}
/** Configuration for DeploymentManager */
export interface DeploymentManagerConfig extends BaseManagerConfig {
    conceroDeploymentsUrl: string;
    networkMode: "mainnet" | "testnet" | "localhost";
}
/** Configuration for TxWriter */
export interface TxWriterConfig extends BaseManagerConfig {
    dryRun: boolean;
    simulateTx: boolean;
    defaultGasLimit?: bigint;
}
/** Configuration for TxMonitor */
export interface TxMonitorConfig extends BaseManagerConfig {
    checkIntervalMs?: number;
    dropTimeoutMs?: number;
    retryDelayMs?: number;
}
/** Configuration for NonceManager */
export interface NonceManagerConfig extends BaseManagerConfig {
}
/** Configuration for TxReader */
export interface TxReaderConfig extends BaseManagerConfig {
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
}
/** Configuration for Logger */
export interface LoggerConfig extends BaseManagerConfig {
    logDir: string;
    logMaxSize: string;
    logMaxFiles: string | number;
    logLevelDefault: string;
    logLevelsGranular: Record<string, string>;
    enableConsoleTransport?: boolean;
}
/** Configuration for HttpClient */
export interface HttpClientConfig extends BaseManagerConfig {
    retryDelay: number;
    maxRetries: number;
    defaultTimeout: number;
}
//# sourceMappingURL=ManagerConfigs.d.ts.map