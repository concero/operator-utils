import { localhost } from 'viem/chains';
import { ConceroNetwork } from '@/types';

export const mockConceroNetwork: ConceroNetwork = {
    id: 1,
    name: 'test-network',
    type: 'testnet',
    chainSelector: '1',
    accounts: [],
    viemChain: localhost,
    confirmations: 1,
};
