import { DeploymentPattern, ParsedDeployment } from '../../managers/DeploymentFetcher';
import { NetworkType } from '../ConceroNetwork';

export interface IDeploymentFetcher {
    getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]>;
}

/** Configuration for DeploymentManager */
export interface DeploymentManagerConfig {
    conceroDeploymentsUrl: string;
    networkMode: NetworkType;
}
