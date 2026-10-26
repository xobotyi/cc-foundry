import { expect, test } from "vite-plus/test";
import { createFixture } from "../fixture.ts";
import { loadRepo } from "../repo.ts";
import { rootDocs } from "./docs.ts";

test("root-docs reports a plugin missing from the root CLAUDE.md or README", async () => {
  await using fixture = await createFixture();

  expect(await rootDocs(await loadRepo(fixture.root))).toStrictEqual([]);

  await fixture.write("CLAUDE.md", "# fixture\n\n## Plugins\n\n- `plugins/alpha/`\n");
  await fixture.write("README.md", "# fixture\n\n### beta\n");

  expect((await rootDocs(await loadRepo(fixture.root))).map((f) => `${f.file}: ${f.message}`)).toStrictEqual([
      'README.md: no "### alpha" section describes the plugin',
      "CLAUDE.md: the plugin list does not name plugins/beta/",
    ]);
});
