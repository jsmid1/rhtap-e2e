import { Kubernetes } from '../../src/apis/kubernetes/kube';

export class TektonTestBlocks {

    private readonly kubeClient;

    /**
     * Constructs a new instance of the TektonTestBlocks class.
     */
    constructor(kubeClient: Kubernetes) {
        this.kubeClient = kubeClient;
    }


    /**
     * Waits until a pipeline run is created in the cluster and start to wait until succeed/fail.
     */
    public async verifyPipelineRunStart(repositoryName: string, eventType: string): Promise<boolean> {
        return await this.kubeClient.getPipelineRunByRepository(repositoryName, eventType) !== undefined;
    }

    /**
     * Waits until a pipeline run is created in the cluster and start to wait until succeed/fail.
     */
    public async verifyPipelineRunSuccess(repositoryName: string, namespace: string, eventType: string): Promise<boolean> {
        const pipelineRun = await this.kubeClient.getPipelineRunByRepository(repositoryName, eventType);

        if (pipelineRun === undefined) {
            throw new Error("Error to read pipelinerun from the cluster. Seems like pipelinerun was never created; verify PAC controller logs.");
        }

        if (pipelineRun && pipelineRun.metadata && pipelineRun.metadata.name) {
            const finished = await this.kubeClient.waitPipelineRunToBeFinished(pipelineRun.metadata.name, namespace, 900000);
            const tskRuns = await this.kubeClient.getTaskRunsFromPipelineRun(pipelineRun.metadata.name);

            for (const iterator of tskRuns) {
                if (iterator.status && iterator.status.podName) {
                    await this.kubeClient.readNamespacedPodLog(iterator.status.podName, namespace);
                }
            }

            return finished;
        }
        
        return false;
    }

    /**
     * Verifies the syft image path used for pipelinerun
     * 
     * This function retrieves the pipeline run associated with a repository, looks for the 
     * build-container pod related to the pipeline, and verifies the rh-syft image path 
     * If not found,return pod yaml for reference
     * 
     * @param {string} repositoryName - The name of the repository for which the pipeline run is triggered.
     * @param {string} ciNamespace - The Kubernetes namespace where the CI resources (including the ACS scan pod) are deployed.
     * @param {string} eventType - The type of the event which triggered the pipeline.
     * @returns {Promise<boolean>} A Promise that resolves to `true` if image verification is successful, or `false` if not.
     * 
     */
    public async verifySyftImagePath(repositoryName: string, ciNamespace: string, eventType: string): Promise<boolean> {
        const pipelineRun = await this.kubeClient.getPipelineRunByRepository(repositoryName, eventType);
        if (pipelineRun?.metadata?.name) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const doc: any = await this.kubeClient.pipelinerunfromName(pipelineRun.metadata.name, ciNamespace);
            const index = doc.spec.pipelineSpec.tasks.findIndex((item: { name: string; }) => item.name === "build-container");
            const regex = new RegExp("registry.redhat.io/rh-syft-tech-preview/syft-rhel9", 'i');
            const imageIndex: number = (doc.spec.pipelineSpec.tasks[index].taskSpec.steps.findIndex((item: { image: string; }) => regex.test(item.image)));
            if (imageIndex !== -1) {
                console.log("The image path found is " + doc.spec.pipelineSpec.tasks[index].taskSpec.steps[imageIndex].image);
            }
            else {
                const podName: string = pipelineRun.metadata.name + '-build-container-pod';
                // Read the yaml of the given pod
                const podYaml = await this.kubeClient.getPodYaml(podName, ciNamespace);
                console.log(`The image path not found.The build-container pod yaml is : \n${podYaml}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Checks whether an ACS scan has passed for a given repository.
     * 
     * This function retrieves the pipeline run associated with a repository, looks for the 
     * ACS image scan pod related to the pipeline, and checks the container logs to determine 
     * if the scan was successful.
     * 
     * @param {string} repositoryName - The name of the repository for which the pipeline run is triggered.
     * @param {string} ciNamespace - The Kubernetes namespace where the CI resources (including the ACS scan pod) are deployed.
     * @param {string} eventType - The type of the event which triggered the pipeline.
     * @returns {Promise<boolean>} A Promise that resolves to `true` if the ACS scan was successful, or `false` if not.
     * @throws {Error} If the pipeline run cannot be found or if there is an error interacting with the Kubernetes API.
     * 
     */
    public async checkIfAcsScanIsPass(repositoryName: string, ciNamespace: string, eventType: string): Promise<boolean> {
        const pipelineRun = await this.kubeClient.getPipelineRunByRepository(repositoryName, eventType);
        if (pipelineRun?.metadata?.name) {
            const podName: string = pipelineRun.metadata.name + '-acs-image-scan-pod';
            // Read the logs from the related container
            const podLogs: unknown = await this.kubeClient.readContainerLogs(podName, ciNamespace, 'step-rox-image-scan');
            if (typeof podLogs !== "string") {
                throw new Error(`Failed to retrieve container logs: Expected a string but got ${typeof podLogs}`);
            }
            // Print the logs from the container 
            console.log("Logs from acs-image-scan for pipelineRun " + pipelineRun.metadata.name + ": \n\n" + podLogs);
            const regex = new RegExp("\"result\":\"SUCCESS\"", 'i');
            // Verify if the scan was success from logs
            const result: boolean = regex.test(podLogs);
            return (result);
        }
        // Returns false when if condition not met
        return false;
    }
}
