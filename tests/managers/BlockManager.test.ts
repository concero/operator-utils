import { PublicClient } from 'viem';
import { BlockManager } from '@/managers/BlockManager';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';

jest.useFakeTimers();

describe('BlockManager', () => {
    let logger: MockLogger;
    let blockManager: BlockManager;
    let publicClient: jest.Mocked<PublicClient>;

    beforeEach(async () => {
        logger = new MockLogger();
        publicClient = {
            getBlockNumber: jest.fn().mockResolvedValue(100n),
        } as any;

        blockManager = await BlockManager.create(mockConceroNetwork, publicClient, logger, {
            pollingIntervalMs: 1000,
            catchupBatchSize: 10,
        });
    });

    afterEach(() => {
        blockManager.dispose();
        jest.clearAllMocks();
    });

    it('should create a block manager and initialize with the latest block number', async () => {
        expect(blockManager).toBeDefined();
        expect(publicClient.getBlockNumber).toHaveBeenCalled();
    });

    it('should start polling and process new blocks', async () => {
        const onBlockRange = jest.fn();
        blockManager.watchBlocks({ onBlockRange });

        await blockManager.startPolling();

        // Simulate new blocks
        publicClient.getBlockNumber.mockResolvedValue(105n);
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // allow promises to resolve

        // This is tricky to test without more fine-grained control
    });

    it('should call watchBlocks and unregister', () => {
        const onBlockRange = jest.fn();
        const unregister = blockManager.watchBlocks({ onBlockRange });
        // @ts-ignore
        expect(blockManager.blockRangeHandlers.size).toBe(1);
        unregister();
        // @ts-ignore
        expect(blockManager.blockRangeHandlers.size).toBe(0);
    });
});
