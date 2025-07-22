import { IDeploymentFetcher } from "../types/managers";
import { LoggerInterface } from "../utils/Logger";
export type DeploymentPattern = RegExp;
export interface ParsedDeployment {
    key: string;
    value: string;
    networkName: string;
}
export declare class DeploymentFetcher implements IDeploymentFetcher {
    private httpClient;
    private logger;
    constructor(logger: LoggerInterface);
    getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]>;
    private parseDeployments;
    private convertToNetworkName;
}
//# sourceMappingURL=DeploymentFetcher.d.ts.map