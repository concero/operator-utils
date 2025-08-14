import { NonceManager } from '@/managers/NonceManager';
import { TxWriter } from '@/managers/TxWriter';
import * as callContractUtil from '@/utils/callContract';

import { v4 as uuidv4 } from 'uuid';
import { SimulateContractParameters } from 'viem';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockTxMonitor } from '../mocks/TxMonitor';
import { MockViemClientManager } from '../mocks/ViemClientManager';

jest.mock('@/utils/callContract');
jest.mock('uuid');

describe('TxWriter', () => {
    let logger: MockLogger;
    let txWriter: TxWriter;
    let viemClientManager: MockViemClientManager;
    let txMonitor: MockTxMonitor;
    let nonceManager: NonceManager;

    beforeEach(() => {
        logger = new MockLogger();
        viemClientManager = new MockViemClientManager();
        txMonitor = new MockTxMonitor();
        nonceManager = NonceManager.createInstance(logger, {});
        (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');

        txWriter = TxWriter.createInstance(logger, viemClientManager, txMonitor, nonceManager, {
            dryRun: false,
            simulateTx: true,
            defaultGasLimit: 100000n,
        });
    });

    afterEach(() => {
        TxWriter.dispose();
        NonceManager.dispose();
        jest.clearAllMocks();
    });

    it('should call a contract and monitor the transaction', async () => {
        const callContractMock = callContractUtil.callContract as jest.Mock;
        callContractMock.mockResolvedValue('0x123');

        const params: SimulateContractParameters = {
            address: '0x456',
            abi: [],
            functionName: 'testFunction',
            args: [],
        };

        const txHash = await txWriter.callContract(mockConceroNetwork, params);

        expect(txHash).toBe('0x123');
        expect(callContractMock).toHaveBeenCalled();
        expect(txMonitor.ensureTxFinality).toHaveBeenCalled();
    });

    it('should handle dry run mode', async () => {
        const dryRunTxWriter = TxWriter.createInstance(
            logger,
            viemClientManager,
            txMonitor,
            nonceManager,
            {
                dryRun: true,
                simulateTx: true,
                defaultGasLimit: 100000n,
            },
        );

        const params: SimulateContractParameters = {
            address: '0x456',
            abi: [],
            functionName: 'testFunction',
            args: [],
        };

        const txHash = await dryRunTxWriter.callContract(mockConceroNetwork, params);

        expect(txHash).toMatch(/^0xdry/);
        expect(logger.info).toHaveBeenCalledWith(
            '[DRY_RUN][test-network] Contract call: testFunction',
        );
    });

    it('should handle contract call errors', async () => {
        const callContractMock = callContractUtil.callContract as jest.Mock;
        callContractMock.mockRejectedValue(new Error('Contract error'));

        const params: SimulateContractParameters = {
            address: '0x456',
            abi: [],
            functionName: 'testFunction',
            args: [],
        };

        await expect(txWriter.callContract(mockConceroNetwork, params)).rejects.toThrow(
            'Contract error',
        );
    });
});
