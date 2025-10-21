import { Hash, SimulateContractParameters } from 'viem';

import { ITxResultSubscriber, TxNotificationHub } from 'src/types/managers/ITxResultSubscriber';
import { TxWriterConfig } from '../types';
import { ConceroNetwork } from '../types/ConceroNetwork';
import { INonceManager, ITxMonitor, IViemClientManager } from '../types/managers';
import { ILogger } from '../types/managers/ILogger';
import { ITxWriter } from '../types/managers/ITxWriter';
import { callContract } from '../utils';

type OpCtx = {
    network: ConceroNetwork;
    params: SimulateContractParameters;
    ensureTxFinality: boolean;
    attempt: number;
};

export class TxWriter implements ITxWriter, ITxResultSubscriber {
    private static instance: TxWriter | undefined;
    private viemClientManager: IViemClientManager;
    private txMonitor: ITxMonitor;
    private logger: ILogger;
    private config: TxWriterConfig;
    private nonceManager: INonceManager;

    private readonly ctxByTx = new Map<Hash, OpCtx>();

    public readonly id = 'tx-writer';

    private static readonly BACKOFF_SECONDS = [5, 10, 30, 120, 300, 600, 1200, 3600] as const;

    private constructor(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
    ) {
        this.viemClientManager = viemClientManager;
        this.txMonitor = txMonitor;
        this.logger = logger;
        this.config = config;
        this.nonceManager = nonceManager;

        TxNotificationHub.getInstance().register(this);
    }

    static createInstance(
        logger: ILogger,
        viemClientManager: IViemClientManager,
        txMonitor: ITxMonitor,
        nonceManager: INonceManager,
        config: TxWriterConfig,
    ): TxWriter {
        TxWriter.instance = new TxWriter(
            logger,
            viemClientManager,
            txMonitor,
            nonceManager,
            config,
        );
        return TxWriter.instance;
    }

    static getInstance(): TxWriter {
        if (!TxWriter.instance) throw new Error('TxWriter is not initialized.');
        return TxWriter.instance;
    }

    get name(): string {
        return 'TxWriter';
    }
    async initialize(): Promise<void> {
        this.logger.info('Initialized');
    }

    public async callContract(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality = false,
    ): Promise<Hash> {
        const hash = await this.send(network, params, ensureTxFinality, 1);
        return hash;
    }

    public async notifyTxResult({ txHash, chainName, type, success }: any): Promise<void> {
        const ctx = this.ctxByTx.get(txHash as Hash);
        if (!ctx) {
            return;
        }

        if (success) {
            this.logger.debug(`[${chainName}] ${type} OK for ${txHash}, attempt ${ctx.attempt}`);
            this.ctxByTx.delete(txHash as Hash);
            return;
        }

        if (ctx.ensureTxFinality) {
            this.logger.error(`[${chainName}] finality failed for ${txHash} — no retry by writer`);
            this.ctxByTx.delete(txHash as Hash);
            return;
        }

        const delaySec = this.nextDelaySeconds(ctx.attempt);
        this.logger.warn(
            `[${chainName}] inclusion failed for ${txHash}, retry in ${delaySec}s (attempt ${ctx.attempt + 1})`,
        );

        setTimeout(async () => {
            try {
                await this.nonceManager.refresh(chainName);
                const newHash = await this.send(ctx.network, ctx.params, false, ctx.attempt + 1);
                this.ctxByTx.delete(txHash as Hash);
                this.logger.info(`[${chainName}] resent -> ${newHash}`);
            } catch (e) {
                this.logger.error(`[${chainName}] resend failed: ${e}`);
            }
        }, delaySec * 1000);
    }

    private async send(
        network: ConceroNetwork,
        params: SimulateContractParameters,
        ensureTxFinality: boolean,
        attempt: number,
    ): Promise<Hash> {
        const { walletClient, publicClient } = this.viemClientManager.getClients(network.name);

        if (this.config.dryRun) {
            this.logger.info(`[DRY_RUN][${network.name}] Contract call: ${params.functionName}`);
            return `0xdry${Date.now().toString(16)}` as Hash;
        }

        const txHash = await callContract(publicClient, walletClient, params, this.nonceManager, {
            simulateTx: this.config.simulateTx,
            defaultGasLimit: this.config.defaultGasLimit,
        });

        this.ctxByTx.set(txHash, { network, params, ensureTxFinality, attempt });

        if (ensureTxFinality) {
            this.txMonitor.trackTxFinality(txHash, network.name, this.id);
        } else {
            this.txMonitor.trackTxInclusion(txHash, network.name, this.id, 1);
        }

        return txHash;
    }

    private nextDelaySeconds(attempt: number): number {
        const last = TxWriter.BACKOFF_SECONDS[TxWriter.BACKOFF_SECONDS.length - 1];
        return attempt <= TxWriter.BACKOFF_SECONDS.length
            ? TxWriter.BACKOFF_SECONDS[attempt - 1]
            : last;
    }
}
