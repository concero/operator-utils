import { IBlockCheckpointManager } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockBlockCheckpointManager implements IBlockCheckpointManager {
    initialize = jest.fn().mockResolvedValue(undefined);
    getCheckpoint = jest.fn().mockResolvedValue(undefined);
    updateLastProcessedBlock = jest.fn().mockResolvedValue(undefined);
    dispose = jest.fn();
}
