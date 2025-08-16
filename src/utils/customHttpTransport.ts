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
    config: Partial<HttpTransportConfig>
  ): Transport {
    const logger = Logger.getInstance().getLogger('ViemTransport');

    return (transportConfig) => {
      const transport = http(url, config)(transportConfig);

      const originalRequest = transport.request.bind(transport);

      transport.request = async (args: { method: string; params?: unknown }) => {
        logger.debug(`${args.method} → ${url} params=${JSON.stringify(args.params ?? [])}`);

        try {
          const result = await originalRequest(args);
          logger.debug(`${args.method} ← OK`);
          return result;
        } catch (err: any) {
          logger.error(`${args.method} ← ERROR: ${err?.message ?? String(err)}`);
          throw err;
        }
      };

      return transport;
    };
  }
