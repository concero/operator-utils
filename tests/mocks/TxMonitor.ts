import { ITxMonitor } from '@/types/managers';
import { jest } from '@jest/globals';

import { generateUid } from '../../src/utils';

export class MockTxMonitor implements ITxMonitor {
    ensureTxFinality = jest.fn();
    ensureTxInclusion = jest.fn();
    getMonitoredTransactions = jest.fn().mockReturnValue([]);
    dispose = jest.fn();
}
