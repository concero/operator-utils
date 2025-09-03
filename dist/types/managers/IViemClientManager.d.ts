import { NetworkUpdateListener } from './NetworkUpdateListener';
import { ViemClients } from '../../managers/ViemClientManager';
import { ConceroNetwork } from '../ConceroNetwork';
export interface IViemClientManager extends NetworkUpdateListener {
    initialize(): Promise<void>;
    getClients(networkName: string): ViemClients;
    updateClientsForNetworks(networks: ConceroNetwork[]): Promise<void>;
}
//# sourceMappingURL=IViemClientManager.d.ts.map