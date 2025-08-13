import { TxMonitor } from '@/managers/TxMonitor';
import { MockLogger } from '../mocks/Logger';
import { MockViemClientManager } from '../mocks/ViemClientManager';
import { IBlockManagerRegistry, IConceroNetworkManager, TransactionInfo } from '@/types/managers';
import { mockConceroNetwork } from '../mocks/ConceroNetwork';

describe('TxMonitor', () => {
    let logger: MockLogger;
    let txMonitor: TxMonitor;
    let viemClientManager: MockViemClientManager;
    let blockManagerRegistry: jest.Mocked<IBlockManagerRegistry>;
    let networkManager: jest.Mocked<IConceroNetworkManager>;
    let mockWatchBlocks: jest.Mock;

    beforeEach(() => {
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
        TxMonitor.dispose();
        jest.clearAllMocks();
    });

    it('should monitor a transaction for finality', async () => {
        const onFinality = jest.fn();
        const txInfo: TransactionInfo = {
            id: 'tx-1',
            txHash: '0x123',
            chainName: 'test-network',
            submittedAt: Date.now(),
            submissionBlock: 100n,
            status: 'submitted',
        };

        txMonitor.ensureTxFinality(txInfo, onFinality);

        expect(blockManagerRegistry.getBlockManager).toHaveBeenCalledWith('test-network');
        expect(mockWatchBlocks).toHaveBeenCalled();

        const onBlockRange = mockWatchBlocks.mock.calls[0][0].onBlockRange;

        // Simulate transaction confirmation
        const mockGetTransaction = viemClientManager.getClients(mockConceroNetwork).publicClient.getTransaction;
        (mockGetTransaction as jest.Mock).mockResolvedValue({ blockNumber: 100n });

        // Simulate new blocks until finality
        await onBlockRange(100n, 110n);

        expect(onFinality).toHaveBeenCalledWith(expect.anything(), true);
    });

    it('should handle transaction not found', async () => {
        const onFinality = jest.fn();
        const txInfo: TransactionInfo = {
            id: 'tx-1',
            txHash: '0x123',
            chainName: 'test-network',
            submittedAt: Date.now(),
            submissionBlock: 100n,
            status: 'submitted',
        };

        txMonitor.ensureTxFinality(txInfo, onFinality);

        const onBlockRange = mockWatchBlocks.mock.calls[0][0].onBlockRange;

        // Simulate transaction not found
        const mockGetTransaction = viemClientManager.getClients(mockConceroNetwork).publicClient.getTransaction;
        (mockGetTransaction as jest.Mock).mockResolvedValue(null);

        await onBlockRange(100n, 110n);

        expect(onFinality).toHaveBeenCalledWith(expect.anything(), false);
    });
});
