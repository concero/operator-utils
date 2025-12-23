import { AxiosRequestConfig } from 'axios';
import { ManagerBase } from '../managers';
import { LoggerInterface } from '../managers/Logger';
import { HttpClientConfig } from '../types';
export declare class HttpClient extends ManagerBase {
    private static instance?;
    private axiosInstance?;
    private logger;
    private config;
    constructor(logger: LoggerInterface, config: HttpClientConfig);
    static createInstance(logger: LoggerInterface, config: HttpClientConfig): HttpClient;
    static getInstance(): HttpClient;
    initialize(): Promise<void>;
    private setupAxiosInstance;
    private request;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, body: any, config?: AxiosRequestConfig): Promise<T>;
}
//# sourceMappingURL=HttpClient.d.ts.map