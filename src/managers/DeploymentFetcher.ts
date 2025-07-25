import { IDeploymentFetcher } from "../types/managers";
import { HttpClient } from "../utils/HttpClient";
import { LoggerInterface } from "../utils/Logger";

export type DeploymentPattern = RegExp;

export interface ParsedDeployment {
    key: string;
    value: string;
    networkName: string;
}

// Stateless class for fetching and parsing deployments
export class DeploymentFetcher implements IDeploymentFetcher {
    private httpClient: HttpClient;
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface) {
        this.httpClient = HttpClient.getInstance();
        this.logger = logger;
    }

    async getDeployments(url: string, patterns: DeploymentPattern[]): Promise<ParsedDeployment[]> {
        try {
            const deploymentsText = await this.httpClient.get<string>(url, {
                responseType: "text",
            });

            const deploymentsEnvArr = deploymentsText.split("\n");
            const deployments = new Map<string, string>();

            // Parse all deployments from the env file
            for (const deploymentEnv of deploymentsEnvArr) {
                if (!deploymentEnv || !deploymentEnv.includes("=")) continue;
                const [key, value] = deploymentEnv.split("=");
                if (key && value) {
                    deployments.set(key, value);
                }
            }

            // Parse deployments based on patterns
            return this.parseDeployments(deployments, patterns);
        } catch (error) {
            this.logger.error("Failed to fetch deployments:", error);
            throw new Error(
                `Failed to fetch deployments: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private parseDeployments(deployments: Map<string, string>, patterns: DeploymentPattern[]): ParsedDeployment[] {
        const parsed: ParsedDeployment[] = [];

        for (const [key, value] of deployments) {
            for (const pattern of patterns) {
                const match = key.match(pattern);

                if (match) {
                    // Extract network name from capture group (if exists) or from the match
                    const networkCapture = match[1]; // First capture group
                    if (networkCapture) {
                        const networkName = this.convertToNetworkName(networkCapture);
                        const deployment: ParsedDeployment = {
                            key,
                            value,
                            networkName
                        };
                        parsed.push(deployment);
                    }
                    break; // Stop checking other patterns for this key
                }
            }
        }

        return parsed;
    }

    private convertToNetworkName(capture: string): string {
        // Convert from ETHEREUM or ARBITRUM_SEPOLIA to camelCase
        const parts = capture.toLowerCase().split("_");
        return parts[0] + parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("");
    }
}
