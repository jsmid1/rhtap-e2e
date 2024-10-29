export const onPullPprTasks = ["init", "clone-repository", "build-container", "acs-image-check", "acs-image-scan", "show-sbom", "show-summary"]
export const onPushPprTasks = [...onPullPprTasks, "acs-deploy-check", "update-deployment"]
export const onPullGitopsPprTasks = ["clone-repository", "get-images-to-upload-sbom", "get-images-to-verify", "download-sboms", "verify-enteprise-contract", "upload-sboms-to-trustification"]
