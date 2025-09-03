import { ILogger } from '../types';
import { IDeploymentFetcher } from '../types/managers';
export type DeploymentPattern = RegExp;
export interface ParsedDeployment {
    key: string;
    value: string;
    networkName: string;
}
export declare class DeploymentFetcher implements IDeploymentFetcher {
    private httpClient;
    private logger;
    constructor(logger: ILogger);
    getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]>;
    private parseDeployments;
    private convertToNetworkName;
}
//# sourceMappingURL=DeploymentFetcher.d.ts.map