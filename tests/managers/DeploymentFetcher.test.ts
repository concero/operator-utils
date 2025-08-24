import { DeploymentFetcher } from '@/managers/DeploymentFetcher';
import { HttpClient } from '@/utils/HttpClient';

import { MockLogger } from '../mocks/Logger';

jest.mock('@/utils/HttpClient');

describe('DeploymentFetcher', () => {
    let logger: MockLogger;
    let deploymentFetcher: DeploymentFetcher;
    let mockHttpGet: jest.Mock;

    beforeEach(() => {
        logger = new MockLogger();
        mockHttpGet = jest.fn();
        (HttpClient.getInstance as jest.Mock).mockReturnValue({
            get: mockHttpGet,
        });
        deploymentFetcher = new DeploymentFetcher(logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch and parse deployments', async () => {
        const deploymentText = `
ETHEREUM_CONTRACT_A=0x123
ARBITRUM_SEPOLIA_CONTRACT_B=0x456
RANDOM_VAR=abc
`;
        mockHttpGet.mockResolvedValue(deploymentText);

        const patterns = [/^([A-Z_]+)_CONTRACT_A$/, /^([A-Z_]+)_CONTRACT_B$/];

        const deployments = await deploymentFetcher.getDeployments(
            'http://test.com/deployments',
            patterns,
        );

        expect(deployments).toHaveLength(2);
        expect(deployments).toContainEqual({
            key: 'ETHEREUM_CONTRACT_A',
            value: '0x123',
            networkName: 'ethereum',
        });
        expect(deployments).toContainEqual({
            key: 'CONTRACT_B_ARBITRUM_SEPOLIA',
            value: '0x456',
            networkName: 'arbitrumSepolia',
        });
        expect(mockHttpGet).toHaveBeenCalledWith('http://test.com/deployments', {
            responseType: 'text',
        });
    });

    it('should handle http client errors', async () => {
        mockHttpGet.mockRejectedValue(new Error('Network error'));
        const patterns = [/^([A-Z_]+)_CONTRACT_A$/];

        await expect(
            deploymentFetcher.getDeployments('http://test.com/deployments', patterns),
        ).rejects.toThrow('Failed to fetch deployments: Network error');
    });
});
