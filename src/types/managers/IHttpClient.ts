export interface IHttpClient {
    // Define HttpClient interface methods here
}

/** Configuration for HttpClient */
export interface HttpClientConfig {
    retryDelay: number;
    maxRetries: number;
    defaultTimeout: number;
}
