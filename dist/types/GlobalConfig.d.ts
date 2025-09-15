import { NetworkType } from '../types/ConceroNetwork';
import { BalanceManagerConfig } from './managers/IBalanceManager';
import { BlockManagerConfig } from './managers/IBlockManager';
import { NetworkManagerConfig } from './managers/IConceroNetworkManager';
import { DeploymentManagerConfig } from './managers/IDeploymentFetcher';
import { HttpClientConfig } from './managers/IHttpClient';
import { LoggerConfig } from './managers/ILogger';
import { RpcManagerConfig } from './managers/IRpcManager';
import { TxMonitorConfig } from './managers/ITxMonitor';
import { TxReaderConfig } from './managers/ITxReader';
import { TxWriterConfig } from './managers/ITxWriter';
import { ViemClientManagerConfig } from './managers/IViemClientManager';
type GlobalConfig = {
    NETWORK_MODE: NetworkType;
    OPERATOR_PRIVATE_KEY: string;
    LOGGER: LoggerConfig;
    HTTPCLIENT: HttpClientConfig;
    VIEM_CLIENT_MANAGER: ViemClientManagerConfig;
    DEPLOYMENT_MANAGER: DeploymentManagerConfig;
    RPC_MANAGER: RpcManagerConfig;
    NETWORK_MANAGER: NetworkManagerConfig;
    BLOCK_MANAGER: BlockManagerConfig;
    BALANCE_MANAGER: BalanceManagerConfig;
    TX_READER: TxReaderConfig;
    TX_WRITER: TxWriterConfig;
    TX_MONITOR: TxMonitorConfig;
};
export default GlobalConfig;
//# sourceMappingURL=GlobalConfig.d.ts.map