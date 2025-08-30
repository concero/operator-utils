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
        const clients = viemClientManager.getClients(mockConceroNetwork);
        expect(clients).toBeDefined();
        expect(rpcManager.getRpcsForNetwork).toHaveBeenCalledWith('test-network');
        expect(viem.createPublicClient).toHaveBeenCalled();
        expect(viem.createWalletClient).toHaveBeenCalled();

        // Should return cached clients
        const cachedClients = viemClientManager.getClients(mockConceroNetwork);
        expect(cachedClients).toBe(clients);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(1);
    });

    it('should update clients on network update', async () => {
        await viemClientManager.initialize();
        viemClientManager.getClients(mockConceroNetwork);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(1);

        const newNetwork = { ...mockConceroNetwork, name: 'new-network' };
        await viemClientManager.onNetworksUpdated([newNetwork]);

        viemClientManager.getClients(newNetwork);
        expect(viem.createPublicClient).toHaveBeenCalledTimes(2);

        // Check that old client is removed
        try {
            // This is a bit of a hack to check if the client is gone
            // as getClients will create a new one if it's not there.
            // So we check the logs
            viemClientManager.getClients(mockConceroNetwork);
        } catch (e) {
            // ignore
        }
        expect(logger.debug).toHaveBeenCalledWith(
            'Removed clients for inactive network: test-network',
        );
    });
});
