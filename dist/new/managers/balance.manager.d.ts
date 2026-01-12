import { ViemClientManager } from '../../managers';
import { ConceroNetwork } from '../../types';
import { ConceroChain } from '../types';
export interface IBalanceManagerSender {
    send: (options: {
        chain: ConceroChain;
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
export declare class BalanceManager {
    private readonly _gasLimit;
    private readonly _actionsCount;
    private readonly _pollingInterval;
    private readonly _viemClientManager;
    private readonly _sender;
    private _networks;
    private _chains;
    constructor(options: Options);
    setNetworks(networks: ConceroNetwork[]): Promise<void>;
    setChains(chains: Record<ConceroChain['name'], ConceroChain>): Promise<void>;
    startPolling(): Promise<void>;
    private processNetwork;
}
export {};
//# sourceMappingURL=balance.manager.d.ts.map