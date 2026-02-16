import { Address, PublicClient } from 'viem';

import { ConceroNetworkManager, ViemClientManager } from '../managers';
import { ConceroNetwork, ILogger } from '../types';
import { INotifier } from './types/Notifier';

export interface IBuildMessageParams {
    expectedBalance: bigint;
    actualBalance: bigint;
    network: ConceroNetwork;
}

export type BuildMessageFunc = (params: IBuildMessageParams) => string;

interface Options {
    pollingInterval: number;
    gasLimit: number;
    gasLimitsConfig?: Record<number, bigint>;
    actionsCount: number;
    viemClientManager: ViemClientManager;
    networkManager: ConceroNetworkManager;
    sender: INotifier;
    logger: ILogger;
    address: Address;
    buildMessage: BuildMessageFunc;
}

export class InsufficientBalanceNotifier {
    private readonly gasLimit: number;
    private readonly gasLimitsConfig: Record<number, bigint>;
    private readonly txCount: number;
    private readonly pollingInterval: number;
    private readonly viemClientManager: ViemClientManager;
    private readonly notifier: INotifier;
    private readonly logger: ILogger;
    private readonly address: Address;
    private readonly buildMessage: BuildMessageFunc;
    private readonly networkManager: ConceroNetworkManager;

    constructor(options: Options) {
        this.gasLimit = options.gasLimit;
        this.gasLimitsConfig = options.gasLimitsConfig ?? {};
        this.txCount = options.actionsCount;
        this.pollingInterval = options.pollingInterval;
        this.viemClientManager = options.viemClientManager;
        this.notifier = options.sender;
        this.networkManager = options.networkManager;
        this.logger = options.logger;
        this.address = options.address;
        this.buildMessage = options.buildMessage;
    }

    async startPolling(): Promise<NodeJS.Timeout> {
        const poll = async () => {
            await Promise.all(
                this.networkManager.getActiveNetworks().map(n => this.processNetwork(n)),
            );
        };

        await poll();
        return setInterval(poll, this.pollingInterval);
    }

    private async processNetwork(network: ConceroNetwork) {
        try {
            const { balance: actualBalance, fee } = await this.fetchBaseFeeAndBalance(
                network.name,
                this.address,
            );

            const gasLimit = this.gasLimitsConfig[network.id] ?? BigInt(this.gasLimit);
            const expectedBalance = fee * BigInt(gasLimit) * BigInt(this.txCount);

            if (actualBalance < expectedBalance) {
                await this.notifier.notify(
                    this.buildMessage({
                        expectedBalance,
                        actualBalance,
                        network,
                    }),
                );
            }
        } catch (e) {
            this.logger.error(`Error in processNetwork ${e}`);
        }
    }

    private async fetchBaseFeeAndBalance(
        networkName: ConceroNetwork['name'],
        address: Address,
    ): Promise<{ balance: bigint; fee: bigint }> {
        const { publicClient } = this.viemClientManager.getClients(networkName);

        const [balance, fee] = await Promise.all([
            publicClient.getBalance({ address }),
            this.estimateFee(publicClient),
        ]);

        return { balance, fee };
    }

    private async estimateFee(publicClient: PublicClient): Promise<bigint> {
        try {
            const fee = await publicClient.estimateFeesPerGas();
            return fee.maxFeePerGas;
        } catch {
            return await publicClient.getGasPrice();
        }
    }
}
