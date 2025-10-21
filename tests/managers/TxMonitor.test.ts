import { Hash } from 'viem';
import { TxMonitor } from '@/managers/TxMonitor';
import {
    IBlockManagerRegistry,
    IConceroNetworkManager,
    ITxResultSubscriber,
} from '@/types/managers';
import { TxNotificationHub } from '@/types/managers/ITxResultSubscriber';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockViemClientManager } from '../mocks/ViemClientManager';

describe('TxMonitor', () => {
    let logger: MockLogger;
    let txMonitor: TxMonitor;
    let viemClientManager: MockViemClientManager;
    let blockManagerRegistry: jest.Mocked<IBlockManagerRegistry>;
    let networkManager: jest.Mocked<IConceroNetworkManager>;
    let mockWatchBlocks: jest.Mock;

    beforeEach(() => {
        // Reset TxNotificationHub singleton BEFORE creating TxMonitor
        (TxNotificationHub as any).instance = undefined;

        logger = new MockLogger();
        viemClientManager = new MockViemClientManager();
        mockWatchBlocks = jest.fn().mockReturnValue(() => {});
        blockManagerRegistry = {
            getBlockManager: jest.fn().mockReturnValue({
                watchBlocks: mockWatchBlocks,
            }),
        } as any;
        networkManager = {
            getNetworkByName: jest.fn().mockReturnValue(mockConceroNetwork),
            getDefaultFinalityConfirmations: jest.fn().mockReturnValue(10),
        } as any;

        txMonitor = TxMonitor.createInstance(
            logger,
            viemClientManager,
            blockManagerRegistry,
            networkManager,
            {},
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        (TxMonitor as any).instance = undefined;
    });

    it('should monitor a transaction for finality', async () => {
        const subscriberId = 'test-subscriber';
        const txHash: Hash = '0x123';
        const chainName = 'test-network';
        const onFinality = jest.fn().mockResolvedValue(undefined);

        // Register subscriber
        const subscriber: ITxResultSubscriber = {
            id: subscriberId,
            notifyTxResult: onFinality,
        };
        TxNotificationHub.getInstance().register(subscriber);

        // Set up the mock before tracking
        const mockGetTransactionReceipt =
            viemClientManager.getClients(mockConceroNetwork).publicClient.getTransactionReceipt;
        (mockGetTransactionReceipt as jest.Mock).mockResolvedValue({ blockNumber: 100n });

        txMonitor.trackTxFinality(txHash, chainName, subscriberId);

        // Wait for async operations to complete
        await new Promise(resolve => setImmediate(resolve));

        expect(blockManagerRegistry.getBlockManager).toHaveBeenCalledWith('test-network');
        expect(mockWatchBlocks).toHaveBeenCalled();

        const onBlockRange = mockWatchBlocks.mock.calls[0][0].onBlockRange;

        // Simulate new blocks until finality
        await onBlockRange(100n, 110n);

        expect(onFinality).toHaveBeenCalledWith({
            txHash,
            chainName,
            type: 'finality',
            success: true,
            blockNumber: undefined,
        });
    });

    it('should handle transaction not found', async () => {
        const subscriberId = 'test-subscriber';
        const txHash: Hash = '0x123';
        const chainName = 'test-network';
        const onFinality = jest.fn().mockResolvedValue(undefined);

        // Register subscriber
        const subscriber: ITxResultSubscriber = {
            id: subscriberId,
            notifyTxResult: onFinality,
        };
        TxNotificationHub.getInstance().register(subscriber);

        txMonitor.trackTxFinality(txHash, chainName, subscriberId);

        // Wait for async operations to complete
        await new Promise(resolve => setImmediate(resolve));

        expect(mockWatchBlocks).toHaveBeenCalled();

        const onBlockRange = mockWatchBlocks.mock.calls[0][0].onBlockRange;

        // Simulate transaction not found
        const mockGetTransactionReceipt =
            viemClientManager.getClients(mockConceroNetwork).publicClient.getTransactionReceipt;
        (mockGetTransactionReceipt as jest.Mock).mockResolvedValue(null);

        await onBlockRange(100n, 110n);

        // When transaction is not found, callback is not called immediately
        expect(onFinality).not.toHaveBeenCalled();
    });
});
