import { GitLabProvider } from "../../src/apis/scm-providers/gitlab";
import { GitHubProvider } from "../../src/apis/scm-providers/github";
import { BitbucketProvider } from "../../src/apis/scm-providers/bitbucket";
import { Kubernetes } from "../../src/apis/kubernetes/kube";
import { DeveloperHubClient } from "../../src/apis/backstage/developer-hub";
import { JenkinsCI } from "../../src/apis/ci/jenkins";
import { ScaffolderScaffoldOptions } from "@backstage/plugin-scaffolder-react";
import { syncArgoApplication } from "./argocd";
import { TaskIdReponse } from "../../src/apis/backstage/types";
import { TrustificationClient } from "../../src/apis/trustification/trustification";


export async function cleanAfterTestGitHub(gitHubClient: GitHubProvider, kubeClient: Kubernetes, gitopsNamespace: string, githubOrganization: string, repositoryName: string) {
    //Check, if gitops repo exists and delete
    await gitHubClient.checkIfRepositoryExistsAndDelete(githubOrganization, `${repositoryName}-gitops`);

    //Check, if repo exists and delete
    await gitHubClient.checkIfRepositoryExistsAndDelete(githubOrganization, repositoryName);

    //Delete app of apps from argo
    await kubeClient.deleteApplicationFromNamespace(gitopsNamespace, `${repositoryName}-app-of-apps`);
}

export async function cleanAfterTestGitLab(gitLabProvider: GitLabProvider, kubeClient: Kubernetes, gitopsNamespace: string, gitLabOrganization: string, gitlabRepositoryID: number, repositoryName: string) {
    //Check, if gitops repo exists and delete
    const gitlabRepositoryIDGitOps = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, `${repositoryName}-gitops`);
    await gitLabProvider.deleteProject(gitlabRepositoryIDGitOps);

    //Check, if repo exists and delete
    await gitLabProvider.deleteProject(gitlabRepositoryID);

    //Delete app of apps from argo
    await kubeClient.deleteApplicationFromNamespace(gitopsNamespace, `${repositoryName}-app-of-apps`);
}

export async function cleanAfterTestBitbucket(bitbucketClient: BitbucketProvider, kubeClient: Kubernetes, gitopsNamespace: string, bitbucketWorkspace: string, repositoryName: string) {
    //Check, if gitops repo exists and delete
    if (await bitbucketClient.checkIfRepositoryExists(bitbucketWorkspace, `${repositoryName}-gitops`)) {
        await bitbucketClient.deleteRepository(bitbucketWorkspace, `${repositoryName}-gitops`);
    }

    //Check, if repo exists and delete
    if (await bitbucketClient.checkIfRepositoryExists(bitbucketWorkspace, repositoryName)) {
        await bitbucketClient.deleteRepository(bitbucketWorkspace, repositoryName);
    }

    //Delete app of apps from argo
    await kubeClient.deleteApplicationFromNamespace(gitopsNamespace, `${repositoryName}-app-of-apps`);
}

export async function waitForStringInPageContent(
    url: string,
    searchString: string,
    timeout = 60000, // Default timeout is 60 seconds
    interval = 5000 // Check every 5 seconds
): Promise<boolean> {
    const endTime = Date.now() + timeout;
    while (Date.now() < endTime) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error fetching page content: ${response.statusText}`);
            }
            const content = await response.text();
            // Check if the content contains the specific string
            if (content.includes(searchString)) {
                return true;
            }
            // Wait for the specified interval before checking again
            await new Promise(resolve => setTimeout(resolve, interval));
        } catch (error) {
            console.error('Error during fetch:', error);
            throw error;
        }
    }
    // Return false if the timeout is reached and the string was not found
    return false;
}

export async function getRHTAPRootNamespace() {
    return process.env.RHTAP_ROOT_NAMESPACE ?? 'rhtap';
}

export async function getRHTAPGitopsNamespace() {
    return process.env.RHTAP_GITOPS_NAMESPACE ?? 'rhtap-gitops';
}

export async function getRHTAPRHDHNamespace() {
    return process.env.RHTAP_RHDH_NAMESPACE ?? 'rhtap-dh';
}

export async function getGitHubClient(kubeClient: Kubernetes) {
    if (process.env.GITHUB_TOKEN) {
        return new GitHubProvider(process.env.GITHUB_TOKEN);
    } else {
        return new GitHubProvider(await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "rhtap-github-integration", "token"));
    }
}

export async function getDeveloperHubClient(kubeClient: Kubernetes) {
    if (process.env.RED_HAT_DEVELOPER_HUB_URL) {
        return new DeveloperHubClient(process.env.RED_HAT_DEVELOPER_HUB_URL);
    } else {
        return new DeveloperHubClient(await kubeClient.getDeveloperHubRoute(await getRHTAPRHDHNamespace()));
    }
}

export async function getJenkinsCI(kubeClient: Kubernetes) {
    if (process.env.JENKINS_URL && process.env.JENKINS_USERNAME && process.env.JENKINS_TOKEN) {
        return new JenkinsCI(process.env.JENKINS_URL, process.env.JENKINS_USERNAME, process.env.JENKINS_TOKEN);
    } else {
        const jenkinsURL = await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "JENKINS__BASEURL");
        const jenkinsUsername = await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "JENKINS__USERNAME");
        const jenkinsToken = await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "JENKINS__TOKEN");
        return new JenkinsCI(jenkinsURL, jenkinsUsername, jenkinsToken);
    }
}

export async function getGitLabProvider(kubeClient: Kubernetes) {
    if (process.env.GITLAB_TOKEN) {
        return new GitLabProvider(process.env.GITLAB_TOKEN);
    } else {
        return new GitLabProvider(await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "GITLAB__TOKEN"));
    }
}

export async function getBitbucketClient(kubeClient: Kubernetes) {
    if (process.env.BITBUCKET_APP_PASSWORD && process.env.BITBUCKET_USERNAME) {
        return new BitbucketProvider(process.env.BITBUCKET_USERNAME, process.env.BITBUCKET_APP_PASSWORD);
    } else {
        const bitbucketUserName = await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "BITBUCKET__USERNAME");
        const bitbucketAppPassword = await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "developer-hub-rhtap-env", "BITBUCKET__APP_PASSWORD");
        return new BitbucketProvider(bitbucketUserName, bitbucketAppPassword);
    }
}

export async function getCosignPassword(kubeClient: Kubernetes) {
    if (process.env.COSIGN_SECRET_PASSWORD) {
        return process.env.COSIGN_SECRET_PASSWORD;
    } else {
        return await kubeClient.getCosignPassword();
    }
}

export async function getCosignPrivateKey(kubeClient: Kubernetes) {
    if (process.env.COSIGN_SECRET_KEY) {
        return process.env.COSIGN_SECRET_KEY;
    } else {
        return await kubeClient.getCosignPrivateKey();
    }
}

export async function getCosignPublicKey(kubeClient: Kubernetes) {
    if (process.env.COSIGN_PUBLIC_KEY) {
        return process.env.COSIGN_PUBLIC_KEY;
    } else {
        return await kubeClient.getCosignPublicKey();
    }
}

export async function waitForComponentCreation(backstageClient: DeveloperHubClient, repositoryName: string, developerHubTask: TaskIdReponse): Promise<boolean> {
    const taskCreated = await backstageClient.getTaskProcessed(developerHubTask.id, 120000);

    if (taskCreated.status !== 'completed') {
        console.log("Failed to create backstage task. Creating logs...");

        try {
            const logs = await backstageClient.getEventStreamLog(taskCreated.id);
            await backstageClient.writeLogsToArtifactDir('backstage-tasks-logs', `gitlab-${repositoryName}.log`, logs);
        } catch (error) {
            throw new Error(`Failed to write logs to artifact directory: ${error}`);
        }

        return false;
    }

    console.log("Task created successfully in backstage");
    return true;
    
}

export async function checkComponentSyncedInArgoAndRouteIsWorking(kubeClient: Kubernetes, backstageClient: DeveloperHubClient, namespaceName: string, environmentName: string, repositoryName: string, stringOnRoute: string) {
    console.log(`syncing argocd application in ${environmentName} environment`);
    await syncArgoApplication(await getRHTAPGitopsNamespace(), `${repositoryName}-${environmentName}`);
    const componentRoute = await kubeClient.getOpenshiftRoute(repositoryName, namespaceName);
    const isReady = await backstageClient.waitUntilComponentEndpointBecomeReady(`https://${componentRoute}`, 10 * 60 * 1000);
    if (!isReady) {
        throw new Error("Component seems was not synced by ArgoCD in 10 minutes");
    }
    console.log(`waiting for application page to be ready in ${environmentName} environment`);
    expect(await waitForStringInPageContent(`https://${componentRoute}`, stringOnRoute, 600000)).toBe(true);
}

export async function checkEnvVariablesGitLab(componentRootNamespace: string, gitLabOrganization: string, imageOrg: string, ciNamespace: string, kubeClient: Kubernetes) {
    if (componentRootNamespace === '') {
        throw new Error("The 'APPLICATION_ROOT_NAMESPACE' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (gitLabOrganization === '') {
        throw new Error("The 'GITLAB_ORGANIZATION_PUBLIC' or 'GITLAB_ORGANIZATION_PRIVATE' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (imageOrg === '') {
        throw new Error("The 'IMAGE_REGISTRY_ORG' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (!await kubeClient.namespaceExists(ciNamespace)) {
        throw new Error(`The CI namespace was not created. Make sure ${ciNamespace} is created and all secrets are created. Example: 'https://github.com/jduimovich/rhdh/blob/main/default-rhtap-ns-configure'`);
    }
}


export async function checkEnvVariablesGitHub(componentRootNamespace: string, githubOrganization: string, imageOrg: string, ciNamespace: string, kubeClient: Kubernetes) {
    if (componentRootNamespace === '') {
        throw new Error("The 'APPLICATION_ROOT_NAMESPACE' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (githubOrganization === '') {
        throw new Error("The 'GITHUB_ORGANIZATION' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (imageOrg === '') {
        throw new Error("The 'IMAGE_REGISTRY_ORG' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    const namespaceExists = await kubeClient.namespaceExists(ciNamespace);

    if (!namespaceExists) {
        throw new Error(`The CI namespace was not created. Make sure ${ciNamespace} is created and all secrets are created. Example: 'https://github.com/jduimovich/rhdh/blob/main/default-rhtap-ns-configure'`);
    }
}

export async function checkEnvVariablesBitbucket(componentRootNamespace: string, bitbucketWorkspace: string, bitbucketProject: string, imageOrg: string, ciNamespace: string, kubeClient: Kubernetes) {
    if (componentRootNamespace === '') {
        throw new Error("The 'APPLICATION_ROOT_NAMESPACE' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (bitbucketWorkspace === '') {
        throw new Error("The 'BITBUCKET_WORKSPACE' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (bitbucketProject === '') {
        throw new Error("The 'BITBUCKET_PROJECT' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    if (imageOrg === '') {
        throw new Error("The 'IMAGE_REGISTRY_ORG' environment variable is not set. Please ensure that the environment variable is defined properly or you have cluster connection.");
    }

    const namespaceExists = await kubeClient.namespaceExists(ciNamespace);

    if (!namespaceExists) {
        throw new Error(`The CI namespace was not created. Make sure ${ciNamespace} is created and all secrets are created. Example: 'https://github.com/jduimovich/rhdh/blob/main/default-rhtap-ns-configure'`);
    }

}

/**
    * Creates a task creator options for Developer Hub to generate a new component using specified git and kube options.
    * 
    * @param {string} softwareTemplateName Refers to the Developer Hub template name.
    * @param {string} imageName Registry image name for the component to be pushed.
    * @param {string} imageOrg Registry organization name for the component to be pushed.
    * @param {string} imageRegistry Image registry provider. Default is Quay.io.
    * @param {string} repositoryName Name of the GitLab repository.
    * @param {string} gitLabOrganization Owner of the GitLab repository.
    * @param {string} componentRootNamespace Kubernetes namespace where ArgoCD will create component manifests.
    * @param {string} ciType CI Type: "jenkins" "tekton"
*/
export async function createTaskCreatorOptionsGitlab(softwareTemplateName: string, imageName: string, imageOrg: string, imageRegistry: string, gitLabOrganization: string, repositoryName: string, componentRootNamespace: string, ciType: string): Promise<ScaffolderScaffoldOptions> {
    const taskCreatorOptions: ScaffolderScaffoldOptions = {
        templateRef: `template:default/${softwareTemplateName}`,
        values: {
            branch: 'main',
            glHost: 'gitlab.com',
            hostType: 'GitLab',
            imageName: imageName,
            imageOrg: imageOrg,
            imageRegistry: imageRegistry,
            name: repositoryName,
            namespace: componentRootNamespace,
            owner: "user:guest",
            repoName: repositoryName,
            glOwner: gitLabOrganization,
            ciType: ciType
        }
    };
    return taskCreatorOptions;
}

/**
    * Creates a task creator options for Developer Hub to generate a new component using specified git and kube options.
    * 
    * @param {string} softwareTemplateName Refers to the Developer Hub template name.
    * @param {string} imageName Registry image name for the component to be pushed.
    * @param {string} imageOrg Registry organization name for the component to be pushed.
    * @param {string} imageRegistry Image registry provider. Default is Quay.io.
    * @param {string} repositoryName Name of the GitHub repository.
    * @param {string} gitLabOrganization Owner of the GitHub repository.
    * @param {string} componentRootNamespace Kubernetes namespace where ArgoCD will create component manifests.
    * @param {string} ciType CI Type: "jenkins" "tekton"
*/
export async function createTaskCreatorOptionsGitHub(softwareTemplateName: string, imageName: string, imageOrg: string, imageRegistry: string, githubOrganization: string, repositoryName: string, componentRootNamespace: string, ciType: string): Promise<ScaffolderScaffoldOptions> {
    const taskCreatorOptions: ScaffolderScaffoldOptions = {
        templateRef: `template:default/${softwareTemplateName}`,
        values: {
            branch: 'main',
            ghHost: 'github.com',
            hostType: 'GitHub',
            imageName: imageName,
            imageOrg: imageOrg,
            imageRegistry: imageRegistry,
            name: repositoryName,
            namespace: componentRootNamespace,
            owner: "user:guest",
            repoName: repositoryName,
            ghOwner: githubOrganization,
            ciType: ciType
        }
    };
    return taskCreatorOptions;
}

/**
    * Creates a task creator options for Developer Hub to generate a new component using specified git and kube options.
    *
    * @param {string} softwareTemplateName Refers to the Developer Hub template name.
    * @param {string} imageName Registry image name for the component to be pushed.
    * @param {string} imageOrg Registry organization name for the component to be pushed.
    * @param {string} imageRegistry Image registry provider. Default is Quay.io.
    * @param {string} bitbucketUsername Bitbucket username to create repo in Bitbucket.
    * @param {string} bitbucketWorkspace Bitbucket workspace where repo to be created in Bitbucket.
    * @param {string} bitbucketProject Bitbucket project where repo to be created in Bitbucket.
    * @param {string} repositoryName Name of the Bitbucket repository.
    * @param {string} componentRootNamespace Kubernetes namespace where ArgoCD will create component manifests.
    * @param {string} ciType CI Type: "jenkins" "tekton"
*/
export async function createTaskCreatorOptionsBitbucket(softwareTemplateName: string, imageName: string, imageOrg: string, imageRegistry: string, bitbucketUsername: string, bitbucketWorkspace: string, bitbucketProject: string, repositoryName: string, componentRootNamespace: string, ciType: string): Promise<ScaffolderScaffoldOptions> {
    const taskCreatorOptions: ScaffolderScaffoldOptions = {
        templateRef: `template:default/${softwareTemplateName}`,
        values: {
            branch: 'main',
            bbHost: 'bitbucket.org',
            hostType: 'Bitbucket',
            imageName: imageName,
            imageOrg: imageOrg,
            imageRegistry: imageRegistry,
            name: repositoryName,
            namespace: componentRootNamespace,
            owner: "user:guest",
            repoName: repositoryName,
            bbOwner: bitbucketUsername,
            workspace: bitbucketWorkspace,
            project: bitbucketProject,
            ciType: ciType
        }
    };

    return taskCreatorOptions;
}

export async function waitForJenkinsJobToFinish(jenkinsClient: JenkinsCI, jobName: string, jobBuildNumber: number) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(jobName, jobBuildNumber, 540000, jobName);
    expect(jobStatus).not.toBe(undefined);
    expect(jobStatus).toBe("SUCCESS");
}

export async function setSecretsForGitLabCI(gitLabProvider: GitLabProvider, gitlabRepositoryID: number, kubeClient: Kubernetes) {
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "COSIGN_PUBLIC_KEY", await getCosignPublicKey(kubeClient));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "COSIGN_SECRET_KEY", await getCosignPrivateKey(kubeClient));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "COSIGN_SECRET_PASSWORD", await getCosignPassword(kubeClient));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "GITOPS_AUTH_USERNAME", 'fakeUsername');
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "GITOPS_AUTH_PASSWORD", await gitLabProvider.getGitlabToken());
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "IMAGE_REGISTRY_PASSWORD", process.env.IMAGE_REGISTRY_PASSWORD ?? '');
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "IMAGE_REGISTRY_USER", process.env.IMAGE_REGISTRY_USERNAME ?? '');
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "ROX_API_TOKEN", await kubeClient.getACSToken(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "ROX_CENTRAL_ENDPOINT", await kubeClient.getACSEndpoint(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "TRUSTIFICATION_BOMBASTIC_API_URL", await kubeClient.getTTrustificationBombasticApiUrl(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "TRUSTIFICATION_OIDC_ISSUER_URL", await kubeClient.getTTrustificationOidcIssuerUrl(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "TRUSTIFICATION_OIDC_CLIENT_ID", await kubeClient.getTTrustificationClientId(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "TRUSTIFICATION_OIDC_CLIENT_SECRET", await kubeClient.getTTrustificationClientSecret(await getRHTAPRootNamespace()));
    await gitLabProvider.setEnvironmentVariable(gitlabRepositoryID, "TRUSTIFICATION_SUPPORTED_CYCLONEDX_VERSION", await kubeClient.getTTrustificationSupportedCycloneDXVersion(await getRHTAPRootNamespace()));
}

export async function waitForGitLabCIPipelineToFinish(gitLabProvider: GitLabProvider, gitlabRepositoryID: number, pipelineRunNumber: number) {
    await gitLabProvider.waitForPipelinesToBeCreated(gitlabRepositoryID, pipelineRunNumber, 10000);
    const response = await gitLabProvider.getLatestPipeline(gitlabRepositoryID);

    if (response?.id) {
        const pipelineResult = await gitLabProvider.waitForPipelineToFinish(gitlabRepositoryID, response.id, 540000);
        expect(pipelineResult).toBe("success");
    }
}

/**
 * Search SBOm in trustification by string, which could be SBOM name, SBOm version...
 * 
 * @param {Kubernetes} kubeClient - Kubernetes client.
 * @param {string} searchString - String to search in trustification: for example SBOM, name, SBOm version...
 * @throws {Error} If there is an error during search.
 */
export async function checkSBOMInTrustification(kubeClient: Kubernetes, searchString: string) {
    const bombasticApiUrl = await kubeClient.getTTrustificationBombasticApiUrl(await getRHTAPRootNamespace());
    const oidcIssuesUrl = await kubeClient.getTTrustificationOidcIssuerUrl(await getRHTAPRootNamespace());
    const oidcclientId = await kubeClient.getTTrustificationClientId(await getRHTAPRootNamespace());
    const oidcclientSecret = await kubeClient.getTTrustificationClientSecret(await getRHTAPRootNamespace());

    const trust = new TrustificationClient(bombasticApiUrl, oidcIssuesUrl, oidcclientId, oidcclientSecret);

    try {
        await trust.initializeTpaToken();
        const sbomData = await trust.waitForSbomSearchByName(searchString);
        console.log('SBOM Data:', sbomData);
    } catch (error) {
        console.error('Error fetching SBOM data:', error);
        return false;
    }

    return true;
}

export async function setSecretsForJenkinsInFolder(jenkinsClient: JenkinsCI, kubeClient: Kubernetes, folderName: string, isGitLab = false) {
    if (isGitLab) {
        await jenkinsClient.createCredentialsInFolder("GLOBAL", "GITOPS_AUTH_USERNAME", 'fakeUsername', folderName);
        await jenkinsClient.createCredentialsInFolder("GLOBAL", "GITOPS_AUTH_PASSWORD", process.env.GITLAB_TOKEN ?? '', folderName);
        await jenkinsClient.createCredentialsUsernamePasswordInFolder("GLOBAL", "GITOPS_CREDENTIALS", "fakeUsername", process.env.GITLAB_TOKEN ?? '', folderName);
    } else {
        await jenkinsClient.createCredentialsInFolder("GLOBAL", "GITOPS_AUTH_PASSWORD", process.env.GITHUB_TOKEN ?? '', folderName);
        await jenkinsClient.createCredentialsUsernamePasswordInFolder("GLOBAL", "GITOPS_CREDENTIALS", "fakeUsername", process.env.GITHUB_TOKEN ?? '', folderName);
    }
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "COSIGN_PUBLIC_KEY", await getCosignPublicKey(kubeClient), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "COSIGN_SECRET_KEY", await getCosignPrivateKey(kubeClient), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "COSIGN_SECRET_PASSWORD", await getCosignPassword(kubeClient), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "IMAGE_REGISTRY_USER", process.env.IMAGE_REGISTRY_USERNAME ?? '', folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "IMAGE_REGISTRY_PASSWORD", process.env.IMAGE_REGISTRY_PASSWORD ?? '', folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "ROX_API_TOKEN", await kubeClient.getACSToken(await getRHTAPRootNamespace()), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "ROX_CENTRAL_ENDPOINT", await kubeClient.getACSEndpoint(await getRHTAPRootNamespace()), folderName);
}

export async function setSecretsForJenkinsInFolderForTPA(jenkinsClient: JenkinsCI, kubeClient: Kubernetes, folderName: string) {
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "TRUSTIFICATION_BOMBASTIC_API_URL", await kubeClient.getTTrustificationBombasticApiUrl(await getRHTAPRootNamespace()), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "TRUSTIFICATION_OIDC_ISSUER_URL", await kubeClient.getTTrustificationOidcIssuerUrl(await getRHTAPRootNamespace()), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "TRUSTIFICATION_OIDC_CLIENT_ID", await kubeClient.getTTrustificationClientId(await getRHTAPRootNamespace()), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "TRUSTIFICATION_OIDC_CLIENT_SECRET", await kubeClient.getTTrustificationClientSecret(await getRHTAPRootNamespace()), folderName);
    await jenkinsClient.createCredentialsInFolder("GLOBAL", "TRUSTIFICATION_SUPPORTED_CYCLONEDX_VERSION", await kubeClient.getTTrustificationSupportedCycloneDXVersion(await getRHTAPRootNamespace()), folderName);
}
