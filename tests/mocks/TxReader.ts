import { jest } from '@jest/globals';

import { ITxReader } from '../../src/types/managers';

export class MockTxReader implements ITxReader {
    getLogs = jest.fn().mockResolvedValue([] as any[]);
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
    initialize = jest.fn().mockResolvedValue(undefined as void);
    dispose = jest.fn().mockResolvedValue(undefined as void);
}
