# Operator Utils

A comprehensive utility library for blockchain operator services, providing managers and utilities for blocks, deployments, networks, RPC, and Viem clients.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Managers](#managers)
  - [Utilities](#utilities)
  - [Types](#types)
  - [Constants](#constants)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install @operator/utils
```

or

```bash
yarn add @operator/utils
```

or

```bash
bun add @operator/utils
```

## Features

- **Block Management**: Track and manage blockchain blocks with checkpoint support
- **Network Management**: Handle multiple blockchain networks dynamically
- **RPC Management**: Manage RPC endpoints with automatic failover
- **Viem Client Management**: Create and manage Viem clients for blockchain interactions
- **Nonce Management**: Thread-safe nonce management for transaction handling
- **Deployment Management**: Track and manage smart contract deployments
- **Logging**: Built-in Winston logger with daily rotation support
- **Error Handling**: Comprehensive error handling with operational/non-operational error distinction
- **HTTP Client**: Axios-based HTTP client with retry logic

## Quick Start

```typescript
import { 
  NetworkManager, 
  RpcManager, 
  ViemClientManager, 
  Logger,
  AppError,
  AppErrorEnum 
} from '@operator/utils';

// Initialize logger
const logger = Logger.getInstance({
  debugMode: true,
  logDir: './logs'
});

// Initialize managers
const networkManager = NetworkManager.createInstance(logger, {
  networksUrl: 'https://api.example.com/networks'
});

const rpcManager = RpcManager.createInstance(logger, {
  rpcUrls: {
    1: ['https://eth.rpc.example.com'],
    137: ['https://polygon.rpc.example.com']
  }
});

const viemClientManager = ViemClientManager.createInstance(
  logger,
  networkManager,
  rpcManager
);

// Use the managers
const client = viemClientManager.getClient(1); // Get Ethereum mainnet client
```

## API Reference

### Managers

#### NetworkManager

Manages blockchain network configurations.

```typescript
interface NetworkManagerConfig {
  networksUrl: string;
  updateIntervalMs?: number;
}

// Create instance
const networkManager = NetworkManager.createInstance(logger, config);

// Get network
const network = networkManager.getNetwork(1);

// Add listener for network updates
networkManager.addListener((networks) => {
  console.log('Networks updated:', networks);
});
```

#### RpcManager

Manages RPC endpoints with health checking and failover.

```typescript
interface RpcManagerConfig {
  rpcUrls: Record<number, string[]>;
  healthCheckIntervalMs?: number;
}

// Create instance
const rpcManager = RpcManager.createInstance(logger, config);

// Get active RPC URL
const rpcUrl = rpcManager.getActiveRpcUrl(1);

// Add listener for RPC updates
rpcManager.addListener((chainId, rpcUrl) => {
  console.log(`RPC updated for chain ${chainId}: ${rpcUrl}`);
});
```

#### ViemClientManager

Creates and manages Viem public clients.

```typescript
// Create instance
const viemClientManager = ViemClientManager.createInstance(
  logger,
  networkManager,
  rpcManager
);

// Get client
const client = viemClientManager.getClient(1);

// Use client
const blockNumber = await client.getBlockNumber();
```

#### BlockManager

Manages block tracking and checkpoints.

```typescript
interface BlockManagerConfig {
  chainId: number;
  checkpointManager?: IBlockCheckpointManager;
}

// Create instance
const blockManager = new BlockManager(logger, config);

// Get current block
const currentBlock = await blockManager.getCurrentBlock();

// Set block
await blockManager.setCurrentBlock(12345678n);
```

#### NonceManager

Thread-safe nonce management for transactions.

```typescript
// Create instance
const nonceManager = NonceManager.createInstance(logger, {});

// Get nonce
const nonce = await nonceManager.get({
  chainId: 1,
  address: '0x...',
  client: viemClient
});

// Consume nonce (get and increment)
const nonce = await nonceManager.consume({
  chainId: 1,
  address: '0x...',
  client: viemClient
});
```

#### DeploymentManager

Manages smart contract deployments.

```typescript
interface DeploymentManagerConfig {
  deploymentsUrl: string;
  cacheTtlMs?: number;
}

// Create instance
const deploymentManager = DeploymentManager.createInstance(logger, config);

// Get deployment
const deployment = await deploymentManager.getDeployment('MyContract', 1);
```

### Utilities

#### Logger

Winston-based logger with daily rotation.

```typescript
interface LoggerConfig {
  debugMode: boolean;
  logDir?: string;
  maxFiles?: string;
  maxSize?: string;
}

// Get instance
const logger = Logger.getInstance(config);

// Log messages
logger.info('Information message');
logger.error('Error message', { error: new Error('Something went wrong') });
logger.debug('Debug message');
```

#### HttpClient

Axios wrapper with built-in retry logic.

```typescript
// Create instance
const httpClient = new HttpClient(logger, {
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retries: 3
});

// Make requests
const data = await httpClient.get('/endpoint');
await httpClient.post('/endpoint', { data: 'value' });
```

#### AppError

Custom error class with operational/non-operational distinction.

```typescript
import { AppError, AppErrorEnum } from '@operator/utils';

// Throw operational error
throw new AppError(AppErrorEnum.NETWORK_NOT_FOUND);

// Throw with original error
try {
  // some operation
} catch (error) {
  throw new AppError(AppErrorEnum.RPC_ERROR, error);
}
```

### Types

The library exports comprehensive TypeScript types for all managers and utilities:

```typescript
import type {
  INetworkManager,
  IRpcManager,
  IViemClientManager,
  IBlockManager,
  INonceManager,
  IDeploymentManager,
  NetworkUpdateListener,
  RpcUpdateListener,
  ConceroNetwork,
  ChainDefinition,
  // ... and more
} from '@operator/utils';
```

### Constants

#### AppErrorEnum

Enumeration of all possible application errors:

```typescript
export enum AppErrorEnum {
  NETWORK_NOT_FOUND = 'NETWORK_NOT_FOUND',
  RPC_ERROR = 'RPC_ERROR',
  DEPLOYMENT_NOT_FOUND = 'DEPLOYMENT_NOT_FOUND',
  // ... more error types
}
```

## Usage Examples

### Complete Integration Example

```typescript
import {
  NetworkManager,
  RpcManager,
  ViemClientManager,
  BlockManager,
  NonceManager,
  Logger,
  AppError,
  AppErrorEnum
} from '@operator/utils';

async function setupOperator() {
  // Initialize logger
  const logger = Logger.getInstance({
    debugMode: process.env.NODE_ENV !== 'production',
    logDir: './logs'
  });

  try {
    // Initialize network manager
    const networkManager = NetworkManager.createInstance(logger, {
      networksUrl: process.env.NETWORKS_URL!
    });

    // Initialize RPC manager
    const rpcManager = RpcManager.createInstance(logger, {
      rpcUrls: {
        1: [process.env.ETH_RPC_URL!],
        137: [process.env.POLYGON_RPC_URL!]
      }
    });

    // Initialize Viem client manager
    const viemClientManager = ViemClientManager.createInstance(
      logger,
      networkManager,
      rpcManager
    );

    // Initialize nonce manager
    const nonceManager = NonceManager.createInstance(logger, {});

    // Example: Get block number on Ethereum
    const ethClient = viemClientManager.getClient(1);
    const blockNumber = await ethClient.getBlockNumber();
    logger.info('Current Ethereum block:', { blockNumber });

    // Example: Send transaction with managed nonce
    const nonce = await nonceManager.consume({
      chainId: 1,
      address: '0x...',
      client: ethClient
    });

    // Use nonce in transaction...

  } catch (error) {
    if (error instanceof AppError) {
      logger.error('Operational error:', { error });
    } else {
      logger.error('Unexpected error:', { error });
      process.exit(1);
    }
  }
}
```

### Custom Chain Configuration

```typescript
import { createViemChain, type ChainDefinition } from '@operator/utils';

const customChain: ChainDefinition = {
  id: 12345,
  name: 'Custom Chain',
  rpcUrls: ['https://custom-chain.example.com'],
  blockExplorer: {
    name: 'Custom Explorer',
    url: 'https://explorer.custom-chain.example.com'
  },
  isTestnet: true
};

const chain = createViemChain(customChain);
```

### Environment Variable Management

```typescript
import { getEnvVar } from '@operator/utils';

// Will throw if not found
const apiKey = getEnvVar('API_KEY');

// With default value
const port = process.env.PORT || '3000';
```

## Configuration

### Environment Variables

The library uses the following environment variables:

- `NODE_ENV` - Set to 'production' for production mode
- `LOG_DIR` - Directory for log files (default: './logs')
- `DEBUG_MODE` - Enable debug logging (default: false in production)

### Manager Configurations

Each manager accepts a configuration object during initialization. See the API Reference section for detailed configuration options.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
bun install

# Run type checking
bun run typecheck

# Run linting
bun run lint

# Format code
bun run format

# Build the library
bun run build
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.