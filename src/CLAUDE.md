# Development Tools

The repository's dev CLI. Run every command from the repository root.

```bash
vp install
vp run cli <command> [options]
vp check          # format, lint, and type-check every file
```

## Commands

### check

Check the marketplace and every plugin with `claude plugin validate`, then against this repository's own rules.

```bash
vp run cli check [--pre-push] [--format text|github]
vp run test        # node:test suites under src/
vp run typecheck   # tsc
```

**Flags:**

- `--pre-push` — `unbumped-change` compares against `origin/master` instead of each plugin's latest release tag, and
  fails instead of warning
- `--format` — `github` prints GitHub Actions annotations, and is the default when `GITHUB_ACTIONS` is set

**Behavior:**

- Runs `claude plugin validate --json` on the marketplace and on each `plugins/*/`, so `claude` must be on `PATH`
- Reads the full git history and the release tags; a shallow clone breaks `renames-history` and `unbumped-change`
- Every validator error and warning fails the check, except the accepted warnings in `ACCEPTED_WARNINGS`
  (`src/check/validate.ts`): the plugin-root `CLAUDE.md` warning. The validator's plugin-directory checks (icon,
  listing) and its advice are ignored
- Exits 1 when any finding is an error

**Rules** — each finding names its rule:

- `catalog-entry` — each `plugins/*/` has exactly one marketplace entry, and the directory name, entry `name`, manifest
  `name`, and `source` (`./plugins/<name>`) agree
- `entry-keys` — an entry carries only `name`, `source`, `category`, `tags`, and the entry-only keys `strict`,
  `relevance`, `headers`, `headersHelper` ([ADR 1.12](/design-docs/adr/1.12-plugin-metadata-source.md))
- `renames-history` — every plugin name in the git history of `marketplace.json` is listed today or is a `renames` key
- `license` — each plugin's `LICENSE` is byte-identical to the root `LICENSE`
- `readme-install` — each plugin README carries the install commands the root `CLAUDE.md` prescribes, for its own name
- `default-paths` — no manifest key names the location Claude Code reads by default, such as
  `"lspServers": "./.lsp.json"`
- `hook-exec-form` — a hook command that names `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_PLUGIN_DATA}` sets `args`, so no
  shell splits the expanded path
- `skill-ref` — an explicit reference, `Skill(plugin:name)` or a code span that is exactly `plugin:name` or
  `/plugin:name`, names a skill, agent, or command of that plugin. Only prefixes that are plugins of this marketplace
  count, so `node:test` stays out. Scans the plugins, the root docs, `.claude/`, and `design-docs/`, skipping `.dev/`
- `prerequisite-dependency` — a `<prerequisite>` block in a plugin's skill, agent, command, or output style that names
  another plugin's skill needs that plugin in `dependencies` ([ADR 1.3](/design-docs/adr/1.3-skill-dependencies.md)). A
  bare code span counts when it equals a skill name: the block's own plugin first, then the one plugin that ships it; a
  name two other plugins ship is an error
- `dependency-scope` — every `dependencies` entry is a plugin of this marketplace
- `release-version` — a plugin's version is not below its latest `<plugin>-v<X.Y.Z>` release tag
- `unbumped-change` — a plugin whose shipped files changed keeps no unchanged version. Shipped means everything except
  `CLAUDE.md`, `README.md`, `LICENSE`, `.dev/`, `tests/`, and `*.test.*`; a `plugin.json` change counts unless it only
  touches display keys (`description`, `keywords`, `author`, …) or a key naming its default location. A warning since
  the latest release tag, an error under `--pre-push`
- `root-docs` — the root `CLAUDE.md` names `plugins/<name>/` and the root `README.md` has a `### <name>` section, for
  every plugin. Only the names are checked, not the prose around them

**Adding a rule:** a function in `src/check/rules/`, listed in `RULES` (`src/check/rules/index.ts`), with a test that
breaks it on a `createFixture()` repository (`src/check/fixture.ts`). A rule never repeats a check that
`claude plugin validate` makes.

### docs-fetch

Fetch the URLs listed in a skill's `reference-inventory.json` into a `reference/` directory beside that inventory file.

```bash
vp run cli docs-fetch <inventory-path> [--dirty]

# e.g. vp run cli docs-fetch plugins/ai-helpers/skills/prompt-engineering/.dev/reference-inventory.json
```

**Arguments:**

- `inventory-path` — Path to `reference-inventory.json` file

**Flags:**

- `--dirty` — Keep existing reference files. Without it the `reference/` directory is deleted before fetching — that is
  what drops files whose sources were removed from the inventory.

**Inventory format:**

```json
{
  "sources": {
    "Label Name": "https://example.com/docs/page"
  }
}
```

**Behavior:**

- URL ending in `.md` or `.mdx` — saved as raw markdown
- Any other URL — HTML fetched, extracted with Readability, converted to markdown; if extraction fails the page is saved
  as `.html` instead
- Every saved file gets YAML frontmatter with `url` and `fetchedAt`
- `lastFetched` in the inventory file is rewritten after the run
