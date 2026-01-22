import fs from 'fs';
import inspector from 'inspector';
import path from 'path';

type ProfilerOptions = {
    profileDir?: string; // Folder to save profiling files
    intervalMs?: number; // Interval between snapshots in milliseconds
};

export class Profiler {
    private session: inspector.Session;
    private profileDir: string;
    private intervalMs: number;
    private intervalHandle: NodeJS.Timeout | null = null;
    private snapshotCount = 0;

    constructor(options: ProfilerOptions = {}) {
        this.profileDir = options.profileDir ?? './profiles';
        this.intervalMs = options.intervalMs ?? 5 * 60 * 1000; // Default 5 minutes

        // Create directory if it doesn't exist
        if (!fs.existsSync(this.profileDir)) {
            fs.mkdirSync(this.profileDir, { recursive: true });
        }

        // Initialize inspector session
        this.session = new inspector.Session();
        this.session.connect();
    }

    // Helper function to send commands to the inspector
    private post<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
        return new Promise((resolve, reject) => {
            this.session.post(method, params, (err, result) => {
                if (err) reject(err);
                else resolve(result as T);
            });
        });
    }

    // Save CPU and HEAP snapshots
    private async saveSnapshot() {
        this.snapshotCount++;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const cpuFile = path.join(this.profileDir, `cpu_${timestamp}.cpuprofile`);
        const heapFile = path.join(this.profileDir, `heap_${timestamp}.heapsnapshot`);

        // Stop CPU profiler, get the snapshot
        const { profile } = await this.post<{ profile: inspector.Profiler.Profile }>(
            'Profiler.stop',
        );
        fs.writeFileSync(cpuFile, JSON.stringify(profile));

        // HEAP snapshot — write chunks directly to file to save memory
        const heapStream = fs.createWriteStream(heapFile);
        const onChunk = (m: any) => heapStream.write(m.params.chunk);
        this.session.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
        await this.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
        this.session.removeListener('HeapProfiler.addHeapSnapshotChunk', onChunk);
        heapStream.end();

        console.log(`Saved snapshot #${this.snapshotCount}: ${cpuFile} + ${heapFile}`);

        // Restart CPU profiler for the next interval
        await this.post('Profiler.start');
    }

    // Start the eternal profiling loop
    public async start() {
        await this.post('Profiler.enable');
        await this.post('HeapProfiler.enable');
        await this.post('Profiler.start');

        // Schedule periodic snapshots
        this.intervalHandle = setInterval(() => this.saveSnapshot(), this.intervalMs);
        console.log(`EternalProfiler started. Snapshot every ${this.intervalMs / 1000}s`);
    }

    // Stop the profiler and disconnect session
    public stop() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
            console.log('EternalProfiler stopped.');
        }
        this.session.disconnect();
    }
}
