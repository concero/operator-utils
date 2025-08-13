import { ConceroNetworkManager } from '@/managers/ConceroNetworkManager';
import { MockLogger } from '../mocks/Logger';
import { HttpClient } from '@/utils/HttpClient';
import * as networkUtils from '@/utils/fetchNetworkConfigs';
import * as envUtils from '@/utils/getEnvVar';
import { NetworkUpdateListener } from '@/types/managers';

jest.mock('@/utils/HttpClient');
jest.mock('@/utils/fetchNetworkConfigs');
jest.mock('@/utils/getEnvVar');

describe('ConceroNetworkManager', () => {
    let logger: MockLogger;
    let networkManager: ConceroNetworkManager;
    let mockHttpClient: HttpClient;

    beforeEach(() => {
        logger = new MockLogger();
        mockHttpClient = new HttpClient(logger, {});
        (HttpClient.getInstance as jest.Mock).mockReturnValue(mockHttpClient);
        (envUtils.getEnvVar as jest.Mock).mockReturnValue('mock-pk');

        const mockFetchNetworkConfigs = networkUtils.fetchNetworkConfigs as jest.Mock;
        mockFetchNetworkConfigs.mockResolvedValue({
            mainnetNetworks: {
                ethereum: { name: 'ethereum', chainId: 1, viemChain: { id: 1 } },
            },
            testnetNetworks: {
                sepolia: { name: 'sepolia', chainId: 11155111, viemChain: { id: 11155111 } },
            },
        });

        networkManager = ConceroNetworkManager.createInstance(logger, mockHttpClient, {
            networkMode: 'mainnet',
            mainnetUrl: 'http://mainnet.url',
            testnetUrl: 'http://testnet.url',
            defaultConfirmations: 1,
            defaultFinalityConfirmations: 1,
            ignoredNetworkIds: [],
            whitelistedNetworkIds: { mainnet: [], testnet: [] },
        });
    });

    afterEach(() => {
        ConceroNetworkManager.dispose();
        jest.clearAllMocks();
    });

    it('should initialize and fetch networks', async () => {
        await networkManager.initialize();
        expect(logger.debug).toHaveBeenCalledWith('Initialized');
        const activeNetworks = networkManager.getActiveNetworks();
        expect(activeNetworks.length).toBe(1);
        expect(activeNetworks[0].name).toBe('ethereum');
    });

    it('should register and unregister an update listener', () => {
        const listener: NetworkUpdateListener = {
            onNetworksUpdated: jest.fn(),
        };
        networkManager.registerUpdateListener(listener);
        // @ts-ignore
        expect(networkManager.updateListeners).toContain(listener);
        networkManager.unregisterUpdateListener(listener);
        // @ts-ignore
        expect(networkManager.updateListeners).not.toContain(listener);
    });

    it('should notify listeners on network update', async () => {
        const listener = { onNetworksUpdated: jest.fn() };
        networkManager.registerUpdateListener(listener);
        await networkManager.initialize();
        expect(listener.onNetworksUpdated).toHaveBeenCalled();
    });

    it('should get networks by id, name, and selector', async () => {
        await networkManager.initialize();
        const networkById = networkManager.getNetworkById(1);
        expect(networkById.name).toBe('ethereum');

        const networkByName = networkManager.getNetworkByName('ethereum');
        expect(networkByName.id).toBe(1);

        const networkBySelector = networkManager.getNetworkBySelector('1');
        expect(networkBySelector.name).toBe('ethereum');
    });
});
