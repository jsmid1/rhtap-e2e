import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const dotNetTemplateName = 'dotnet-basic';
const gitLabOrganizationPublic = process.env.GITLAB_ORGANIZATION_PUBLIC || '';

const runDotNetBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(dotNetTemplateName) && configuration.gitlab.active) {
        gitLabProviderBasicTests(dotNetTemplateName, gitLabOrganizationPublic)
    } else {
        skipSuite(dotNetTemplateName)
    }
}

runDotNetBasicTests()
