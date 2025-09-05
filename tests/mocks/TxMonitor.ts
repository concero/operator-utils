import { ITxMonitor } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockTxMonitor implements ITxMonitor {
    ensureTxFinality = jest.fn();
    ensureTxInclusion = jest.fn();
}
