import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { basicGoldenPathTests } from '../../scenarios/golden-path-basic.ts';

/**
 * Tests Nodejs template in GitLab with Tekton
 * 
 * @group tekton
 * @group nodejs
 * @group gitlab
 * @group basic
 */

const nodejsTemplateName = 'nodejs';
const gitProvider = 'gitlab';
const gitOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runNodeJSBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(nodejsTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        basicGoldenPathTests(nodejsTemplateName, gitProvider, gitOrganization);
    } else {
        skipSuite(nodejsTemplateName);
    }
};

runNodeJSBasicTests();
