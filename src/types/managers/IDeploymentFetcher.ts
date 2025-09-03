import { NetworkType } from '@/types/ConceroNetwork';

import { DeploymentPattern, ParsedDeployment } from '../../managers/DeploymentFetcher';

export interface IDeploymentFetcher {
    getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]>;
}

/** Configuration for DeploymentManager */
export interface DeploymentManagerConfig {
    conceroDeploymentsUrl: string;
    networkMode: NetworkType;
}
