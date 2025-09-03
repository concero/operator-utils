import { NetworkUpdateListener } from './NetworkUpdateListener';

import { ViemClients } from '../../managers/ViemClientManager';
import { ConceroNetwork } from '../ConceroNetwork';

export interface IViemClientManager extends NetworkUpdateListener {
    initialize(): Promise<void>;
    getClients(networkName: string): ViemClients;
    updateClientsForNetworks(networks: ConceroNetwork[]): Promise<void>;
}

/** Configuration for ViemClientManager */
export interface ViemClientManagerConfig {
    operatorPrivateKey: string;
    fallbackTransportOptions: {
        rank?:
            | boolean
            | {
                  interval?: number;
                  sampleCount?: number;
                  staleThreshold?: number;
                  weight?: number;
              };
        retryCount?: number;
        retryDelay?: number;
        timeout?: number;
    };
    httpTransportConfig: {
        timeout: number;
        batch: boolean;
        retryCount: number;
        retryDelay: number;
    };
}
