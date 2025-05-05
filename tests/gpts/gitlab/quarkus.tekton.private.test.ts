import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { advancedGoldenPathTests } from '../../scenarios/golden-path-advanced.ts';

/**
 * Tests Quarkus template in GitLab with Tekton
 * 
 * @group tekton
 * @group quarkus
 * @group gitlab
 * @group advanced
 * @group private
 */

const quarkusTemplateName = 'java-quarkus';
const gitProvider = 'gitlab';
const gitLabOrganization = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(quarkusTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        advancedGoldenPathTests(quarkusTemplateName, gitProvider, gitLabOrganization);
    } else {
        skipSuite(quarkusTemplateName);
    }
};

runQuarkusBasicTests();
