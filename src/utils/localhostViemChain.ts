import { defineChain } from 'viem';





export const localhostViemChain = defineChain({
    id: 1,
    name: 'localhost',
    nativeCurrency: {
        decimals: 18,
        name: 'eth',
        symbol: 'eth',
    },
    rpcUrls: {
        default: { http: [process.env.LOCALHOST_RPC_URL ?? ''] },
    },
    blockExplorers: [
        {
            name: 'localhost',
            // @ts-ignore @todo: fix typings
            url: process.env.LOCALHOST_RPC_URL,
        },
    ],
    testnet: true,
});
