type ProfilerOptions = {
    profileDir?: string;
    intervalMs?: number;
};
export declare class Profiler {
    private session;
    private profileDir;
    private intervalMs;
    private intervalHandle;
    private snapshotCount;
    constructor(options?: ProfilerOptions);
    private post;
    private saveSnapshot;
    start(): Promise<void>;
    stop(): void;
}
export {};
//# sourceMappingURL=profiler.d.ts.map