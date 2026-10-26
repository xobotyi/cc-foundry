import { test } from "node:test";
import type { TestContext } from "node:test";
import type { Finding } from "../finding.ts";
import { createFixture } from "../fixture.ts";
import { loadRepo } from "../repo.ts";
import { defaultLocations, hookExecForm, licenseCopy, readmeInstall } from "./plugin.ts";

const brief = (findings: Finding[]) => findings.map((f) => `${f.file}: ${f.message}`);

test("well-formed plugins pass", async (t: TestContext) => {
  await using fixture = await createFixture();
  const repo = await loadRepo(fixture.root);

  const rules = [licenseCopy, readmeInstall, defaultLocations, hookExecForm];
  const findings = await Promise.all(rules.map((rule) => rule(repo)));

  t.assert.deepStrictEqual(findings.flat(), []);
});

test("license reports a missing and a diverged copy", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.remove("plugins/alpha/LICENSE");
  await fixture.write("plugins/beta/LICENSE", "MIT License\n\nCopyright (c) someone else\n");

  t.assert.deepStrictEqual(brief(await licenseCopy(await loadRepo(fixture.root))), [
    "plugins/alpha/LICENSE: the plugin has no LICENSE; copy the root LICENSE",
    "plugins/beta/LICENSE: LICENSE differs from the root LICENSE",
  ]);
});

test("readme-install reports each missing install line", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.write("plugins/alpha/README.md", "# alpha\n\n```\n/plugin install alpha\n```\n");

  t.assert.deepStrictEqual(brief(await readmeInstall(await loadRepo(fixture.root))), [
    "plugins/alpha/README.md: the README has no line `/plugin install alpha --marketplace xobotyi/cc-foundry`",
    "plugins/alpha/README.md: the README has no line `/plugin marketplace add xobotyi/cc-foundry`",
    "plugins/alpha/README.md: the README has no line `/plugin install alpha@foundry`",
  ]);
});

test("default-paths reports a key naming its default location, and keeps a custom one", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.editManifest("alpha", (m) => {
    m.lspServers = "./.lsp.json";
    m.outputStyles = ["./output-styles/"];
    m.agents = "./custom-agents/";
    m.experimental = { monitors: "monitors/monitors.json" };
  });

  const findings = await defaultLocations(await loadRepo(fixture.root));

  t.assert.deepStrictEqual(brief(findings), [
    'plugins/alpha/.claude-plugin/plugin.json: "lspServers" names its default location ./.lsp.json',
    'plugins/alpha/.claude-plugin/plugin.json: "outputStyles" names its default location ./output-styles',
    'plugins/alpha/.claude-plugin/plugin.json: "experimental.monitors" names its default location ' +
      "./monitors/monitors.json",
  ]);
  t.assert.ok(findings.every((f) => f.line !== undefined));
});

test("hook-exec-form reports a shell-form command that names a plugin path", async (t: TestContext) => {
  await using fixture = await createFixture();
  const handler = (command: string, args?: string[]) => ({ hooks: [{ type: "command", command, args }] });
  await fixture.write(
    "plugins/alpha/hooks/hooks.json",
    JSON.stringify(
      {
        hooks: {
          Stop: [handler("node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js")],
          SessionStart: [handler("node", ["${CLAUDE_PLUGIN_ROOT}/hooks/start.js"]), handler("echo hi | cat")],
        },
      },
      null,
      2,
    ),
  );

  const findings = await hookExecForm(await loadRepo(fixture.root));

  t.assert.deepStrictEqual(brief(findings), [
    "plugins/alpha/hooks/hooks.json: `node ${CLAUDE_PLUGIN_ROOT}/hooks/stop.js` runs through a shell; " +
      "split it into command and args",
  ]);
  t.assert.strictEqual(findings[0]?.line, 8);
});
