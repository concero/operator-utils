import { Hash } from 'viem';
import { MonitorType } from './ITxMonitorStore';
export type TxResultNotification = {
    txHash: Hash;
    chainName: string;
    type: MonitorType;
    success: boolean;
    blockNumber?: bigint;
};
export interface ITxResultSubscriber {
    id: string;
    notifyTxResult(msg: TxResultNotification): Promise<void>;
}
export declare class TxNotificationHub {
    private static instance;
    static getInstance(): TxNotificationHub;
    private sinks;
    register(sub: ITxResultSubscriber): void;
    notify(subscriberId: string, payload: TxResultNotification): Promise<void>;
    notifyMany(subscriberIds: string[], payload: TxResultNotification): Promise<void>;
}
//# sourceMappingURL=ITxResultSubscriber.d.ts.map