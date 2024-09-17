import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts"

const pythonTemplateName = 'python';
const gitLabOrganizationPrivate = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runPythonBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(pythonTemplateName) && configuration.gitlab.active) {

        gitLabProviderBasicTests(pythonTemplateName, gitLabOrganizationPrivate)
    } else {
        skipSuite(pythonTemplateName)
    }
}

runPythonBasicTests()