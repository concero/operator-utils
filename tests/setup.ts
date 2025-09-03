// Jest test setup file
// This file runs before all test files and sets up the environment

// Set required environment variables for tests
process.env.OPERATOR_PRIVATE_KEY = 'a'.repeat(64); // Mock private key for tests
process.env.NETWORK_MODE = 'testnet';

// Optional environment variables with sensible test defaults
process.env.LOGGER_LOG_LEVEL_DEFAULT = 'error'; // Reduce noise in tests
process.env.LOGGER_ENABLE_CONSOLE_TRANSPORT = 'false';
process.env.LOGGER_ENABLE_FILE_TRANSPORT = 'false';
process.env.HTTPCLIENT_DEFAULT_TIMEOUT = '5000';
process.env.VIEM_CLIENT_MANAGER_HTTP_TRANSPORT_TIMEOUT = '5000';
process.env.NETWORK_MANAGER_POLLING_INTERVAL_MS = '60000';
process.env.BLOCK_MANAGER_POLLING_INTERVAL_MS = '5000';
process.env.BALANCE_MANAGER_POLLING_INTERVAL_MS = '100000';
process.env.TX_WRITER_SIMULATE_TX = 'false';
process.env.TX_WRITER_DRY_RUN = 'false';
process.env.TX_MONITOR_MAX_INCLUSION_WAIT = '300000';
process.env.TX_MONITOR_MAX_FINALITY_WAIT = '600000';

// Mock URLs for testing
process.env.DEPLOYMENT_MANAGER_DEPLOYMENTS_URL = 'http://test-deployments.com';
process.env.RPC_MANAGER_CONCERO_RPCS_URL = 'http://test-rpcs.com';
process.env.NETWORK_MANAGER_MAINNET_URL = 'http://test-mainnet.com';
process.env.NETWORK_MANAGER_TESTNET_URL = 'http://test-testnet.com';

// Mock global config to prevent module loading issues
jest.mock('@/constants/globalConfig', () => ({
    globalConfig: {
        LOGGER: {
            logLevelDefault: 'error',
            logLevelsGranular: {},
            logDir: 'logs',
            logMaxFiles: '7d',
            logMaxSize: '20m',
            enableConsoleTransport: false,
            enableFileTransport: false,
            batchFlushIntervalMs: 1000,
            batchMaxItems: 100,
            batchMaxBytes: 1048576,
        },
        HTTPCLIENT: {
            defaultTimeout: 5000,
            maxRetries: 3,
            retryDelay: 100,
        },
        VIEM_CLIENT_MANAGER: {
            operatorPrivateKey: 'a'.repeat(64),
            httpTransportConfig: {
                timeout: 5000,
                batch: true,
                retryCount: 5,
                retryDelay: 100,
            },
            fallbackTransportOptions: {
                retryCount: 5,
                retryDelay: 150,
            },
        },
        DEPLOYMENT_MANAGER: {
            networkMode: 'testnet',
            conceroDeploymentsUrl: 'http://test-deployments.com',
        },
        RPC_MANAGER: {
            networkMode: 'testnet',
            rpcOverrides: {},
            rpcExtensions: {},
            conceroRpcsUrl: 'http://test-rpcs.com',
        },
        NETWORK_MANAGER: {
            networkMode: 'testnet',
            operatorPrivateKey: 'a'.repeat(64),
            pollingIntervalMs: 60000,
            ignoredNetworkIds: [],
            whitelistedNetworkIds: { mainnet: [], testnet: [], localhost: [] },
            defaultFinalityConfirmations: 12,
            mainnetUrl: 'http://test-mainnet.com',
            testnetUrl: 'http://test-testnet.com',
        },
        BLOCK_MANAGER: {
            pollingIntervalMs: 5000,
            catchupBatchSize: 500n,
        },
        BALANCE_MANAGER: {
            pollingIntervalMs: 100000,
            minAllowances: {},
        },
        TX_WRITER: {
            simulateTx: false,
            dryRun: false,
            defaultGasLimit: 2000000n,
        },
        TX_MONITOR: {
            maxInclusionWait: 300000,
            maxFinalityWait: 600000,
        },
    },
}));

// Mock utility functions that are commonly used
jest.mock('@/utils/getGranularLogLevels', () => ({
    getGranularLogLevels: jest.fn().mockReturnValue({}),
}));

jest.mock('@/utils/safeRequireJson', () => ({
    safeRequireJson: jest.fn().mockReturnValue({}),
}));
