export abstract class ManagerBase {
    protected initialized: boolean = false;

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }
        try {
            this.initialized = true;
        } catch (error) {
            throw error;
        }
    }
}
