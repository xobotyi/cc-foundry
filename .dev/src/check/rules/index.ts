import type { Finding } from "../finding.ts";
import type { Repo } from "../repo.ts";

export type Rule = (repo: Repo) => Promise<Finding[]>;

const RULES: readonly Rule[] = [];

export async function runRules(repo: Repo): Promise<Finding[]> {
  const results = await Promise.all(RULES.map((rule) => rule(repo)));
  return results.flat();
}
