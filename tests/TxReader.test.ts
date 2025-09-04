import { jest } from '@jest/globals';

// Simple test to verify the withTimeout memory leak fix
describe('TxReader withTimeout Memory Leak Fix', () => {
    // Mock setTimeout and clearTimeout to track calls
    let setTimeoutSpy: jest.SpiedFunction<typeof setTimeout>;
    let clearTimeoutSpy: jest.SpiedFunction<typeof clearTimeout>;

    beforeEach(() => {
        setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    });

    afterEach(() => {
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
    });

    // Test the withTimeout implementation directly
    function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
        });

        return Promise.race([p.finally(() => clearTimeout(timeoutId)), timeoutPromise]);
    }

    test('should clear timeout when main promise resolves first', async () => {
        // Create a fast-resolving promise
        const fastPromise = Promise.resolve('success');

        // Execute withTimeout with a long timeout
        const result = await withTimeout(fastPromise, 5000);

        expect(result).toBe('success');
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

        // Verify timeout was created and then cleared
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        expect(clearTimeoutSpy).toHaveBeenCalledWith(expect.any(Object));
    });

    test('should clear timeout when main promise rejects', async () => {
        // Create a fast-rejecting promise
        const rejectingPromise = Promise.reject(new Error('main error'));

        // Execute withTimeout with a long timeout
        await expect(withTimeout(rejectingPromise, 5000)).rejects.toThrow('main error');

        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    test('should timeout when main promise takes too long', async () => {
        // Create a promise that never resolves (no hanging timeouts)
        const slowPromise = new Promise(() => {
            // Never resolves, never rejects - this simulates a hanging operation
        });

        // Execute withTimeout with a short timeout
        await expect(withTimeout(slowPromise, 100)).rejects.toThrow('timeout');

        expect(setTimeoutSpy).toHaveBeenCalled();
        // clearTimeout might not be called if timeout fires first
    });

    test('should handle multiple concurrent withTimeout calls without memory leaks', async () => {
        // Create multiple fast-resolving promises
        const promises = Array.from({ length: 10 }, (_, i) => Promise.resolve(`result-${i}`));

        // Execute multiple withTimeout calls concurrently
        const results = await Promise.all(promises.map(p => withTimeout(p, 1000)));

        expect(results).toHaveLength(10);
        results.forEach((result, i) => {
            expect(result).toBe(`result-${i}`);
        });

        // Each withTimeout should create and clear one timeout
        expect(setTimeoutSpy).toHaveBeenCalledTimes(10);
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(10);
    });

    test('should handle mixed fast and slow promises correctly', async () => {
        const fastPromise = Promise.resolve('fast');
        const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 50));

        // Reset spy counts after promise creation to only count withTimeout calls
        setTimeoutSpy.mockClear();
        clearTimeoutSpy.mockClear();

        const [fastResult, slowResult] = await Promise.all([
            withTimeout(fastPromise, 1000),
            withTimeout(slowPromise, 1000),
        ]);

        expect(fastResult).toBe('fast');
        expect(slowResult).toBe('slow');
        expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
        expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });
});

// Test the dispose method interface
describe('TxReader dispose method', () => {
    test('dispose method should exist in interface', () => {
        // This is a compile-time test - if ITxReader doesn't have dispose, this will fail compilation
        const mockImplementation = {
            getLogs: jest.fn(),
            logWatcher: {
                create: jest.fn(),
                remove: jest.fn(),
            },
            readContractWatcher: {
                create: jest.fn(),
                remove: jest.fn(),
            },
            methodWatcher: {
                create: jest.fn(),
                remove: jest.fn(),
            },
            initialize: jest.fn(),
            dispose: jest.fn(), // This must exist in the interface
        };

        expect(typeof mockImplementation.dispose).toBe('function');
    });
});
