import { ManagerBase } from './ManagerBase';
import { ViemClientManager } from './ViemClientManager';
import { Mutex } from 'async-mutex';

import { ILogger, INonceManager, NonceManagerConfig } from '../types';

// @ts-ignore @todo: fix typings
export class NonceManager extends ManagerBase implements INonceManager {
    private static instance: NonceManager | null = null;
    private noncesMap: Record<string, number> = {};
    private mutexMap: Record<string, Mutex> = {};
    private logger: ILogger;
    private config: NonceManagerConfig;
    private viemClientManager: ViemClientManager;

    protected constructor(
        logger: ILogger,
        viemClientManager: ViemClientManager,
        config: NonceManagerConfig,
    ) {
        super();
        this.logger = logger;
        this.viemClientManager = viemClientManager;
        this.config = config;
    }

    static createInstance(
        logger: ILogger,
        viemClientManager: ViemClientManager,
        config: NonceManagerConfig,
    ): NonceManager {
        if (!NonceManager.instance) {
            NonceManager.instance = new NonceManager(logger, viemClientManager, config);
        }
        return NonceManager.instance;
    }

    static getInstance(): NonceManager {
        if (!NonceManager.instance) {
            throw new Error(
                'NonceManager instance has not been created. Call createInstance() first.',
            );
        }
        return NonceManager.instance;
    }

    public async get(networkName: string): Promise<number> {
        const mutex = this.getMutex(networkName);
        return mutex.runExclusive(async () => {
            return this.getOrLoadNonce(networkName);
        });
    }

    public async consume(networkName: string): Promise<number> {
        const mutex = this.getMutex(networkName);
        return mutex.runExclusive(async () => {
            const nonce = await this.getOrLoadNonce(networkName);
            this.set(networkName, nonce + 1);
            this.logger.debug(`Consumed nonce for network ${networkName}: ${nonce}`);
            return nonce;
        });
    }

    public reset(networkName: string): void {
        this.set(networkName, 0);
    }

    public async refresh(networkName: string): Promise<void> {
        const mutex = this.getMutex(networkName);
        return mutex.runExclusive(async () => {
            const freshNonce = await this.fetchNonce(networkName);
            this.set(networkName, freshNonce);
            this.logger.debug(`Force refreshed nonce for network ${networkName}: ${freshNonce}`);
        });
    }

    public async decrement(networkName: string): Promise<void> {
        const mutex = this.getMutex(networkName);
        return mutex.runExclusive(async () => {
            const nonce = await this.getOrLoadNonce(networkName);
            if (nonce > 0) {
                this.set(networkName, nonce - 1);
                this.logger.debug(`Decremented nonce for network ${networkName} to ${nonce - 1}`);
            } else {
                this.logger.warn(
                    `Nonce for network ${networkName} is already at 0, cannot decrement`,
                );
            }
        });
    }

    private set(networkName: string, nonce: number): void {
        this.noncesMap[networkName] = nonce;
    }

    private async getOrLoadNonce(networkName: string): Promise<number> {
        let nonce = this.noncesMap[networkName];
        if (nonce === null || nonce === undefined) {
            nonce = await this.fetchNonce(networkName);
            this.noncesMap[networkName] = nonce;
        }
        return nonce;
    }

    private async fetchNonce(networkName: string): Promise<number> {
        const clients = this.viemClientManager.getClients(networkName);
        const { publicClient, walletClient } = clients;
        // @ts-ignore @todo: fix typings
        const address = walletClient.account.address;

        return await publicClient.getTransactionCount({ address, blockTag: 'pending' });
    }

    private getMutex(networkName: string): Mutex {
        if (!this.mutexMap[networkName]) {
            this.mutexMap[networkName] = new Mutex();
        }
        return this.mutexMap[networkName];
    }
}
