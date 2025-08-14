import { BlockManager } from '@/managers/BlockManager';
import { BlockManagerRegistry } from '@/managers/BlockManagerRegistry';
import { INetworkManager, IRpcManager } from '@/types/managers';

import { MockBlockCheckpointManager } from '../mocks/BlockCheckpointManager';
import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockViemClientManager } from '../mocks/ViemClientManager';

jest.mock('@/managers/BlockManager');

describe('BlockManagerRegistry', () => {
    let logger: MockLogger;
    let blockManagerRegistry: BlockManagerRegistry;
    let blockCheckpointManager: MockBlockCheckpointManager;
    let networkManager: jest.Mocked<INetworkManager>;
    let viemClientManager: MockViemClientManager;
    let rpcManager: jest.Mocked<IRpcManager>;

    beforeEach(() => {
        logger = new MockLogger();
        blockCheckpointManager = new MockBlockCheckpointManager();
        networkManager = {
            getActiveNetworks: jest.fn().mockReturnValue([mockConceroNetwork]),
        } as any;
        viemClientManager = new MockViemClientManager();
        rpcManager = {} as any;

        blockManagerRegistry = BlockManagerRegistry.createInstance(
            logger,
            blockCheckpointManager,
            networkManager,
            viemClientManager,
            rpcManager,
            {
                blockManagerConfig: {
                    useCheckpoints: true,
                    pollingIntervalMs: 1000,
                    catchupBatchSize: 10n,
                },
            },
        );
    });

    afterEach(() => {
        BlockManagerRegistry.dispose();
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
