import { Address, Chain } from 'viem';
export type NetworkType = 'mainnet' | 'testnet' | 'localhost';
export type ConceroNetwork = {
    id: number;
    name: string;
    type: NetworkType;
    chainSelector: string;
    accounts: string[];
    viemChain: Chain;
    confirmations: number;
    finalityConfirmations?: number;
    finalityTagEnabled?: boolean;
    addresses?: {
        conceroVerifier?: Address;
        conceroRouter: Address;
    };
};
//# sourceMappingURL=ConceroNetwork.d.ts.map