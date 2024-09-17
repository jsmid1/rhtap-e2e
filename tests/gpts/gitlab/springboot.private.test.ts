import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const springBootTemplateName = 'java-springboot';
const gitLabOrganizationPrivate = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runSpringBootBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(springBootTemplateName) && configuration.gitlab.active) {

        gitLabProviderBasicTests(springBootTemplateName, gitLabOrganizationPrivate);
    } else {
        skipSuite(springBootTemplateName);
    }
}

runSpringBootBasicTests();
