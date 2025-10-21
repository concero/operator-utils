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

export class TxNotificationHub {
    private static instance: TxNotificationHub | undefined;
    static getInstance() {
        if (!this.instance) this.instance = new TxNotificationHub();
        return this.instance;
    }

    private sinks = new Map<string, ITxResultSubscriber>();

    register(sub: ITxResultSubscriber) {
        this.sinks.set(sub.id, sub);
    }

    async notify(subscriberId: string, payload: TxResultNotification) {
        const sub = this.sinks.get(subscriberId);
        if (!sub) return; // maybe add log if initializing
        await sub.notifyTxResult(payload).catch(() => {});
    }

    async notifyMany(subscriberIds: string[], payload: TxResultNotification) {
        await Promise.all(subscriberIds.map(id => this.notify(id, payload)));
    }
}
