import { AxiosRequestConfig } from "axios";
import { HttpClientConfig } from "../types/ManagerConfigs";
import { ManagerBase } from "../managers";
import { LoggerInterface } from "./Logger";
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
    dispose(): void;
    static disposeInstances(): void;
    private request;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, body: any, config?: AxiosRequestConfig): Promise<T>;
}
//# sourceMappingURL=HttpClient.d.ts.map