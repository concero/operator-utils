import { mockConceroNetwork } from './ConceroNetwork';
import { ConceroNetwork } from '@/types';
import { IViemClientManager, ViemClients } from '@/types/managers';

import { jest } from '@jest/globals';
import { Account, PublicClient, WalletClient } from 'viem';

export class MockViemClientManager implements IViemClientManager {
    initialize = jest.fn().mockResolvedValue(undefined);
    getClients = jest.fn().mockReturnValue({
        walletClient: {
            account: {
                address: '0x0',
            } as Account,
            writeContract: jest.fn().mockResolvedValue('0xabc'),
        } as WalletClient,
        publicClient: {
            getBalance: jest.fn().mockResolvedValue(100n),
            readContract: jest.fn().mockResolvedValue(50n),
            waitForTransactionReceipt: jest.fn().mockResolvedValue({}),
            getBlockNumber: jest.fn().mockResolvedValue(1000n),
            getLogs: jest.fn().mockResolvedValue([]),
            getTransaction: jest.fn().mockResolvedValue({ blockNumber: 100n }),
            getTransactionReceipt: jest.fn().mockResolvedValue({ blockNumber: 100n }),
        } as unknown as PublicClient,
        account: {
            address: '0x0',
        } as Account,
    } as ViemClients);
    updateClientsForNetworks = jest.fn().mockResolvedValue(undefined);
    dispose = jest.fn();
    onNetworksUpdated = jest.fn().mockResolvedValue(undefined);
}
