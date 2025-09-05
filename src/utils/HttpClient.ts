import { AppError } from './AppError';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { AppErrorEnum } from '../constants/appErrors';
import { ManagerBase } from '../managers';
import { LoggerInterface } from '../managers/Logger';
import { HttpClientConfig } from '../types/BaseManagerConfig';

export class HttpClient extends ManagerBase {
    private static instance?: HttpClient;

    private axiosInstance?: AxiosInstance;
    private logger: LoggerInterface;
    private config: HttpClientConfig;

    constructor(logger: LoggerInterface, config: HttpClientConfig) {
        super();

        this.logger = logger;
        this.config = config;
    }

    public static createInstance(logger: LoggerInterface, config: HttpClientConfig): HttpClient {
        this.instance = new HttpClient(logger, config);
        return this.instance;
    }

    public static getInstance(): HttpClient {
        return this.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            await this.setupAxiosInstance();
            await super.initialize();
        } catch (error) {
            throw error;
        }
    }

    private async setupAxiosInstance(): Promise<void> {
        this.axiosInstance = axios.create({
            timeout: this.config.defaultTimeout,
        });

        this.axiosInstance.interceptors.response.use(
            response => response,
            async error => {
                const config = error.config;
                const logger = this.logger;

                if (config && config.__retryCount < this.config.maxRetries) {
                    config.__retryCount = config.__retryCount || 0;
                    config.__retryCount += 1;

                    logger.debug(
                        `Retrying request to ${config.url}. Attempt ${config.__retryCount} of ${this.config.maxRetries}. Error: ${error.message}`,
                    );

                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

                    return this.axiosInstance!(config);
                }

                logger.debug(
                    `Request to ${config?.url} failed after ${config?.__retryCount || 0} attempts. Error: ${error.message}`,
                );
                throw new AppError(AppErrorEnum.FailedHTTPRequest, error);
            },
        );
    }

    private async request<T>(
        method: 'GET' | 'POST',
        url: string,
        config: AxiosRequestConfig = {},
        body?: any,
    ): Promise<T> {
        if (!this.initialized || !this.axiosInstance) {
            throw new AppError(
                AppErrorEnum.FailedHTTPRequest,
                new Error('HttpClient not initialized'),
            );
        }

        try {
            this.logger.debug(`${method} -> ${url} ${body && `with body: ${body}`}`.trim());

            const response: AxiosResponse<T> = await this.axiosInstance.request<T>({
                method,
                url,
                data: body,
                ...config,
            });

            return response.data;
        } catch (error) {
            this.logger.debug(`Request failed for ${url} with error: ${error}`);
            throw new AppError(AppErrorEnum.FailedHTTPRequest, error);
        }
    }

    public async get<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
        return this.request<T>('GET', url, config);
    }

    public async post<T>(url: string, body: any, config: AxiosRequestConfig = {}): Promise<T> {
        return this.request<T>('POST', url, config, body);
    }
}
