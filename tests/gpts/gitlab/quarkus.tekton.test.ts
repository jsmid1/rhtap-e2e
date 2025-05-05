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
 */

const quarkusTemplateName = 'java-quarkus';
const gitProvider = 'gitlab';
const gitOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(quarkusTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        advancedGoldenPathTests(quarkusTemplateName, gitProvider, gitOrganization);
    } else {
        skipSuite(quarkusTemplateName);
    }
};

runQuarkusBasicTests();
