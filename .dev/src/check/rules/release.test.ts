import { test } from "node:test";
import type { TestContext } from "node:test";
import type { Finding } from "../finding.ts";
import { createFixture } from "../fixture.ts";
import type { Fixture } from "../fixture.ts";
import { loadRepo } from "../repo.ts";
import { releaseVersion, unbumpedChanges } from "./release.ts";

const brief = (findings: Finding[]) => findings.map((f) => `${f.severity} ${f.file}: ${f.message}`);

const normalRun = { prePush: false };
const prePush = { prePush: true };

async function released(): Promise<Fixture> {
  const fixture = await createFixture();
  await fixture.git("tag", "alpha-v1.0.0");
  return fixture;
}

test("release-version reports a version below the latest release tag", async (t: TestContext) => {
  await using fixture = await released();
  await fixture.git("tag", "alpha-v1.2.0");
  await fixture.git("tag", "alpha-v1.10.0");

  t.assert.deepStrictEqual(brief(await releaseVersion(await loadRepo(fixture.root))), [
    "error plugins/alpha/.claude-plugin/plugin.json: version 1.0.0 is below the latest release alpha-v1.10.0",
  ]);
});

test("unbumped-change warns about a shipped change since the release tag", async (t: TestContext) => {
  await using fixture = await released();
  await fixture.write("plugins/alpha/skills/one/SKILL.md", "---\nname: one\ndescription: Changed.\n---\n");
  await fixture.commit("change one");

  t.assert.deepStrictEqual(brief(await unbumpedChanges(await loadRepo(fixture.root), normalRun)), [
    "warning plugins/alpha/.claude-plugin/plugin.json: skills/one/SKILL.md changed since alpha-v1.0.0, " +
      "and the version is still 1.0.0",
  ]);

  await fixture.editManifest("alpha", (m) => {
    m.version = "1.0.1";
  });

  t.assert.deepStrictEqual(await unbumpedChanges(await loadRepo(fixture.root), normalRun), []);
});

test("unbumped-change ignores docs, dev files, tests, and display-only manifest keys", async (t: TestContext) => {
  await using fixture = await released();
  await fixture.write("plugins/alpha/README.md", "# alpha, reworded\n");
  await fixture.write("plugins/alpha/CLAUDE.md", "# alpha\n");
  await fixture.write("plugins/alpha/.dev/notes.md", "notes\n");
  await fixture.write("plugins/alpha/tests/one.test.ts", "");
  await fixture.editManifest("alpha", (m) => {
    m.description = "A new description";
    m.keywords = ["new"];
    m.lspServers = "./.lsp.json";
  });
  await fixture.commit("docs and metadata");

  t.assert.deepStrictEqual(await unbumpedChanges(await loadRepo(fixture.root), normalRun), []);
});

test("unbumped-change counts a manifest key that changes the install", async (t: TestContext) => {
  await using fixture = await released();
  await fixture.editManifest("alpha", (m) => {
    m.dependencies = ["beta"];
  });

  t.assert.deepStrictEqual(brief(await unbumpedChanges(await loadRepo(fixture.root), normalRun)), [
    "warning plugins/alpha/.claude-plugin/plugin.json: .claude-plugin/plugin.json changed since alpha-v1.0.0, " +
      "and the version is still 1.0.0",
  ]);
});

test("unbumped-change before a push judges only the commits the remote lacks, and fails", async (t: TestContext) => {
  await using fixture = await createFixture();
  await fixture.write("plugins/beta/skills/two/SKILL.md", "---\nname: two\ndescription: Old change.\n---\n");
  await fixture.commit("pushed earlier");
  await fixture.git("update-ref", "refs/remotes/origin/master", "HEAD");
  await fixture.write("plugins/alpha/skills/one/SKILL.md", "---\nname: one\ndescription: New change.\n---\n");
  await fixture.write("plugins/gamma/.claude-plugin/plugin.json", '{ "name": "gamma", "version": "0.1.0" }\n');
  await fixture.commit("not pushed yet");

  t.assert.deepStrictEqual(brief(await unbumpedChanges(await loadRepo(fixture.root), prePush)), [
    "error plugins/alpha/.claude-plugin/plugin.json: skills/one/SKILL.md changed origin/master..HEAD, " +
      "and the version is still 1.0.0",
  ]);

  await fixture.editManifest("alpha", (m) => {
    m.version = "1.1.0";
  });
  await fixture.commit("bump alpha");

  t.assert.deepStrictEqual(await unbumpedChanges(await loadRepo(fixture.root), prePush), []);
});
