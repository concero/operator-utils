import { WebClient } from '@slack/web-api';

import { ILogger } from '../types';
import { INotifier } from './types/Notifier';

interface SlackNotifierConfig {
    channelId: string;
    botToken: string;
    batchWaitMs: number;
}

export class SlackNotifier implements INotifier {
    private messages: string[] = [];
    private readonly slackClient;
    private flushTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly config: SlackNotifierConfig,
        private readonly logger: ILogger,
    ) {
        this.slackClient = new WebClient(this.config.botToken);
    }

    // @dev lets keep it async for now cuz I'm not sure about INotifier interface
    public async notify(message: string) {
        this.messages.push(message);

        if (this.flushTimer) return;

        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.batchSendMessages();
        }, this.config.batchWaitMs);
    }

    private async batchSendMessages() {
        const batch = this.messages.splice(0, this.messages.length);
        if (batch.length === 0) return;

        await this.sendMessage(batch.join('\n\n'));
    }

    private async sendMessage(message: string) {
        try {
            const res = await this.slackClient.chat.postMessage({
                channel: this.config.channelId,
                text: message,
            });

            if (!res.ok) {
                this.logger.error(`Failed to send message to slack: ${res.error}`);
            }
        } catch (error) {
            this.logger.error(`Error sending message to slack: ${message}`);
        }
    }
}
