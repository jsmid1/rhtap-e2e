import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const nodejsTemplateName = 'nodejs';
const gitLabOrganizationPublic = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runNodeJSBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(nodejsTemplateName) && configuration.gitlab.active) {

        gitLabProviderBasicTests(nodejsTemplateName, gitLabOrganizationPublic)
    } else {
        skipSuite(nodejsTemplateName)
    }
}

runNodeJSBasicTests()
