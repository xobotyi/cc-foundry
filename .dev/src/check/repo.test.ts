import { test } from "node:test";
import type { TestContext } from "node:test";
import { createFixture } from "./fixture.ts";
import { loadRepo } from "./repo.ts";

test("loadRepo reads the catalog, each manifest, and each plugin's components", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.editManifest("alpha", (m) => {
    m.dependencies = ["beta", "gamma@other", { name: "delta", marketplace: "elsewhere" }];
  });
  await fixture.write("plugins/beta/agents/scout.md", "---\nname: scout\n---\n");
  await fixture.write("plugins/beta/skills/notes/README.md", "a directory without SKILL.md is not a skill\n");

  const repo = await loadRepo(fixture.root);

  t.assert.deepStrictEqual(
    repo.marketplace.entries.map((e) => [e.name, e.source]),
    [
      ["alpha", "./plugins/alpha"],
      ["beta", "./plugins/beta"],
    ],
  );
  t.assert.deepStrictEqual(
    repo.plugins.map((p) => [p.dir, p.manifest.name, p.manifest.version, p.skills, p.agents]),
    [
      ["alpha", "alpha", "1.0.0", ["one"], []],
      ["beta", "beta", "1.0.0", ["two"], ["scout"]],
    ],
  );
  t.assert.deepStrictEqual(repo.plugins[0]?.manifest.dependencies, [
    { name: "beta", marketplace: null },
    { name: "gamma", marketplace: "other" },
    { name: "delta", marketplace: "elsewhere" },
  ]);
});

test("loadRepo names the file when a manifest is not JSON", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.write("plugins/beta/.claude-plugin/plugin.json", "{ not json");

  await t.assert.rejects(loadRepo(fixture.root), /plugins\/beta\/\.claude-plugin\/plugin\.json: cannot read JSON/);
});
