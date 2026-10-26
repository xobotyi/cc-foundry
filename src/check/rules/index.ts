import type { Finding } from "../finding.ts";
import type { Repo } from "../repo.ts";
import { catalogEntries, entryKeys, renamesCoverHistory } from "./catalog.ts";
import { rootDocs } from "./docs.ts";
import { dependencyScope, prerequisiteDependencies, skillReferences } from "./links.ts";
import { defaultLocations, hookExecForm, licenseCopy, readmeInstall } from "./plugin.ts";
import { releaseVersion, unbumpedChanges } from "./release.ts";
import type { Rule, RuleContext } from "./rule.ts";

const RULES: readonly Rule[] = [
  catalogEntries,
  entryKeys,
  renamesCoverHistory,
  licenseCopy,
  readmeInstall,
  defaultLocations,
  hookExecForm,
  skillReferences,
  prerequisiteDependencies,
  dependencyScope,
  releaseVersion,
  unbumpedChanges,
  rootDocs,
];

export async function runRules(repo: Repo, ctx: RuleContext): Promise<Finding[]> {
  const results = await Promise.all(RULES.map((rule) => rule(repo, ctx)));
  return results.flat();
}
