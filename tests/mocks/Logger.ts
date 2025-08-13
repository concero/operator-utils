import { LoggerInterface } from '@/types';

export class MockLogger implements LoggerInterface {
    error = jest.fn();
    warn = jest.fn();
    info = jest.fn();
    debug = jest.fn();
}
