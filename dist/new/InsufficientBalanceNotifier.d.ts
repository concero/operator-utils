import { Address } from 'viem';
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
    actionsCount: number;
    viemClientManager: ViemClientManager;
    networkManager: ConceroNetworkManager;
    sender: INotifier;
    logger: ILogger;
    address: Address;
    buildMessage: BuildMessageFunc;
}
export declare class InsufficientBalanceNotifier {
    private readonly gasLimit;
    private readonly txCount;
    private readonly pollingInterval;
    private readonly viemClientManager;
    private readonly notifier;
    private readonly logger;
    private readonly address;
    private readonly buildMessage;
    private readonly networkManager;
    constructor(options: Options);
    startPolling(): Promise<NodeJS.Timeout>;
    private processNetwork;
    private fetchBaseFeeAndBalance;
    private estimateFee;
}
export {};
//# sourceMappingURL=InsufficientBalanceNotifier.d.ts.map