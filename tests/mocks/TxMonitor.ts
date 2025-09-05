import { ITxMonitor } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockTxMonitor implements ITxMonitor {
    ensureTxFinality: ITxMonitor['ensureTxFinality'] = jest.fn();
    ensureTxInclusion: ITxMonitor['ensureTxInclusion'] = jest.fn();
}
