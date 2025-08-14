import { NonceManager } from '@/managers/NonceManager';
import { IGetNonceParams, INonceManagerParams } from '@/types/managers/INonceManager';

import { PublicClient, createPublicClient } from 'viem';

import { MockLogger } from '../mocks/Logger';

jest.mock('viem', () => ({
    ...jest.requireActual('viem'),
    createPublicClient: jest.fn(),
}));

describe('NonceManager', () => {
    let logger: MockLogger;
    let nonceManager: NonceManager;
    let mockGetTransactionCount: jest.Mock;

    beforeEach(() => {
        logger = new MockLogger();
        nonceManager = NonceManager.createInstance(logger, {});
        mockGetTransactionCount = jest.fn().mockResolvedValue(10);
        (createPublicClient as jest.Mock).mockReturnValue({
            getTransactionCount: mockGetTransactionCount,
        });
    });

    afterEach(() => {
        NonceManager.dispose();
        jest.clearAllMocks();
    });

    it('should get a nonce, fetching if not present', async () => {
        const params: IGetNonceParams = {
            chainId: 1,
            address: '0x123',
            client: {} as any,
        };

        const nonce = await nonceManager.get(params);
        expect(nonce).toBe(10);
        expect(mockGetTransactionCount).toHaveBeenCalledTimes(1);

        // Should not fetch again
        const nonce2 = await nonceManager.get(params);
        expect(nonce2).toBe(10);
        expect(mockGetTransactionCount).toHaveBeenCalledTimes(1);
    });

    it('should consume a nonce', async () => {
        const params: IGetNonceParams = {
            chainId: 1,
            address: '0x123',
            client: {} as any,
        };

        const nonce = await nonceManager.consume(params);
        expect(nonce).toBe(10);

        const nonce2 = await nonceManager.get(params);
        expect(nonce2).toBe(11);
    });

    it('should set and reset a nonce', () => {
        const params: INonceManagerParams = {
            chainId: 1,
        };

        nonceManager.set(params, 5);
        // @ts-ignore
        expect(nonceManager.noncesMap[1]).toBe(5);

        nonceManager.reset(params);
        // @ts-ignore
        expect(nonceManager.noncesMap[1]).toBe(0);
    });
});
