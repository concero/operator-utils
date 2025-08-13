import { ITxMonitor } from '@/types/managers';
import { jest } from '@jest/globals';

export class MockTxMonitor implements ITxMonitor {
    ensureTxFinality = jest.fn();
    checkTransactionsInRange = jest.fn().mockResolvedValue(undefined);
    getMonitoredTransactions = jest.fn().mockReturnValue([]);
    dispose = jest.fn();
}
