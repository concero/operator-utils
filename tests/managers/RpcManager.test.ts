import { RpcManager } from '@/managers/RpcManager';
import { HttpClient } from '@/utils/HttpClient';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';

jest.mock('@/utils/HttpClient');

describe('RpcManager', () => {
    let logger: MockLogger;
    let rpcManager: RpcManager;
    let mockHttpGet: jest.Mock;

    beforeEach(() => {
        logger = new MockLogger();
        mockHttpGet = jest.fn();
        (HttpClient.getInstance as jest.Mock).mockReturnValue({
            get: mockHttpGet,
        });
        rpcManager = RpcManager.createInstance(logger, {
            conceroRpcsUrl: 'http://test.com',
            networkMode: 'mainnet',
        });
    });

    afterEach(() => {
        RpcManager.dispose();
        jest.clearAllMocks();
    });

    it('should update RPCs for networks', async () => {
        const rpcData = {
            'test-network': {
                rpcUrls: ['http://rpc1.com', 'http://rpc2.com'],
                chainSelector: '1',
            },
        };
        mockHttpGet.mockResolvedValue(rpcData);

        await rpcManager.updateRpcs([mockConceroNetwork]);

        const rpcs = rpcManager.getRpcsForNetwork('test-network');
        expect(rpcs).toEqual(['http://rpc1.com', 'http://rpc2.com']);
        expect(mockHttpGet).toHaveBeenCalledWith('http://test.com/mainnet.json');
    });

    it('should handle localhost mode', () => {
        const localRpcManager = RpcManager.createInstance(logger, {
            conceroRpcsUrl: 'http://test.com',
            networkMode: 'localhost',
        });
        const rpcs = localRpcManager.getRpcsForNetwork('test-network');
        expect(rpcs).toEqual(['http://127.0.0.1:8545']);
    });

    it('should ensure RPCs for a network', async () => {
        const rpcData = {
            'test-network': {
                rpcUrls: ['http://rpc1.com', 'http://rpc2.com'],
                chainSelector: '1',
            },
        };
        mockHttpGet.mockResolvedValue(rpcData);

        await rpcManager.ensureRpcsForNetwork(mockConceroNetwork);

        const rpcs = rpcManager.getRpcsForNetwork('test-network');
        expect(rpcs).toEqual(['http://rpc1.com', 'http://rpc2.com']);
    });

    it('should remove RPCs for inactive networks', async () => {
        const rpcData = {
            'test-network': {
                rpcUrls: ['http://rpc1.com', 'http://rpc2.com'],
                chainSelector: '1',
            },
        };
        mockHttpGet.mockResolvedValue(rpcData);

        await rpcManager.updateRpcs([mockConceroNetwork]);
        let rpcs = rpcManager.getRpcsForNetwork('test-network');
        expect(rpcs).toEqual(['http://rpc1.com', 'http://rpc2.com']);

        await rpcManager.updateRpcs([]);
        rpcs = rpcManager.getRpcsForNetwork('test-network');
        expect(rpcs).toEqual([]);
    });
});
