import { gitLabSoftwareTemplatesAdvancedScenarios } from "./suites-config/gitlab_advanced_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts"

const quarkusTemplateName = 'java-quarkus';
const gitLabOrganizationPrivate = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(quarkusTemplateName) && configuration.gitlab.active) {
        gitLabSoftwareTemplatesAdvancedScenarios(quarkusTemplateName, gitLabOrganizationPrivate)
    } else {
        skipSuite(quarkusTemplateName)
    }
}

runQuarkusBasicTests()
