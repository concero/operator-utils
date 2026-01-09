import { zeroAddress } from 'viem';

import { ViemClientManager } from '../../managers';
import { ConceroNetwork } from '../../types';
import { Chain } from '../types';

export interface IBalanceManagerSender {
    send: (options: {
        chain: Chain;
        network: ConceroNetwork;
        expectedBalance: bigint;
        actualBalance: bigint;
    }) => Promise<void>;
}
type Options = {
    pollingInterval?: number;
    gasLimit?: number;
    actionsCount?: number;
    viemClientManager: ViemClientManager;
    sender: IBalanceManagerSender;
};

export class BalanceManager {
    private readonly _gasLimit: number;
    private readonly _actionsCount: number;
    private readonly _pollingInterval: number;
    private readonly _viemClientManager: ViemClientManager;
    private readonly _sender: IBalanceManagerSender;

    private _networks: ConceroNetwork[] = [];
    private _chains: Record<Chain['name'], Chain> = {};

    constructor(options: Options) {
        this._gasLimit = options.gasLimit ?? 300_000;
        this._actionsCount = options.actionsCount ?? 100;
        this._pollingInterval = options.pollingInterval ?? 30 * 60_000;
        this._viemClientManager = options.viemClientManager;
        this._sender = options.sender;
    }

    async setNetworks(networks: ConceroNetwork[]) {
        this._networks = networks;
    }

    async setChains(chains: Record<Chain['name'], Chain>) {
        this._chains = chains;
    }

    async startPolling(): Promise<void> {
        setTimeout(async () => {
            await Promise.all(this._networks.map(this.processNetwork));
        }, this._pollingInterval);
    }

    private async processNetwork(network: ConceroNetwork) {
        try {
            const chain = this._chains[network.name];

            const viemClients = this._viemClientManager.getClients(network.name);
            const [baseFee, actualBalance] = await Promise.all([
                viemClients.publicClient.getBlobBaseFee(),
                viemClients.publicClient.getBalance({
                    address: zeroAddress,
                }),
            ]);

            const expectedBalance =
                (baseFee / BigInt(Math.pow(10, chain.nativeCurrency.decimals))) *
                BigInt(this._gasLimit) *
                BigInt(this._actionsCount);

            if (expectedBalance < actualBalance) {
                await this._sender.send({
                    chain,
                    actualBalance,
                    expectedBalance,
                    network,
                });
            }
        } catch (e) {
        } finally {
        }
    }
}
