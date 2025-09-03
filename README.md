# Concero Operator Utils

A comprehensive TypeScript utility library for blockchain operator services, providing production-ready managers for transaction processing, balance monitoring, network management, and blockchain interactions across multiple networks.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Manager Documentation](#manager-documentation)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Development](#development)
- [TypeScript Support](#typescript-support)

## Installation

```bash
npm install @concero/operator-utils
```

```bash
yarn add @concero/operator-utils
```

```bash
bun add @concero/operator-utils
```

## Features

- **Transaction Lifecycle Management**: Complete transaction monitoring, reading, and writing with automatic retry mechanisms
- **Multi-Network Balance Monitoring**: Real-time token and native balance tracking across networks
- **Block Management**: Advanced block tracking with checkpoint support and registry management
- **Network & RPC Management**: Dynamic network configuration with automatic failover
- **Nonce Management**: Thread-safe transaction nonce handling
- **Deployment Management**: Smart contract deployment tracking and resolution
- **Production-Ready Logging**: Winston-based logging with daily rotation and granular log levels
- **Error Handling**: Comprehensive operational error handling with retry mechanisms
- **TypeScript First**: Full TypeScript support with comprehensive type definitions

## Architecture Overview

The library follows a manager-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Managers                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│ BalanceManager  │ TxMonitor       │ BlockManagerRegistry    │
│ TxReader        │ TxWriter        │ BlockManager           │
│ ConceroNetwork  │ RpcManager      │ ViemClientManager      │
│ NonceManager    │ Deployment      │                        │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Shared Utilities                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Logger          │ HttpClient      │ AppError               │
│ createViemChain │ asyncRetry      │ Contract Utilities     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Quick Start

```typescript
import {
  ConceroNetworkManager,
  RpcManager,
  ViemClientManager,
  BalanceManager,
  TxMonitor,
  TxReader,
  TxWriter,
  NonceManager,
  BlockManagerRegistry,
  Logger
} from '@concero/operator-utils'

// Initialize logger
const logger = Logger.getInstance({
  debugMode: process.env.NODE_ENV !== 'production',
  logDir: './logs'
})

// Initialize core managers
const networkManager = ConceroNetworkManager.createInstance(logger, {
  networksUrl: 'https://api.example.com/networks'
})

const rpcManager = RpcManager.createInstance(logger, {
  rpcUrls: {
    1: ['https://eth.rpc.example.com'],
    137: ['https://polygon.rpc.example.com']
  }
})

const viemClientManager = ViemClientManager.createInstance(
  logger,
  networkManager,
  rpcManager
)

// Initialize transaction managers
const txMonitor = TxMonitor.createInstance(logger)
const txReader = TxReader.createInstance(logger, networkManager, viemClientManager)
const txWriter = TxWriter.createInstance(logger, viemClientManager, txMonitor)
const nonceManager = NonceManager.createInstance(logger, {})

// Initialize balance and block managers
const balanceManager = BalanceManager.createInstance(logger, txReader)
const blockManagerRegistry = BlockManagerRegistry.createInstance(logger, {
  pollingIntervalMs: 5000,
  useCheckpoints: true
})

// Example: Monitor ETH balance on Ethereum
await balanceManager.beginWatching({
  chainId: 1,
  address: '0x1234...',
  tokens: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'] // WETH
})

// Example: Send a transaction
const txHash = await txWriter.callContract({
  chainId: 1,
  contractAddress: '0x...',
  abi: [...],
  functionName: 'transfer',
  args: ['0xRecipient', 1000n],
  account: '0xSender'
})
```

## Manager Documentation

### Transaction Management

#### TxMonitor
Monitors transaction finality with automatic retry capabilities.

```typescript
const txMonitor = TxMonitor.createInstance(logger, {
  checkIntervalMs: 5000,
  retryDelayMs: 30000,
  dropTimeoutMs: 60000
})

// Monitor transaction
await txMonitor.watchTxFinality({
  chainId: 1,
  txHash: '0x...',
  onFinalized: (receipt) => console.log('Transaction finalized:', receipt),
  onRetry: (attempt) => console.log('Retry attempt:', attempt)
})
```

#### TxReader
Provides blockchain data reading with configurable watchers.

```typescript
const txReader = TxReader.createInstance(logger, networkManager, viemClientManager)

// Query logs
const logs = await txReader.getLogs({
  chainId: 1,
  address: '0x...',
  event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
  fromBlock: 19000000n,
  toBlock: 'latest'
})

// Create event watcher
const watcher = txReader.logWatcher.create({
  chainId: 1,
  address: '0x...',
  event: 'Transfer',
  callback: (log) => console.log('Transfer detected:', log)
})
```

#### TxWriter
Handles smart contract interactions with integrated monitoring.

```typescript
const txWriter = TxWriter.createInstance(logger, viemClientManager, txMonitor, nonceManager)

// Execute contract call
const txHash = await txWriter.callContract({
  chainId: 137,
  contractAddress: '0x...',
  abi: [...],
  functionName: 'swap',
  args: [tokenIn, tokenOut, amountIn, amountOutMin],
  account: '0x...',
  simulate: true // Simulate before execution
})
```

### Balance Management

#### BalanceManager
Monitors token and native balances across networks.

```typescript
const balanceManager = BalanceManager.createInstance(logger, txReader, {
  minAllowances: {
    1: { '0xUSDC': 1000000n }, // 1 USDC on Ethereum
    137: { '0xUSDC': 1000000n } // 1 USDC on Polygon
  }
})

// Register token for monitoring
await balanceManager.registerToken({
  chainId: 1,
  tokenAddress: '0xA0b86a33E6441E6C7D3D4B4f6c7E6D8F9B3A2C1D',
  symbol: 'TOKEN'
})

// Get current balance
const balance = await balanceManager.getTokenBalance({
  chainId: 1,
  address: '0x...',
  tokenAddress: '0x...'
})
```

### Block Management

#### BlockManagerRegistry
Central registry for managing BlockManager instances across networks.

```typescript
const registry = BlockManagerRegistry.createInstance(logger, {
  pollingIntervalMs: 5000,
  catchupBatchSize: 1000,
  useCheckpoints: true
})

// Create block manager for a network
const blockManager = await registry.createBlockManager({
  chainId: 1,
  pollingIntervalMs: 2000,
  startFromBlock: 19000000n
})

// Get latest block
const latestBlock = await registry.getLatestBlockForChain(1)
```

#### BlockManager
Individual block tracking with checkpoint support.

```typescript
const blockManager = new BlockManager(logger, {
  chainId: 137,
  checkpointManager: customCheckpointManager
})

// Set current block
await blockManager.setCurrentBlock(50000000n)

// Get current block
const currentBlock = await blockManager.getCurrentBlock()
```

### Network & Infrastructure

#### ConceroNetworkManager
Dynamic network configuration management.

```typescript
const networkManager = ConceroNetworkManager.createInstance(logger, {
  networksUrl: 'https://api.example.com/networks',
  updateIntervalMs: 30000
})

// Listen for network updates
networkManager.addListener((networks) => {
  console.log('Networks updated:', networks.map(n => n.name))
})
```

#### RpcManager
RPC endpoint management with health checking and failover.

```typescript
const rpcManager = RpcManager.createInstance(logger, {
  rpcUrls: {
    1: [
      'https://eth-mainnet.g.alchemy.com/v2/your-key',
      'https://mainnet.infura.io/v3/your-key'
    ],
    137: ['https://polygon-rpc.com']
  },
  healthCheckIntervalMs: 60000
})
```

#### ViemClientManager
Centralized Viem client creation and management.

```typescript
const clientManager = ViemClientManager.createInstance(logger, networkManager, rpcManager)

// Get client for specific network
const client = clientManager.getClient(1)
const blockNumber = await client.getBlockNumber()
```

#### NonceManager
Thread-safe nonce management for transactions.

```typescript
const nonceManager = NonceManager.createInstance(logger)

// Get nonce
const nonce = await nonceManager.get({
  chainId: 1,
  address: '0x...',
  client: viemClient
})

// Consume nonce (auto-increment)
const nonce = await nonceManager.consume({
  chainId: 1,
  address: '0x...',
  client: viemClient
})
```

#### DeploymentFetcher
Smart contract deployment resolution.

```typescript
const deploymentFetcher = DeploymentFetcher.createInstance(logger, {
  deploymentsUrl: 'https://api.example.com/deployments',
  cacheTtlMs: 300000
})

// Get contract deployment
const deployment = await deploymentFetcher.getDeployment('MyContract', 1)
console.log('Contract address:', deployment.address)
```

## Usage Examples

### Complete DEX Operator Setup

```typescript
import {
  ConceroNetworkManager,
  RpcManager,
  ViemClientManager,
  BalanceManager,
  TxMonitor,
  TxReader,
  TxWriter,
  NonceManager,
  BlockManagerRegistry,
  Logger,
  AppError
} from '@concero/operator-utils'

class DexOperator {
  private networkManager: ConceroNetworkManager
  private rpcManager: RpcManager
  private clientManager: ViemClientManager
  private balanceManager: BalanceManager
  private txMonitor: TxMonitor
  private txReader: TxReader
  private txWriter: TxWriter
  private nonceManager: NonceManager
  private blockRegistry: BlockManagerRegistry

  constructor(private logger: Logger) {
    this.initializeManagers()
  }

  private async initializeManagers() {
    this.networkManager = ConceroNetworkManager.createInstance(this.logger, {
      networksUrl: process.env.NETWORKS_URL!
    })

    this.rpcManager = RpcManager.createInstance(this.logger, {
      rpcUrls: JSON.parse(process.env.RPC_URLS!)
    })

    this.clientManager = ViemClientManager.createInstance(
      this.logger,
      this.networkManager,
      this.rpcManager
    )

    this.txMonitor = TxMonitor.createInstance(this.logger)
    this.txReader = TxReader.createInstance(this.logger, this.networkManager, this.clientManager)
    this.txWriter = TxWriter.createInstance(this.logger, this.clientManager, this.txMonitor)
    this.nonceManager = NonceManager.createInstance(this.logger, {})
    
    this.balanceManager = BalanceManager.createInstance(this.logger, this.txReader, {
      minAllowances: {
        1: { '0xA0b86a33E6441E6C7D3D4B4f6c7E6D8F9B3A2C1D': 1000000n }
      }
    })

    this.blockRegistry = BlockManagerRegistry.createInstance(this.logger, {
      useCheckpoints: true
    })
  }

  async executeSwap(chainId: number, tokenIn: string, tokenOut: string, amountIn: bigint) {
    try {
      // Check balance
      const balance = await this.balanceManager.getTokenBalance({
        chainId,
        address: process.env.OPERATOR_ADDRESS!,
        tokenAddress: tokenIn
      })

      if (balance < amountIn) {
        throw new AppError('INSUFFICIENT_BALANCE', { balance, amountIn })
      }

      // Execute swap
      const txHash = await this.txWriter.callContract({
        chainId,
        contractAddress: process.env.DEX_ROUTER_ADDRESS!,
        abi: DEX_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountIn, 0n, [tokenIn, tokenOut], process.env.OPERATOR_ADDRESS!, deadline],
        account: process.env.OPERATOR_ADDRESS!
      })

      return txHash
    } catch (error) {
      this.logger.error('Swap execution failed', { error, chainId, tokenIn, tokenOut, amountIn })
      throw error
    }
  }
}
```

### Event Monitoring for Arbitrage

```typescript
// Monitor Uniswap V3 pools for arbitrage opportunities
const pools = [
  { chainId: 1, address: '0x8f8EF111E67ffb7...', token0: 'USDC', token1: 'WETH' },
  { chainId: 137, address: '0x45dDa9cb7c251...', token0: 'USDC', token1: 'WETH' }
]

for (const pool of pools) {
  txReader.logWatcher.create({
    chainId: pool.chainId,
    address: pool.address,
    event: 'Swap',
    callback: (log) => {
      const { amount0, amount1, sqrtPriceX96 } = log.args
      
      // Analyze for arbitrage opportunities
      const price = calculatePriceFromSqrtPrice(sqrtPriceX96)
      checkArbitrageOpportunity(pool, price, amount0, amount1)
    }
  })
}
```

## Configuration

### Environment Variables

```bash
# Required
NETWORKS_URL=https://api.concero.io/networks
RPC_URLS='{"1": ["https://eth.rpc"], "137": ["https://polygon.rpc"]}'
OPERATOR_ADDRESS=0x...

# Optional
LOG_DIR=./logs
DEBUG_MODE=false
DEPLOYMENTS_URL=https://api.concero.io/deployments
MIN_ALLOWANCES='{"1": {"0xUSDC": 1000000}}'
```

### Manager Configuration Patterns

```typescript
// Production configuration
const productionConfig = {
  logger: { debugMode: false, logDir: '/var/log/operator' },
  rpcManager: { healthCheckIntervalMs: 30000 },
  txMonitor: { checkIntervalMs: 10000, retryDelayMs: 60000 },
  balanceManager: { 
    minAllowances: { 1: { '0xUSDC': 1000000n } },
    watcherIntervalMs: 15000
  }
}

// Development configuration
const developmentConfig = {
  logger: { debugMode: true, logDir: './logs' },
  rpcManager: { healthCheckIntervalMs: 5000 },
  txMonitor: { checkIntervalMs: 2000, retryDelayMs: 5000 },
  balanceManager: { watcherIntervalMs: 5000 }
}
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Run type checking
bun run build:types

# Run linting
bun run lint

# Format code
bun run format

# Build for production
bun run build
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/BalanceManager.test.ts

# Run with coverage
bun test --coverage
```

## TypeScript Support

The library is built with TypeScript and exports comprehensive type definitions:

```typescript
import type {
  IBalanceManager,
  ITxMonitor,
  ITxReader,
  ITxWriter,
  IBlockManagerRegistry,
  IConceroNetworkManager,
  IRpcManager,
  IViemClientManager,
  INonceManager,
  IDeploymentFetcher,
  ConceroNetwork,
  ChainDefinition,
  ILogger,
  AppErrorEnum
} from '@concero/operator-utils'
```

All managers implement SOLID principles with dependency injection and interface-based design for maximum flexibility and testability.
