import { LoggerInterface } from '@/types';
import { jest } from '@jest/globals';

export class MockLogger implements LoggerInterface {
    error = jest.fn();
    warn = jest.fn();
    info = jest.fn();
    debug = jest.fn();
}
