import { gitLabSoftwareTemplatesAdvancedScenarios } from "./suites-config/gitlab_advanced_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

/**
 * Tests Quarkus template in GitLab with Tekton
 * 
 * @group tekton
 * @group quarkus
 * @group gitlab
 * @group advanced
 */

const quarkusTemplateName = 'java-quarkus';
const gitLabOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(quarkusTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {

        gitLabSoftwareTemplatesAdvancedScenarios(quarkusTemplateName, gitLabOrganization);
    } else {
        skipSuite(quarkusTemplateName);
    }
};

runQuarkusBasicTests();
