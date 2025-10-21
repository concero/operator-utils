import { ITxMonitor } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockTxMonitor implements ITxMonitor {
    ensureTxFinality: ITxMonitor['ensureTxFinality'] = jest.fn();
    ensureTxInclusion: ITxMonitor['ensureTxInclusion'] = jest.fn();
    cancelMonitoring: ITxMonitor['cancelMonitoring'] = jest.fn();
    trackTxFinality: ITxMonitor['trackTxFinality'] = jest.fn();
    trackTxInclusion: ITxMonitor['trackTxInclusion'] = jest.fn();
}
