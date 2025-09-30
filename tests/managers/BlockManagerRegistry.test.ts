import { BlockManager } from '@/managers/BlockManager';
import { BlockManagerRegistry } from '@/managers/BlockManagerRegistry';
import { INetworkManager, IRpcManager } from '@/types/managers';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockViemClientManager } from '../mocks/ViemClientManager';

jest.mock('@/managers/BlockManager');

describe('BlockManagerRegistry', () => {
    let logger: MockLogger;
    let blockManagerRegistry: BlockManagerRegistry;
    let networkManager: jest.Mocked<INetworkManager>;
    let viemClientManager: MockViemClientManager;

    beforeEach(() => {
        logger = new MockLogger();
        networkManager = {
            getActiveNetworks: jest.fn().mockReturnValue([mockConceroNetwork]),
            excludeNetwork: jest.fn(),
        } as any;
        viemClientManager = new MockViemClientManager();

        blockManagerRegistry = BlockManagerRegistry.createInstance(
            {
                blockManagerConfig: {
                    pollingIntervalMs: 1000,
                    catchupBatchSize: 10,
                },
            },
            logger,
            networkManager,
            viemClientManager,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a block manager', async () => {
        const mockBlockManager = {
            startPolling: jest.fn(),
            dispose: jest.fn(),
        };
        (BlockManager.create as jest.Mock).mockResolvedValue(mockBlockManager);

        await blockManagerRegistry.initialize();
        const manager = await blockManagerRegistry.createBlockManager(
            mockConceroNetwork,
            {} as any,
        );

        expect(manager).toBe(mockBlockManager);
        expect(BlockManager.create).toHaveBeenCalled();
    });

    it('should get a block manager', async () => {
        const mockBlockManager = {
            startPolling: jest.fn(),
            dispose: jest.fn(),
        };
        (BlockManager.create as jest.Mock).mockResolvedValue(mockBlockManager);

        await blockManagerRegistry.initialize();
        await blockManagerRegistry.createBlockManager(mockConceroNetwork, {} as any);
        const manager = blockManagerRegistry.getBlockManager('test-network');
        expect(manager).toBe(mockBlockManager);
    });

    it('should update block managers on network update', async () => {
        const mockBlockManager = {
            startPolling: jest.fn(),
            dispose: jest.fn(),
        };
        (BlockManager.create as jest.Mock).mockResolvedValue(mockBlockManager);

        await blockManagerRegistry.initialize();
        await blockManagerRegistry.onNetworksUpdated([mockConceroNetwork]);

        expect(BlockManager.create).toHaveBeenCalled();
    });
});
