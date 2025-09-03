import { ViemClientManager } from '@/managers/ViemClientManager';
import { IRpcManager } from '@/types/managers';
import * as utils from '@/utils';

import * as viem from 'viem';
import * as viemAccounts from 'viem/accounts';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';

jest.mock('viem');
jest.mock('viem/accounts');
jest.mock('@/utils');

describe('ViemClientManager', () => {
    let logger: MockLogger;
    let rpcManager: jest.Mocked<IRpcManager>;
    let viemClientManager: ViemClientManager;

    beforeEach(() => {
        logger = new MockLogger();
        rpcManager = {
            getRpcsForNetwork: jest.fn().mockReturnValue(['http://rpc.com']),
        } as any;

        (utils.getEnvVar as jest.Mock).mockReturnValue('mock-pk');
        (viemAccounts.privateKeyToAccount as jest.Mock).mockReturnValue({ address: '0x123' });
        (viem.createPublicClient as jest.Mock).mockReturnValue({});
        (viem.createWalletClient as jest.Mock).mockReturnValue({});
        (viem.fallback as jest.Mock).mockReturnValue({});
        (utils.createCustomHttpTransport as jest.Mock).mockReturnValue({});

        viemClientManager = ViemClientManager.createInstance(logger, rpcManager, {
            fallbackTransportOptions: {
                retryCount: 3,
                retryDelay: 1000,
                timeout: 10000,
            },
            httpTransportConfig: {
                timeout: 10000,
                batch: true,
                retryCount: 3,
                retryDelay: 1000,
            },
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize and get clients', async () => {
        await viemClientManager.initialize();

        // Need to call onNetworksUpdated to populate clients
        await viemClientManager.onNetworksUpdated([mockConceroNetwork]);

        const clients = viemClientManager.getClients(mockConceroNetwork.name);
        expect(clients).toBeDefined();
        expect(rpcManager.getRpcsForNetwork).toHaveBeenCalledWith('test-network');
        expect(viem.createPublicClient).toHaveBeenCalled();
        expect(viem.createWalletClient).toHaveBeenCalled();

        // Should return cached clients
        const cachedClients = viemClientManager.getClients(mockConceroNetwork.name);
        expect(cachedClients).toBe(clients);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(1);
    });

    it('should update clients on network update', async () => {
        await viemClientManager.initialize();

        // Set up initial clients
        await viemClientManager.onNetworksUpdated([mockConceroNetwork]);
        const initialClients = viemClientManager.getClients(mockConceroNetwork.name);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(1);

        const newNetwork = { ...mockConceroNetwork, name: 'new-network' };
        await viemClientManager.onNetworksUpdated([newNetwork]);

        const newClients = viemClientManager.getClients(newNetwork.name);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(2);

        // Check that old client is removed
        expect(() => {
            viemClientManager.getClients(mockConceroNetwork.name);
        }).toThrow('No clients found for network: test-network');

        expect(logger.debug).toHaveBeenCalledWith(
            'Removed clients for inactive network: test-network',
        );
    });

    it('should throw error when getting clients for unknown network', async () => {
        await viemClientManager.initialize();

        expect(() => {
            viemClientManager.getClients('unknown-network');
        }).toThrow('No clients found for network: unknown-network');
    });

    it('should throw error when not initialized', () => {
        expect(() => {
            viemClientManager.getClients(mockConceroNetwork.name);
        }).toThrow('ViemClientManager not initialized');
    });
});
