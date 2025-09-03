import { NonceManager } from '../../src/managers/NonceManager';
import { ViemClientManager } from '../../src/managers/ViemClientManager';
import { MockLogger } from '../mocks/Logger';

const mockViemClientManager = {
    getClients: jest.fn(),
} as jest.Mocked<Partial<ViemClientManager>>;

describe('NonceManager', () => {
    let logger: MockLogger;
    let nonceManager: NonceManager;
    let mockGetTransactionCount: jest.Mock;
    let mockPublicClient: any;
    let mockWalletClient: any;

    beforeEach(() => {
        logger = new MockLogger();
        mockGetTransactionCount = jest.fn().mockResolvedValue(10);

        mockPublicClient = {
            getTransactionCount: mockGetTransactionCount,
            chain: { name: 'ethereum' },
        };

        mockWalletClient = {
            account: { address: '0x123' },
        };

        mockViemClientManager.getClients = jest.fn().mockReturnValue({
            publicClient: mockPublicClient,
            walletClient: mockWalletClient,
            account: { address: '0x123' },
        });

        nonceManager = NonceManager.createInstance(
            logger,
            mockViemClientManager as ViemClientManager,
            {},
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset the singleton instance for each test
        (NonceManager as any).instance = null;
    });

    it('should get a nonce, fetching if not present', async () => {
        const networkName = 'ethereum';

        const nonce = await nonceManager.get(networkName);
        expect(nonce).toBe(10);
        expect(mockGetTransactionCount).toHaveBeenCalledTimes(1);
        expect(mockGetTransactionCount).toHaveBeenCalledWith({
            address: '0x123',
            blockTag: 'pending',
        });
        expect(mockViemClientManager.getClients).toHaveBeenCalledWith(networkName);

        // Should not fetch again
        const nonce2 = await nonceManager.get(networkName);
        expect(nonce2).toBe(10);
        expect(mockGetTransactionCount).toHaveBeenCalledTimes(1);
    });

    it('should consume a nonce', async () => {
        const networkName = 'ethereum';

        const nonce = await nonceManager.consume(networkName);
        expect(nonce).toBe(10);
        expect(mockViemClientManager.getClients).toHaveBeenCalledWith(networkName);

        const nonce2 = await nonceManager.get(networkName);
        expect(nonce2).toBe(11);

        // getClients should be called only once (during consume, get uses cached value)
        expect(mockViemClientManager.getClients).toHaveBeenCalledTimes(1);
    });

    it('should set and reset a nonce', async () => {
        const networkName = 'ethereum';

        // Use the public consume method to set initial nonce, then check internal state
        await nonceManager.consume(networkName);
        // After consume, the nonce should be incremented from 10 to 11
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(11);

        nonceManager.reset(networkName);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(0);
    });

    it('should handle multiple networks independently', async () => {
        const ethereumName = 'ethereum';
        const polygonName = 'polygon';

        // Mock different responses for different networks
        const ethereumGetTransactionCount = jest.fn().mockResolvedValue(15);
        const polygonGetTransactionCount = jest.fn().mockResolvedValue(25);

        mockViemClientManager.getClients = jest.fn().mockImplementation((networkName: string) => {
            if (networkName === ethereumName) {
                return {
                    publicClient: {
                        getTransactionCount: ethereumGetTransactionCount,
                        chain: { name: ethereumName },
                    },
                    walletClient: { account: { address: '0x123' } },
                    account: { address: '0x123' },
                };
            } else if (networkName === polygonName) {
                return {
                    publicClient: {
                        getTransactionCount: polygonGetTransactionCount,
                        chain: { name: polygonName },
                    },
                    walletClient: { account: { address: '0x123' } },
                    account: { address: '0x123' },
                };
            }
            throw new Error(`Unknown network: ${networkName}`);
        });

        const ethereumNonce = await nonceManager.get(ethereumName);
        const polygonNonce = await nonceManager.get(polygonName);

        expect(ethereumNonce).toBe(15);
        expect(polygonNonce).toBe(25);

        // Verify the correct getTransactionCount was called for each network
        expect(ethereumGetTransactionCount).toHaveBeenCalledWith({
            address: '0x123',
            blockTag: 'pending',
        });
        expect(polygonGetTransactionCount).toHaveBeenCalledWith({
            address: '0x123',
            blockTag: 'pending',
        });

        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[ethereumName]).toBe(15);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[polygonName]).toBe(25);
    });

    it('should throw error when clients not found for network', async () => {
        const networkName = 'unknown-network';
        mockViemClientManager.getClients = jest.fn().mockImplementation(() => {
            throw new Error(`No clients found for network: ${networkName}`);
        });

        await expect(nonceManager.get(networkName)).rejects.toThrow(
            `No clients found for network: ${networkName}`,
        );
    });

    it('should increment nonce after consumption', async () => {
        const networkName = 'ethereum';

        // First call gets the initial nonce
        const firstNonce = await nonceManager.consume(networkName);
        expect(firstNonce).toBe(10);

        // Second call should return incremented nonce (without fetching from network)
        const secondNonce = await nonceManager.consume(networkName);
        expect(secondNonce).toBe(11);

        // Third call should return further incremented nonce
        const thirdNonce = await nonceManager.consume(networkName);
        expect(thirdNonce).toBe(12);

        // getTransactionCount should only be called once (for the first consume)
        expect(mockGetTransactionCount).toHaveBeenCalledTimes(1);
    });

    it('should decrement nonce', async () => {
        const networkName = 'ethereum';

        // First consume to set initial nonce
        await nonceManager.consume(networkName);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(11);

        // Decrement the nonce
        await nonceManager.decrement(networkName);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(10);
    });

    it('should not decrement nonce below 0', async () => {
        const networkName = 'ethereum';

        nonceManager.reset(networkName);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(0);

        await nonceManager.decrement(networkName);
        // @ts-ignore - accessing private property for testing
        expect(nonceManager.noncesMap[networkName]).toBe(0);

        expect(logger.warn).toHaveBeenCalledWith(
            'Nonce for network ethereum is already at 0, cannot decrement',
        );
    });
});
