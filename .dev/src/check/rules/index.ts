import type { Finding } from "../finding.ts";
import type { Repo } from "../repo.ts";
import { catalogEntries, entryKeys, renamesCoverHistory } from "./catalog.ts";
import { defaultLocations, hookExecForm, licenseCopy, readmeInstall } from "./plugin.ts";

export type Rule = (repo: Repo) => Promise<Finding[]>;

const RULES: readonly Rule[] = [
  catalogEntries,
  entryKeys,
  renamesCoverHistory,
  licenseCopy,
  readmeInstall,
  defaultLocations,
  hookExecForm,
];

export async function runRules(repo: Repo): Promise<Finding[]> {
  const results = await Promise.all(RULES.map((rule) => rule(repo)));
  return results.flat();
}
