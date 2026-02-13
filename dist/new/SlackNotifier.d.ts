import { ILogger } from '../types';
import { INotifier } from './types/Notifier';
interface SlackNotifierConfig {
    channelId: string;
    botToken: string;
    batchWaitMs: number;
}
export declare class SlackNotifier implements INotifier {
    private readonly config;
    private readonly logger;
    private messages;
    private readonly slackClient;
    private flushTimer;
    constructor(config: SlackNotifierConfig, logger: ILogger);
    notify(message: string): Promise<void>;
    private batchSendMessages;
    private sendMessage;
}
export {};
//# sourceMappingURL=SlackNotifier.d.ts.map