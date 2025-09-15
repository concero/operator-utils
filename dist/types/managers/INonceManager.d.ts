export interface INonceManager {
    get(networkName: string): Promise<number>;
    consume(networkName: string): Promise<number>;
    reset(networkName: string): void;
    refresh(networkName: string): Promise<void>;
    set(networkName: string, nonce: number): void;
    decrement(networkName: string): Promise<void>;
    increment(networkName: string): Promise<void>;
    initialize(): Promise<void>;
}
/** Configuration for NonceManager */
export interface NonceManagerConfig {
}
//# sourceMappingURL=INonceManager.d.ts.map