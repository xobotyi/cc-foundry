import { test } from "node:test";
import type { TestContext } from "node:test";
import { createFixture } from "../fixture.ts";
import { loadRepo } from "../repo.ts";
import { rootDocs } from "./docs.ts";

test("root-docs reports a plugin missing from the root CLAUDE.md or README", async (t: TestContext) => {
  await using fixture = await createFixture();

  t.assert.deepStrictEqual(await rootDocs(await loadRepo(fixture.root)), []);

  await fixture.write("CLAUDE.md", "# fixture\n\n## Plugins\n\n- `plugins/alpha/`\n");
  await fixture.write("README.md", "# fixture\n\n### beta\n");

  t.assert.deepStrictEqual(
    (await rootDocs(await loadRepo(fixture.root))).map((f) => `${f.file}: ${f.message}`),
    [
      'README.md: no "### alpha" section describes the plugin',
      "CLAUDE.md: the plugin list does not name plugins/beta/",
    ],
  );
});
