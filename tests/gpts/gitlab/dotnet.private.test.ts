import { gitLabProviderBasicTests } from "./suites-config/gitlab_positive_suite.ts";
import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";

const dotNetTemplateName = 'dotnet-basic';
const gitLabOrganizationPrivate = process.env.GITLAB_ORGANIZATION_PRIVATE || '';

const runDotNetBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals()

    if (configuration.templates.includes(dotNetTemplateName) && configuration.gitlab.active) {
        gitLabProviderBasicTests(dotNetTemplateName, gitLabOrganizationPrivate)
    } else {
        skipSuite(dotNetTemplateName)
    }
}

runDotNetBasicTests()
