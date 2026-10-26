import { test } from "node:test";
import type { TestContext } from "node:test";
import { createFixture } from "./fixture.ts";
import { loadRepo } from "./repo.ts";
import { findingsFromReport, validateRepo } from "./validate.ts";

test("findingsFromReport fails every validator issue except the accepted warnings", (t: TestContext) => {
  const report = {
    success: false,
    manifest: {
      file: "/repo/plugins/alpha/.claude-plugin/plugin.json",
      errors: [{ path: "version", message: "Invalid version", code: null }],
      warnings: [],
    },
    contents: [
      {
        file: "/repo/plugins/alpha/CLAUDE.md",
        errors: [],
        warnings: [{ path: "root", message: "CLAUDE.md at the plugin root is not loaded as project context. Use a skill." }],
      },
      {
        file: "/repo/plugins/alpha/hooks/hooks.json",
        errors: [],
        warnings: [{ path: "hooks.Stop", message: "Shell command uses ${CLAUDE_PLUGIN_ROOT} without quotes" }],
      },
    ],
    directory: { warnings: [{ path: "icon", message: "No icon" }] },
  };

  const findings = findingsFromReport(JSON.stringify(report), "/repo");

  t.assert.deepStrictEqual(findings, [
    {
      rule: "validate",
      severity: "error",
      file: "plugins/alpha/.claude-plugin/plugin.json",
      message: "version: Invalid version",
    },
    {
      rule: "validate",
      severity: "error",
      file: "plugins/alpha/hooks/hooks.json",
      message: "hooks.Stop: Shell command uses ${CLAUDE_PLUGIN_ROOT} without quotes",
    },
  ]);
});

test("validateRepo reports what claude plugin validate finds in a plugin", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.write(
    "plugins/alpha/hooks/hooks.json",
    JSON.stringify({
      hooks: { Stop: [{ hooks: [{ type: "command", command: "node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js" }] }] },
    }),
  );
  await fixture.write("plugins/alpha/hooks/stop.js", "");

  const findings = await validateRepo(await loadRepo(fixture.root));

  t.assert.deepStrictEqual(
    findings.map((f) => [f.file, f.severity]),
    [["plugins/alpha/hooks/hooks.json", "error"]],
  );
  t.assert.match(findings[0]?.message ?? "", /without quotes/);
});
