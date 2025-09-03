import { Abi, AbiEvent } from 'viem';
import { TxReader } from '@/managers/TxReader';
import { INetworkManager } from '@/types/managers';
import { v4 as uuidv4 } from 'uuid';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockViemClientManager } from '../mocks/ViemClientManager';

jest.mock('uuid');
jest.useFakeTimers();

describe('TxReader', () => {
    let logger: MockLogger;
    let txReader: TxReader;
    let networkManager: jest.Mocked<INetworkManager>;
    let viemClientManager: MockViemClientManager;

    beforeEach(() => {
        logger = new MockLogger();
        networkManager = {
            getNetworkByName: jest.fn().mockReturnValue(mockConceroNetwork),
        } as any;
        viemClientManager = new MockViemClientManager();
        (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');

        txReader = TxReader.createInstance(logger, networkManager, viemClientManager, {
            watcherIntervalMs: 1000,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create and remove a read contract watcher', () => {
        const callback = jest.fn();
        const id = txReader.readContractWatcher.create(
            '0x123',
            mockConceroNetwork,
            'test',
            [],
            callback,
        );
        expect(id).toBe('mock-uuid');
        // @ts-ignore
        expect(txReader.readContractWatchers.has(id)).toBe(true);

        const removed = txReader.readContractWatcher.remove(id);
        expect(removed).toBe(true);
        // @ts-ignore
        expect(txReader.readContractWatchers.has(id)).toBe(false);
    });

    it('should execute read contract watchers', async () => {
        const callback = jest.fn().mockResolvedValue(undefined);
        txReader.readContractWatcher.create(
            '0x123',
            mockConceroNetwork,
            'balanceOf',
            [] as Abi,
            callback,
            1000,
            ['0x456'],
        );

        const mockReadContract =
            viemClientManager.getClients(mockConceroNetwork).publicClient.readContract;
        (mockReadContract as jest.Mock).mockResolvedValue(123n);

        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // allow promises to resolve

        expect(mockReadContract).toHaveBeenCalled();
        // expect(callback).toHaveBeenCalledWith(123n, mockConceroNetwork);
    });

    it('should get logs', async () => {
        const mockGetLogs = viemClientManager.getClients(mockConceroNetwork).publicClient.getLogs;
        (mockGetLogs as jest.Mock).mockResolvedValue([{ data: 'log1' }]);

        const logs = await txReader.getLogs(
            {
                address: '0x123',
                event: { type: 'event', name: 'test' } as AbiEvent,
                fromBlock: 1n,
                toBlock: 2n,
            },
            mockConceroNetwork,
        );

        expect(logs).toHaveLength(1);
        expect(mockGetLogs).toHaveBeenCalled();
    });
});
