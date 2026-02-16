export enum ConceroChainDeploymentType {
    Router = 'router',
    ValidatorLib = 'validatorLib',
    RelayerLib = 'relayerLib',
}

export type ConceroChain = {
    id: string;
    chainSelector: number;
    name: string;
    isTestnet: boolean;
    isFinalitySupported: boolean;
    finalityTagEnabled: boolean;
    finalityConfirmations: number;
    minBlockConfirmations: number;
    rpcUrls: string[];
    blockExplorers: {
        name: string;
        url: string;
        apiUrl: string;
    }[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    deployments: Partial<Record<ConceroChainDeploymentType, `0x${string}`>>;
};
