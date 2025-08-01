import { DeploymentPattern, ParsedDeployment } from '../../managers/DeploymentFetcher';
export interface IDeploymentFetcher {
    getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]>;
}
//# sourceMappingURL=IDeploymentFetcher.d.ts.map