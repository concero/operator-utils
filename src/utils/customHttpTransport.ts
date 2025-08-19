import { Logger } from './Logger';

import { Transport, http } from 'viem';

export interface HttpTransportConfig {
    timeout: number;
    batch: boolean;
    retryCount: number;
    retryDelay: number;
}

export function createCustomHttpTransport(
    url: string,
    config: Partial<HttpTransportConfig>,
): Transport {
    const logger = Logger.getInstance().getLogger('ViemTransport');

    return http(url, {
        ...config,
        onFetchRequest: request => {
            request
                .clone()
                .json()
                .then(body => {
                    try {
                        logger.debug(`${JSON.stringify(body)} → ${request.url}`);
                    } catch (e) {
                        logger.debug(`Failed to log onFetchRequest: ${e}`);
                    }
                })
                .catch(e => logger.debug(e));
        },
        onFetchResponse: async response => {
            try {
                const body = await response.clone().json();
                logger.debug(
                    `${JSON.stringify(body)} ← ${response.url} status: ${response.status}`,
                );
            } catch (e) {
                logger.debug(`Failed to log onFetchResponse: ${e}`);
            }
        },
    });
}
