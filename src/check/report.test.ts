import { test } from "node:test";
import type { TestContext } from "node:test";
import type { Finding } from "./finding.ts";
import { formatFindings } from "./report.ts";

const findings: Finding[] = [
  { rule: "readme-install", severity: "warning", file: "plugins/b/README.md", message: "missing line" },
  { rule: "skill-ref", severity: "error", file: "plugins/a/SKILL.md", line: 12, message: "100% broken,\nreally" },
];

test("text output lists findings by file, then the totals", (t: TestContext) => {
  t.assert.strictEqual(
    formatFindings(findings, "text"),
    [
      "error   plugins/a/SKILL.md:12  [skill-ref] 100% broken,\nreally",
      "warning plugins/b/README.md  [readme-install] missing line",
      "1 error, 1 warning",
      "",
    ].join("\n"),
  );
});

test("github output escapes the workflow-command syntax", (t: TestContext) => {
  t.assert.strictEqual(
    formatFindings(findings, "github"),
    [
      "::error file=plugins/a/SKILL.md,line=12,title=skill-ref::100%25 broken,%0Areally",
      "::warning file=plugins/b/README.md,title=readme-install::missing line",
      "1 error, 1 warning",
      "",
    ].join("\n"),
  );
});
