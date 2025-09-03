import { zeroAddress } from 'viem';
import { BalanceManager } from '@/managers/BalanceManager';
import {
    BalanceManagerConfig,
    ConceroNetwork,
    ITxReader,
    IViemClientManager,
    LoggerInterface,
} from '@/types';

import { mockConceroNetwork } from '../mocks/ConceroNetwork';
import { MockLogger } from '../mocks/Logger';
import { MockTxReader } from '../mocks/TxReader';
import { MockViemClientManager } from '../mocks/ViemClientManager';

class TestBalanceManager extends BalanceManager {
    constructor(
        logger: LoggerInterface,
        viemClientManager: IViemClientManager,
        txReader: ITxReader,
        config: BalanceManagerConfig,
    ) {
        super(logger, viemClientManager, txReader, config);
    }

    public getActiveNetworks(): ConceroNetwork[] {
        return this.activeNetworks;
    }

    public getWatcherIds(): string[] {
        return this.watcherIds;
    }
}

describe('BalanceManager', () => {
    let balanceManager: TestBalanceManager;
    let logger: MockLogger;
    let viemClientManager: MockViemClientManager;
    let txReader: MockTxReader;
    let config: BalanceManagerConfig;

    beforeEach(() => {
        logger = new MockLogger();
        viemClientManager = new MockViemClientManager();
        txReader = new MockTxReader();
        config = {
            minAllowances: {},
            pollingIntervalMs: 10000,
        };
        balanceManager = new TestBalanceManager(logger, viemClientManager, txReader, config);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize correctly', async () => {
        await balanceManager.initialize();
        expect(logger.info).toHaveBeenCalledWith('BalanceManager initialized');
    });

    it('should register and deregister a native token', () => {
        balanceManager.registerToken(mockConceroNetwork, 'NATIVE', zeroAddress);
        // @ts-ignore
        expect(balanceManager.registeredNativeBalances.has(mockConceroNetwork.name)).toBe(true);

        balanceManager.deregisterToken(mockConceroNetwork.name, 'NATIVE', zeroAddress);
        // @ts-ignore
        expect(balanceManager.registeredNativeBalances.has(mockConceroNetwork.name)).toBe(false);
    });

    it('should register and deregister an ERC20 token', () => {
        const tokenAddress = '0x123';
        balanceManager.registerToken(mockConceroNetwork, 'TKN', tokenAddress as any);
        // @ts-ignore
        expect(balanceManager.registeredTokens.get(mockConceroNetwork.name)?.get('TKN')).toBe(
            tokenAddress,
        );

        balanceManager.deregisterToken(mockConceroNetwork.name, 'TKN', tokenAddress as any);
        // @ts-ignore
        expect(balanceManager.registeredTokens.has(mockConceroNetwork.name)).toBe(false);
    });

    it('should set active networks', () => {
        const networks = [mockConceroNetwork];
        balanceManager.setActiveNetworks(networks);
        expect(balanceManager.getActiveNetworks()).toEqual(networks);
    });

    it('should begin watching balances', () => {
        const tokenAddress = '0x123';
        balanceManager.registerToken(mockConceroNetwork, 'NATIVE', zeroAddress);
        balanceManager.registerToken(mockConceroNetwork, 'TKN', tokenAddress as any);
        balanceManager.setActiveNetworks([mockConceroNetwork]);
        balanceManager.beginWatching();

        expect(txReader.methodWatcher.create).toHaveBeenCalled();
        expect(txReader.readContractWatcher.create).toHaveBeenCalled();
    });

    it('should force update balances', async () => {
        const networks = [mockConceroNetwork];
        balanceManager.setActiveNetworks(networks);
        await balanceManager.forceUpdate();
        expect(logger.debug).toHaveBeenCalledWith('Balances force-updated');
    });

    it('should get native balances', () => {
        const balances = balanceManager.getNativeBalances();
        expect(balances).toBeInstanceOf(Map);
    });

    it('should get token balance', () => {
        const balance = balanceManager.getTokenBalance(mockConceroNetwork.name, 'TKN');
        expect(balance).toBe(0n);
    });

    it('should get total token balance', () => {
        const balance = balanceManager.getTotalTokenBalance('TKN');
        expect(balance).toBe(0n);
    });

    it('should ensure allowance', async () => {
        const tokenAddress = '0x123';
        const spenderAddress = '0x456';
        const requiredAmount = 100n;

        balanceManager.setActiveNetworks([mockConceroNetwork]);
        await balanceManager.ensureAllowance(
            mockConceroNetwork.name,
            tokenAddress,
            spenderAddress,
            requiredAmount,
        );

        expect(logger.info).toHaveBeenCalledWith('Allowance updated to 100 on test-network');
    });

    it('should get allowance', async () => {
        const tokenAddress = '0x123';
        const spenderAddress = '0x456';

        balanceManager.setActiveNetworks([mockConceroNetwork]);
        const allowance = await balanceManager.getAllowance(
            mockConceroNetwork.name,
            tokenAddress,
            spenderAddress,
        );

        expect(allowance).toBe(50n);
    });
});
