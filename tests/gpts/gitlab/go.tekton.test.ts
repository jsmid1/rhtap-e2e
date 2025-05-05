import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { basicGoldenPathTests } from '../../scenarios/golden-path-basic.ts';

/**
 * Tests Go template in GitLab with Tekton
 * 
 * @group tekton
 * @group go
 * @group gitlab
 * @group basic
 */

const golangTemplateName = 'go';
const gitProvider = 'gitlab';
const gitOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runGolangBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(golangTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        basicGoldenPathTests(golangTemplateName, gitProvider, gitOrganization);
    } else {
        skipSuite(golangTemplateName);
    }
};

runGolangBasicTests();
