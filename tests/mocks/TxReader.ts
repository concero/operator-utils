import { ITxReader } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockTxReader implements ITxReader {
    getLogs = jest.fn().mockResolvedValue([]);
    logWatcher = {
        create: jest.fn().mockReturnValue('watcher-id'),
        remove: jest.fn().mockReturnValue(true),
    };
    readContractWatcher = {
        create: jest.fn().mockReturnValue('watcher-id'),
        remove: jest.fn().mockReturnValue(true),
    };
    methodWatcher = {
        create: jest.fn().mockReturnValue('watcher-id'),
        remove: jest.fn().mockReturnValue(true),
    };
    initialize = jest.fn().mockResolvedValue(undefined);
    dispose = jest.fn();
}
