import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { basicGoldenPathTests } from '../../scenarios/golden-path-basic.ts';

/**
 * Tests dotnet template in GitLab with Tekton
 * 
 * @group tekton
 * @group dotnet
 * @group gitlab
 * @group basic
 */

const dotNetTemplateName = 'dotnet-basic';
const gitProvider = 'gitlab';
const gitOrganization = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runDotNetBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

    if (configuration.templates.includes(dotNetTemplateName) && configuration.pipeline.gitlab && configuration.gitlab.tekton) {
        basicGoldenPathTests(dotNetTemplateName, gitProvider, gitOrganization);
    } else {
        skipSuite(dotNetTemplateName);
    }
};

runDotNetBasicTests();
