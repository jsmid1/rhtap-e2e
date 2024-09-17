import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const springBootTemplateName = 'java-springboot';
const gitLabOrganizationPublic = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runSpringBootBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(springBootTemplateName) && configuration.gitlab.active) {

        gitLabProviderBasicTests(springBootTemplateName, gitLabOrganizationPublic);
    } else {
        skipSuite(springBootTemplateName);
    }
}

runSpringBootBasicTests();
