import type {Finding} from '../finding.ts';
import type {Repo} from '../repo.ts';

export type RuleContext = {
	/** Judge only the commits about to be pushed, and fail where a normal run warns. */
	readonly prePush: boolean;
};

export type Rule = (repo: Repo, ctx: RuleContext) => Finding[] | Promise<Finding[]>;
