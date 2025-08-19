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

    return transportConfig => {
        return http(url, {
            ...config,
            onFetchRequest: request => {
                request
                    .clone()
                    .json()
                    .then(body => {
                        logger.debug(`${body} → ${request.url} params=${body?.params ?? []}`);
                    })
                    .catch(e => logger.debug(e));
            },
            onFetchResponse: response => {
                response.json().then(body => {
                    logger.debug(`${body} ← ${response.url} status: ${response.status}`);
                });
            },
        })(transportConfig);
    };
}
