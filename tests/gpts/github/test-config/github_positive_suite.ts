import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { generateRandomChars } from '../../../../src/utils/generator';
import { GitHubProvider } from "../../../../src/apis/scm-providers/github";
import { Kubernetes } from "../../../../src/apis/kubernetes/kube";
import { checkEnvVariablesGitHub, cleanAfterTestGitHub, getDeveloperHubClient, getGitHubClient, getRHTAPGitopsNamespace } from "../../../../src/utils/test.utils";
import { DeveloperHubTestBlocks } from '../../../test-blocks/developer-hub';
import { ArgoTestBlocks } from '../../../test-blocks/argo';
import { GithubTestBlocks } from '../../../test-blocks/github';
import { TektonTestBlocks } from '../../../test-blocks/tekton';
import { onPushTasks } from '../../../../src/constants/tekton';


/**
 * 1. Components get created in Red Hat Developer Hub
 * 2. Check that components gets created successfully in Red Hat Developer Hub
 * 3. Red Hat Developer Hub created GitHub repository
 * 4. Perform an commit in GitHub to trigger a push PipelineRun
 * 5. Wait For PipelineRun to start and finish successfully. This is not done yet. We need SprayProxy in place and
 * wait for RHTAP bug to be solved: https://issues.redhat.com/browse/RHTAPBUGS-1136
 */
export const gitHubBasicGoldenPathTemplateTests = (gptTemplate: string) => {
    describe(`Red Hat Trusted Application Pipeline ${gptTemplate} GPT tests GitHub provider with public/private image registry`, () => {
        jest.retryTimes(3, {logErrorsBeforeRetry: true}); 

        const componentRootNamespace = process.env.APPLICATION_ROOT_NAMESPACE || 'rhtap-app';
        const ciNamespace = `${componentRootNamespace}-ci`;
        const ciType = `tekton`;

        const githubOrganization = process.env.GITHUB_ORGANIZATION || '';
        const repositoryName = `${generateRandomChars(9)}-${gptTemplate}`;
        const repositoryNameGitops = `${repositoryName}-gitops`;

        const imageName = "rhtap-qe-" + `${gptTemplate}`;
        const imageOrg = process.env.IMAGE_REGISTRY_ORG || 'rhtap';
        const imageRegistry = process.env.IMAGE_REGISTRY || 'quay.io';

        let gitHubClient: GitHubProvider;
        let kubeClient: Kubernetes;
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
            const backstageClient = await getDeveloperHubClient(kubeClient);

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
         * Start to verify if Red Hat Developer Hub created repository from our template in GitHub. This repository should contain the source code of 
         * my application. Also verifies if the repository contains a '.tekton' folder.
         */
        it(`verifies if component ${gptTemplate} was created in GitHub and contains '.tekton' folder`, async () => {
            expect(await githubTestBlocks.verifyRepositoryCreation(repositoryName, githubOrganization, '.tekton')).toBe(true);
        }, 120000);

        /**
         * Verification to check if Red Hat Developer Hub created the gitops repository with all our manifests for argoCd
         */
        it(`verifies if component ${gptTemplate} have a valid gitops repository and there exists a '.tekton' folder`, async () => {
            expect(await githubTestBlocks.verifyRepositoryCreation(repositoryNameGitops, githubOrganization, '.tekton')).toBe(true);
        }, 120000);

        /**
         * Once a DeveloperHub task is processed should create an argocd application in openshift-gitops namespace. 
         * Need to wait until application is synced until commit something to github and trigger a pipelinerun
         */        
        it(`wait ${gptTemplate} argocd to be synced in the cluster`, async () => {
            expect(await argoTestBlocks.verifyArgoCDAplicationHealth(`${repositoryName}-development`)).toBe(true);
        }, 600000);

        /**
         * Creates an empty commit in the repository and expect that a pipelinerun start.
         */
        it(`Creates empty commit to trigger a pipeline run`, async () => {
            const commit = await gitHubClient.createEmptyCommit(githubOrganization, repositoryName);
            expect(commit).not.toBe(undefined);
        }, 120000);

        /**
         * Creates a commit in the repository and expect that a pipelinerun start.
         */
        it(`Verifies that pipelineRun was started by the commit`, async () => {
            expect(await tektonTestBlocks.verifyPipelineRunStart(repositoryName, 'push')).toBe(true);
        }, 120000);

        /**
         * Waits until a pipeline run is created in the cluster and start to wait until succeed/fail.
         */
        it(`Wait component ${gptTemplate} pipelinerun to be triggered and finished`, async () => {
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
        * Deletes created applications
        */
        afterAll(async () => {
            if (process.env.CLEAN_AFTER_TESTS === 'true') {
                await cleanAfterTestGitHub(gitHubClient, kubeClient, RHTAPGitopsNamespace, githubOrganization, repositoryName);
            }
        });
    });
};
