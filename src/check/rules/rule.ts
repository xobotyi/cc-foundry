import type { Finding } from "../finding.ts";
import type { Repo } from "../repo.ts";

export interface RuleContext {
  /** Judge only the commits about to be pushed, and fail where a normal run warns. */
  prePush: boolean;
}

export type Rule = (repo: Repo, ctx: RuleContext) => Promise<Finding[]>;
