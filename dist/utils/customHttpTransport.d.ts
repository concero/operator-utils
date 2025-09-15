import { Transport } from 'viem';
export interface HttpTransportConfig {
    timeout: number;
    batch: boolean;
    retryCount: number;
    retryDelay: number;
}
export declare function createCustomHttpTransport(url: string, config: Partial<HttpTransportConfig>): Transport;
//# sourceMappingURL=customHttpTransport.d.ts.map