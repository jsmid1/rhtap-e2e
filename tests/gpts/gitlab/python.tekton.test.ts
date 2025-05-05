import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { basicGoldenPathTests } from '../../scenarios/golden-path-basic.ts';

/**
 * Tests Python template in GitLab with Tekton
 * 
 * @group tekton
 * @group python
 * @group gitlab
 * @group basic
 */

const pythonTemplateName = 'python';
const gitProvider = 'gitlab';
const gitOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runPythonBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(pythonTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        basicGoldenPathTests(pythonTemplateName, gitProvider, gitOrganization);
    } else {
        skipSuite(pythonTemplateName);
    }
};

runPythonBasicTests();
