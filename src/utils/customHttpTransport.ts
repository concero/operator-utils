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
                .then(rawBody => {
                    try {
                        const body = JSON.parse(rawBody);
                        logger.debug(`${body} → ${request.url} params: ${body?.params ?? []}`);
                    } catch (e) {
                        logger.error('Failed to parse raw body json', e);
                    }
                })
                .catch(e => logger.debug(e));
        },
        onFetchResponse: response => {
            response
                .json()
                .then(rawBody => {
                    try {
                        const body = JSON.parse(rawBody);
                        logger.debug(`${body} ← ${response.url} status: ${response.status}`);
                    } catch (e) {
                        logger.error(`Failed to parse raw body json: ${e}`);
                    }
                })
                .catch(e => logger.debug(e));
        },
    });
}
