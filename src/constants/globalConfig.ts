import { getEnvBigint, getEnvBool, getEnvInt, getEnvString } from '../utils/getEnvVars';

import { GlobalConfig } from '@/types';
import { getGranularLogLevels, safeRequireJson } from '@/utils';
import { min, sec } from '@/utils/time';

const networkMode = getEnvString('NETWORK_MODE', 'testnet');
const operatorPrivateKey = getEnvString('OPERATOR_PRIVATE_KEY');

const globalConfig: GlobalConfig = {
    NETWORK_MODE: networkMode,
    OPERATOR_PRIVATE_KEY: operatorPrivateKey,
    LOGGER: {
        logLevelDefault: getEnvString('LOGGER_LOG_LEVEL_DEFAULT', 'info'),
        logLevelsGranular: getGranularLogLevels(),
        logDir: getEnvString('LOGGER_LOG_DIR', 'logs'),
        logMaxFiles: getEnvString('LOGGER_LOG_MAX_FILES', '7d'),
        logMaxSize: getEnvString('LOGGER_LOG_MAX_SIZE', '20m'),
        enableConsoleTransport: getEnvBool('LOGGER_ENABLE_CONSOLE_TRANSPORT', true),
        enableFileTransport: getEnvBool('LOGGER_ENABLE_FILE_TRANSPORT', true),
        batchFlushIntervalMs: getEnvInt('LOGGER_BATCH_FLUSH_INTERVAL_MS', 1000),
        batchMaxItems: getEnvInt('LOGGER_BATCH_MAX_ITEMS', 100),
        batchMaxBytes: getEnvInt('LOGGER_BATCH_MAX_BYTES', 1 * 1024 * 1024), // 1MB
    },
    HTTPCLIENT: {
        defaultTimeout: getEnvInt('HTTPCLIENT_DEFAULT_TIMEOUT', sec(5)),
        maxRetries: getEnvInt('HTTPCLIENT_MAX_RETRIES', 3),
        retryDelay: getEnvInt('HTTPCLIENT_RETRY_DELAY', 100),
    },
    VIEM_CLIENT_MANAGER: {
        operatorPrivateKey,
        httpTransportConfig: {
            timeout: getEnvInt('VIEM_CLIENT_MANAGER_HTTP_TRANSPORT_TIMEOUT', sec(5)),
            batch: getEnvBool('VIEM_CLIENT_MANAGER_HTTP_TRANSPORT_BATCH', true),
            retryCount: getEnvInt('VIEM_CLIENT_MANAGER_HTTP_TRANSPORT_RETRY_COUNT', 1),
            retryDelay: getEnvInt('VIEM_CLIENT_MANAGER_HTTP_TRANSPORT_RETRY_DELAY', 150),
        },
        fallbackTransportOptions: {
            retryCount: getEnvInt('VIEM_CLIENT_MANAGER_FALLBACK_TRANSPORT_RETRY_COUNT', 3),
            retryDelay: getEnvInt('VIEM_CLIENT_MANAGER_FALLBACK_TRANSPORT_RETRY_DELAY', sec(2)),
        },
    },
    DEPLOYMENT_MANAGER: {
        networkMode,
        conceroDeploymentsUrl: getEnvString(
            'DEPLOYMENT_MANAGER_DEPLOYMENTS_URL',
            `https://raw.githubusercontent.com/concero/v2-contracts/refs/heads/${getEnvString('DEPLOYMENT_MANAGER_DEPLOYMENTS_URL_GIT_BRANCH', 'master')}/.env.deployments.${
                networkMode === 'localhost' || networkMode === 'testnet' ? 'testnet' : 'mainnet'
            }`,
        ),
    },
    RPC_MANAGER: {
        networkMode,
        rpcOverrides: safeRequireJson('../../rpc.overrides.json'),
        rpcExtensions: safeRequireJson('../../rpc.extensions.json'),
        conceroRpcsUrl: getEnvString(
            'RPC_MANAGER_CONCERO_RPCS_URL',
            `https://raw.githubusercontent.com/concero/rpcs/refs/heads/${getEnvString('RPC_MANAGER_CONCERO_RPCS_URL_GIT_BRANCH', 'master')}/output`,
        ),
    },
    NETWORK_MANAGER: {
        networkMode,
        operatorPrivateKey,
        pollingIntervalMs: getEnvInt('NETWORK_MANAGER_POLLING_INTERVAL_MS', min(60)),
        ignoredNetworkIds: [],
        whitelistedNetworkIds: {
            mainnet: [],
            testnet: [],
            localhost: [
                /* 1 */
            ],
        },
        defaultFinalityConfirmations: getEnvInt(
            'NETWORK_MANAGER_DEFAULT_FINALITY_CONFIRMATIONS',
            12,
        ),
        mainnetUrl: getEnvString(
            'NETWORK_MANAGER_MAINNET_URL',
            'https://github.com/concero/v2-networks/raw/refs/heads/master/networks/mainnet.json',
        ),
        testnetUrl: getEnvString(
            'NETWORK_MANAGER_TESTNET_URL',
            'https://github.com/concero/v2-networks/raw/refs/heads/master/networks/testnet.json',
        ),
    },
    BLOCK_MANAGER: {
        pollingIntervalMs: getEnvInt('BLOCK_MANAGER_POLLING_INTERVAL_MS', sec(5)),
        catchupBatchSize: getEnvBigint('BLOCK_MANAGER_CATCHUP_BATCH_SIZE', 500n),
        useCheckpoints: getEnvBool('BLOCK_MANAGER_USE_CHECKPOINTS', false),
    },
    BALANCE_MANAGER: {
        pollingIntervalMs: getEnvInt('BALANCE_MANAGER_POLLING_INTERVAL_MS', min(10)),
        minAllowances: undefined,
    },
    TX_WRITER: {
        simulateTx: getEnvBool('TX_WRITER_SIMULATE_TX', false),
        dryRun: getEnvBool('TX_WRITER_DRY_RUN', false),
        defaultGasLimit: getEnvBigint('TX_WRITER_GAS_LIMIT_DEFAULT', 2_000_000n),
        maxCallbackRetries: getEnvInt('TX_WRITER_MAX_CALLBACK_RETRIES', 3),
    },
    TX_READER: {
        pollingIntervalMs: getEnvInt('TX_READER_POLLING_INTERVAL_MS', sec(10)),
    },
    TX_MONITOR: {
        maxInclusionWait: getEnvInt('TX_MONITOR_MAX_INCLUSION_WAIT', min(5)), // 5 minutes default
        maxFinalityWait: getEnvInt('TX_MONITOR_MAX_FINALITY_WAIT', min(15)), // 10 minutes default
    },
};

export { globalConfig };
