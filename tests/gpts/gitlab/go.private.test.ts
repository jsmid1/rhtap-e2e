import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const golangTemplateName = 'go';
const gitLabOrganizationPrivate = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runGolangBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(golangTemplateName) && configuration.gitlab.active) {
        gitLabProviderBasicTests(golangTemplateName, gitLabOrganizationPrivate);
    } else {
        skipSuite(golangTemplateName);
    }
}

runGolangBasicTests();
