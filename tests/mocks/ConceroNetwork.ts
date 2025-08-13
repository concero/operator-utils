import { ConceroNetwork } from '@/types';
import { localhost } from 'viem/chains';

export const mockConceroNetwork: ConceroNetwork = {
    id: 1,
    name: 'test-network',
    type: 'testnet',
    chainSelector: '1',
    accounts: [],
    viemChain: localhost,
    confirmations: 1,
};
