import { GitHubProvider } from '../../src/apis/scm-providers/github';

export class GithubTestBlocks {

    private readonly gitHubClient;

    /**
     * Constructs a new instance of the ArgoTestBlocks class.
     */
    constructor(gitHubClient: GitHubProvider) {
        this.gitHubClient = gitHubClient;
    }


    /**
     * Verifies if repository was correctly created from template
     * 
     * @param {string} repositoryName - name of the repository
     * @param {string} githubOrganization - name of the Github organization where the repository should have been created
     * @param {string} folderName - name of the folder which should have been created in the repository based on the template
     * @returns {Promise<boolean>} true if the repository was created and the folder is present in the repository, false otherwise
     */
    public async verifyRepositoryCreation(repositoryName: string, githubOrganization: string, folderName: string): Promise<boolean> {
        const repositoryExists = await this.gitHubClient.checkIfRepositoryExists(githubOrganization, repositoryName);
        const folderExists = await this.gitHubClient.checkIfFolderExistsInRepository(githubOrganization, repositoryName, folderName);
        
        return repositoryExists && folderExists;
    }
}
