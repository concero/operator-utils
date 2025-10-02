import { Address } from 'viem';
export interface ILogsListenerBlockCheckpointStore {
    getBlockCheckpoint(chainSelector: number, contractAddress: Address): Promise<bigint>;
    updateBlockCheckpoint(chainSelector: number, contractAddress: Address, blockNumber: bigint): Promise<void>;
}
//# sourceMappingURL=ILogsListenerBlockCheckpointStore.d.ts.map