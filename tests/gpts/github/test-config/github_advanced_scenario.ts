import { beforeAll, describe, expect, it } from '@jest/globals';
import { DeveloperHubClient } from '../../../../src/apis/backstage/developer-hub';
import { generateRandomChars } from '../../../../src/utils/generator';
import { syncArgoApplication } from '../../../../src/utils/argocd';
import { GitHubProvider } from "../../../../src/apis/scm-providers/github";
import { Kubernetes } from "../../../../src/apis/kubernetes/kube";
import { checkEnvVariablesGitHub, checkSBOMInTrustification, cleanAfterTestGitHub, getDeveloperHubClient, getGitHubClient, getRHTAPGitopsNamespace } from "../../../../src/utils/test.utils";
import { DeveloperHubTestBlocks } from '../../../test-blocks/developer-hub';
import { ArgoTestBlocks } from '../../../test-blocks/argo';
import { GithubTestBlocks } from '../../../test-blocks/github';
import { TektonTestBlocks } from '../../../test-blocks/tekton';
import { onPullGitopsTasks, onPullTasks, onPushTasks } from '../../../../src/constants/tekton';


/**
 * Advanced end-to-end test scenario for Red Hat Trusted Application Pipelines:
 * 1. Create components in Red Hat Developer Hub.
 * 2. Verify successful creation of components in Red Hat Developer Hub.
 * 3. Ensure Red Hat Developer Hub creates a corresponding GitHub repository.
 * 4. Initiate a Pull Request to trigger a PipelineRun for pull_request events in the GitHub repository.
 * 5. Merge the Pull Request if the PipelineRun succeeds.
 * 6. Upon merging the Pull Request, validate that the push PipelineRun starts and finishes successfully.
 * 7. Verify that the new image is deployed correctly in the development environment.
 * 8. Trigger a Pull Request in the component gitops folder to promote the development image to the stage environment.
 * 9. Ensure that the EC Pipeline Runs are successfully passed.
 * 10. Merge the Pull Request to main.
 * 11. Wait for the new image to be deployed to the stage environment.
 * 12. Trigger a Pull Request in the component gitops repository to promote the stage image to the production environment.
 * 13. Verify that the EC Pipeline Runs are successfully passed.
 * 14. Merge the Pull Request to main.
 * 15. Wait for the new image to be deployed to the production environment.
 */
export const githubSoftwareTemplatesAdvancedScenarios = (gptTemplate: string) => {
    describe(`Red Hat Trusted Application Pipeline ${gptTemplate} GPT tests GitHub provider with public/private image registry`, () => {
        jest.retryTimes(3, {logErrorsBeforeRetry: true}); 
        const componentRootNamespace = process.env.APPLICATION_ROOT_NAMESPACE || 'rhtap-app';
        const ciType = `tekton`;

        const developmentEnvironmentName = 'development';
        const stagingEnvironmentName = 'stage';
        const productionEnvironmentName = 'prod';

        const ciNamespace = `${componentRootNamespace}-ci`;
        const developmentNamespace = `${componentRootNamespace}-${developmentEnvironmentName}`;
        const stageNamespace = `${componentRootNamespace}-${stagingEnvironmentName}`;
        const prodNamespace = `${componentRootNamespace}-${productionEnvironmentName}`;

        const githubOrganization = process.env.GITHUB_ORGANIZATION || '';
        const repositoryName = `${generateRandomChars(9)}-${gptTemplate}`;
        const repositoryNameGitops = `${repositoryName}-gitops`;

        const imageName = "rhtap-qe-" + `${gptTemplate}`;
        const imageOrg = process.env.IMAGE_REGISTRY_ORG || 'rhtap';
        const imageRegistry = process.env.IMAGE_REGISTRY || 'quay.io';

        let backstageClient: DeveloperHubClient;
        let gitHubClient: GitHubProvider;
        let kubeClient: Kubernetes;

        let pullRequestNumber: number;
        let gitopsPromotionPRNumber: number;
        let extractedBuildImage: string;
        let RHTAPGitopsNamespace: string;

        let developerHubTestBlocks: DeveloperHubTestBlocks;
        let argoTestBlocks: ArgoTestBlocks;
        let githubTestBlocks: GithubTestBlocks;
        let tektonTestBlocks: TektonTestBlocks;

        /**
         * Initializes Github and Kubernetes client for interaction. After clients initialization will start to create a test namespace.
         * This namespace should have gitops label: 'argocd.argoproj.io/managed-by': 'openshift-gitops' to allow ArgoCD to create
         * resources
        */
        beforeAll(async () => {
            RHTAPGitopsNamespace = await getRHTAPGitopsNamespace();
            kubeClient = new Kubernetes();
            gitHubClient = await getGitHubClient(kubeClient);
            backstageClient = await getDeveloperHubClient(kubeClient);

            developerHubTestBlocks = new DeveloperHubTestBlocks(backstageClient);
            argoTestBlocks = new ArgoTestBlocks(kubeClient, backstageClient);
            githubTestBlocks = new GithubTestBlocks(gitHubClient);
            tektonTestBlocks = new TektonTestBlocks(kubeClient);

            await checkEnvVariablesGitHub(componentRootNamespace, githubOrganization, imageOrg, ciNamespace, kubeClient);
        });

        /**
         * Creates a request to Developer Hub and check if the gpt really exists in the catalog
         */
        it(`verifies if ${gptTemplate} gpt exists in the catalog`, async () => {
            expect(await developerHubTestBlocks.verifyGPTCatalogExistence(gptTemplate)).toBe(true);
        });

        /**
         * Creates a task in Developer Hub to generate a new component using specified git and kube options.
         */
        it(`creates ${gptTemplate} component`, async () => {
            expect(await developerHubTestBlocks.createComponent(gptTemplate, imageName, imageOrg, imageRegistry, githubOrganization, repositoryName, componentRootNamespace, ciType)).toBe(true);
        }, 120000);

        /**
         * Verifies if Red Hat Developer Hub created a repository from the specified template in GitHub.
         * The repository should contain the source code of the application and a '.tekton' folder.
         */
        it(`verifies if component ${gptTemplate} was created in GitHub and contains '.tekton' folder`, async () => {
            expect(await githubTestBlocks.verifyRepositoryCreation(repositoryName, githubOrganization, '.tekton')).toBe(true);
        }, 120000);

        /**
         * Verifies if Red Hat Developer Hub created the GitOps repository with all the manifests for ArgoCD.
         * The repository should contain the '.tekton' folder.
         */
        it(`verifies if component ${gptTemplate} have a valid gitops repository and there exists a '.tekton' folder`, async () => {
            expect(await githubTestBlocks.verifyRepositoryCreation(repositoryNameGitops, githubOrganization, '.tekton')).toBe(true);
        }, 120000);

        /**
         * Waits for the specified ArgoCD application associated with the DeveloperHub task to be synchronized in the cluster.
         */
        it(`wait ${gptTemplate} argocd to be healthy in the cluster`, async () => {
            expect(await argoTestBlocks.verifyArgoCDAplicationHealth(`${repositoryName}-development`)).toBe(true);
        }, 600000);

        /**
         * Creates an empty commit in the repository and expects a PipelineRun to start.
         * This step is used to trigger a PipelineRun by creating a pull request.
         */
        it(`Creates a pull request and verify a PipelineRun started`, async () => {
            pullRequestNumber = await gitHubClient.createPullRequestFromMainBranch(githubOrganization, repositoryName, 'test_file.txt', 'Test content');
            expect(await tektonTestBlocks.verifyPipelineRunStart(repositoryName, 'pull_request')).toBe(true);
        }, 120000);

        /**
         * Waits until a pipeline run is created in the cluster and start to wait until succeed/fail.
         */
        it(`Wait component ${gptTemplate} pipelinerun to be triggered and finished`, async () => {
            expect(await tektonTestBlocks.verifyPipelineRunSuccess(repositoryName, ciNamespace, 'pull_request', onPullTasks)).toBe(true);
        }, 900000);


        /**
         * Creates an empty commit in the repository and expect that a pipelinerun start.
         */
        it(`Merge pull_request to trigger a push pipelinerun`, async () => {
            await gitHubClient.mergePullRequest(githubOrganization, repositoryName, pullRequestNumber);
            expect(await tektonTestBlocks.verifyPipelineRunStart(repositoryName, 'push')).toBe(true);
        }, 120000);

        /**
         * Waits until a pipeline run is created in the cluster and start to wait until succeed/fail.
         */
        it(`Wait component ${gptTemplate} push pipelinerun to be triggered and finished`, async () => {
            expect(await tektonTestBlocks.verifyPipelineRunSuccess(repositoryName, ciNamespace, 'push', onPushTasks)).toBe(true);
        }, 900000);

        /**
         * Check if the pipelinerun yaml has the rh-syft image path mentioned
         * if failed to figure out the image path ,return pod yaml for reference
         */
        it(`Check ${gptTemplate} pipelinerun yaml has the rh-syft image path`, async () => {
            expect(await tektonTestBlocks.verifySyftImagePath(repositoryName, ciNamespace, 'push')).toBe(true);
        }, 900000);

        /**
         * verify if the ACS Scan is successfully done from the logs of task steps
         */
        it(`Check if ACS Scan is successful for ${gptTemplate}`, async () => {
            expect(await tektonTestBlocks.checkIfAcsScanIsPass(repositoryName, ciNamespace, 'push')).toBe(true);
        }, 900000);

        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster
         */
        it('container component is successfully synced by gitops in development environment', async () => {
            await syncArgoApplication(RHTAPGitopsNamespace, `${repositoryName}-${developmentEnvironmentName}`);
            expect(await argoTestBlocks.verifyArgoCDApplicationSync(repositoryName, developmentNamespace));
        }, 900000);

        /**
         * Trigger a promotion Pull Request in Gitops repository to promote development image to stage environment
         */
        it('trigger pull request promotion to promote from development to stage environment', async () => {
            [extractedBuildImage, gitopsPromotionPRNumber] = await gitHubClient.createPromotionPullRequest(githubOrganization, repositoryNameGitops, developmentEnvironmentName, stagingEnvironmentName);
            expect(await tektonTestBlocks.verifyPipelineRunStart(repositoryNameGitops, 'pull_request'));
        });

        /**
         * Verifies successful completion of EC PipelineRun to ensure environment promotion from development to staging.
         */
        it('verifies successful completion of EC PipelineRun to ensure environment promotion from development to staging', async () => {
            expect(await tektonTestBlocks.verifyPipelineRunSuccess(repositoryNameGitops, ciNamespace, 'pull_request', onPullGitopsTasks));
        }, 900000);

        /**
         * Merge the gitops Pull Request with the new image value. Expect that argocd will sync the new image in stage 
         */
        it(`merge gitops pull request to sync new image in stage environment`, async () => {
            await gitHubClient.mergePullRequest(githubOrganization, repositoryNameGitops, gitopsPromotionPRNumber);
        }, 120000);

        /*
        * Verifies if the new image is deployed with an expected endpoint in stage environment
        */
        it('container component is successfully synced by gitops in stage environment', async () => {
            await syncArgoApplication(RHTAPGitopsNamespace, `${repositoryName}-${stagingEnvironmentName}`);
            expect(await argoTestBlocks.verifyArgoCDApplicationSync(repositoryName, stageNamespace));
        }, 900000);

        /**
        * Trigger a promotion Pull Request in Gitops repository to promote stage image to prod environment
        */
        it('trigger pull request promotion to promote from stage to prod environment', async () => {
            [extractedBuildImage, gitopsPromotionPRNumber] = await gitHubClient.createPromotionPullRequest(githubOrganization, repositoryNameGitops, stagingEnvironmentName, developmentEnvironmentName);
            expect(await tektonTestBlocks.verifyPipelineRunStart(repositoryNameGitops, 'pull_request'));
        });

        /**
         * Verifies successful completion of EC PipelineRun to ensure environment promotion from staging to production.
         */
        it('verifies successful completion of PipelineRun to ensure environment promotion from stage to prod', async () => {
            expect(await tektonTestBlocks.verifyPipelineRunSuccess(repositoryNameGitops, ciNamespace, 'pull_request', onPullGitopsTasks));
        }, 900000);

        /**
         * If pipelinerun succeeds merge the PR to allow image to sync in prod environment
         */
        it(`merge gitops pull request to sync new image in prod environment`, async () => {
            await gitHubClient.mergePullRequest(githubOrganization, repositoryNameGitops, gitopsPromotionPRNumber);
        }, 120000);

        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster
         */
        it('container component is successfully synced by gitops in prod environment', async () => {
            await syncArgoApplication('rhtap', `${repositoryName}-${productionEnvironmentName}`);
            expect(await argoTestBlocks.verifyArgoCDApplicationSync(repositoryName, prodNamespace)).toBe(true);
        }, 900000);


        /*
        * Verifies if the SBOm is uploaded in RHTPA/Trustification
        */
        it('check sbom uploaded in RHTPA', async () => {
            expect(await checkSBOMInTrustification(kubeClient, extractedBuildImage.split(":")[2])).toBe(true);
        }, 900000);

        /**
        * Deletes created applications
        */
        afterAll(async () => {
            if (process.env.CLEAN_AFTER_TESTS === 'true') {
                await cleanAfterTestGitHub(gitHubClient, kubeClient, RHTAPGitopsNamespace, githubOrganization, repositoryName);
            }
        });
    });
};
