import type { Finding } from "../finding.ts";
import type { Repo } from "../repo.ts";
import { catalogEntries, entryKeys, renamesCoverHistory } from "./catalog.ts";

export type Rule = (repo: Repo) => Promise<Finding[]>;

const RULES: readonly Rule[] = [catalogEntries, entryKeys, renamesCoverHistory];

export async function runRules(repo: Repo): Promise<Finding[]> {
  const results = await Promise.all(RULES.map((rule) => rule(repo)));
  return results.flat();
}
