import { DeveloperHubClient } from '../../src/apis/backstage/developer-hub';
import { createTaskCreatorOptionsGitHub, waitForComponentCreation } from '../../src/utils/test.utils';

export class DeveloperHubTestBlocks {

    private readonly developerHubClient;

    /**
     * Constructs a new instance of the DeveloperHubTestBlocks class.
     */
    constructor(developerHubClient: DeveloperHubClient) {
        this.developerHubClient = developerHubClient;
    }


    /**
     * Checks if the GPT exists in the catalog
     * 
     * @param {string} gptTemplate - name of the template
     * @returns {Promise<boolean>} true if the GPT exists in the catalog, false otherwise
     */
    public async verifyGPTCatalogExistence(gptTemplate: string): Promise<boolean> {
        const goldenPathTemplates = await this.developerHubClient.getGoldenPathTemplates();
        return goldenPathTemplates.some(gpt => gpt.metadata.name === gptTemplate);
    };

    /**
     * Creates a task in Developer Hub to generate a new component using specified git and kube options.
     * 
     * @param templateRef Refers to the Developer Hub template name.
     * @param values Set of options to create the component.
     * @param owner Developer Hub username who initiates the task.
     * @param name Name of the repository to be created in GitHub.
     * @param branch Default git branch for the component.
     * @param repoUrl Complete URL of the git provider where the component will be created.
     * @param imageRegistry Image registry provider. Default is Quay.io.
     * @param namespace Kubernetes namespace where ArgoCD will create component manifests.
     * @param imageName Registry image name for the component to be pushed.
     * @param imageOrg Registry organization name for the component to be pushed.
     */
    public async createComponent(gptTemplate: string, imageName: string, ImageOrg: string, imageRegistry: string, gitOrganization: string, repositoryName: string, componentRootNamespace: string, ciType: string): Promise<boolean> {
        const taskCreatorOptions = await createTaskCreatorOptionsGitHub(gptTemplate, imageName, ImageOrg, imageRegistry, gitOrganization, repositoryName, componentRootNamespace, ciType);
        const developerHubTask = await this.developerHubClient.createDeveloperHubTask(taskCreatorOptions);
        return await waitForComponentCreation(this.developerHubClient, repositoryName, developerHubTask);
    };
}
