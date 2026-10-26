import { defineCommand } from "citty";
import path from "node:path";
import { formatFindings } from "../check/report.ts";
import type { Format } from "../check/report.ts";
import { loadRepo } from "../check/repo.ts";
import { runRules } from "../check/rules/index.ts";
import { validateRepo } from "../check/validate.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

export default defineCommand({
  meta: {
    name: "check",
    description: "Check marketplace and plugin integrity",
  },
  args: {
    "pre-push": {
      type: "boolean",
      default: false,
      description: "Compare against origin/master instead of the latest release tags, and fail on an unbumped change",
    },
    format: {
      type: "enum",
      options: ["text", "github"],
      description: "Output format; github when GITHUB_ACTIONS is set",
    },
  },
  async run({ args }) {
    const format: Format = args.format === "github" || args.format === "text"
      ? args.format
      : process.env.GITHUB_ACTIONS === "true" ? "github" : "text";
    const repo = await loadRepo(REPO_ROOT);
    const ctx = { prePush: args["pre-push"] };
    const [validated, ruled] = await Promise.all([validateRepo(repo), runRules(repo, ctx)]);
    const findings = [...validated, ...ruled];
    process.stdout.write(formatFindings(findings, format));
    if (findings.some((f) => f.severity === "error")) {
      process.exitCode = 1;
    }
  },
});
