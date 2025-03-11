import { DeveloperHubClient } from '../../src/apis/backstage/developer-hub';
import { Kubernetes } from '../../src/apis/kubernetes/kube';

export class ArgoTestBlocks {

    private readonly kubeClient;
    private readonly backstageClient;

    /**
     * Constructs a new instance of the ArgoTestBlocks class.
     */
    constructor(kubeClient: Kubernetes, backstageClient: DeveloperHubClient) {
        this.kubeClient = kubeClient;
        this.backstageClient = backstageClient;
    }


    /**
     * Verifies argoCD application is healthy
     * 
     * @param {string} argoAppName - name of the ArgoCD application 
     * @returns {Promise<boolean>} true if the application becomes healthy in time, false otherwise
     */
    public async verifyArgoCDAplicationHealth(argoAppName: string): Promise<boolean> {
        return await this.kubeClient.waitForArgoCDApplicationToBeHealthy(argoAppName, 500000);
    }

    /**
     * Verifies argoCD application is synced
     * 
     * @param {string} argoAppName - name of the ArgoCD application 
     * @param {string} namespace - namespace of the application
     * @returns {Promise<boolean>} true if the application becomes synced in time, false otherwise
     */
    public async verifyArgoCDApplicationSync(argoAppName: string, namespace: string): Promise<boolean> {
        const componentRoute = await this.kubeClient.getOpenshiftRoute(argoAppName, namespace);

        const isReady = await this.backstageClient.waitUntilComponentEndpointBecomeReady(`https://${componentRoute}/hello-resteasy`, 10 * 60 * 1000);

        if (!isReady) {
            console.log("Component seems was not synced by ArgoCD in 10 minutes");
        }

        return isReady;
    }
}
