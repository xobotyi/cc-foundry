# .dev — Development Tools

## Running Commands

```bash
cd .dev
yarn cli <command> [options]
```

## Commands

### check

Check the marketplace and every plugin with `claude plugin validate`, then against this repository's own rules.

```bash
yarn cli check [--format text|github]
yarn test        # node:test suites under src/
yarn typecheck   # tsc
```

**Flags:**

- `--format` — `github` prints GitHub Actions annotations, and is the default when `GITHUB_ACTIONS` is set

**Behavior:**

- Runs `claude plugin validate --json` on the marketplace and on each `plugins/*/`, so `claude` must be on `PATH`
- Every validator error and warning fails the check, except the accepted warnings in `ACCEPTED_WARNINGS`
  (`src/check/validate.ts`): the plugin-root `CLAUDE.md` warning. The validator's plugin-directory checks (icon,
  listing) and its advice are ignored
- Exits 1 when any finding is an error

**Adding a rule:** a function in `src/check/rules/`, listed in `RULES` (`src/check/rules/index.ts`), with a test that
breaks it on a `createFixture()` repository (`src/check/fixture.ts`). A rule never repeats a check that
`claude plugin validate` makes.

### docs-fetch

Fetch the URLs listed in a skill's `reference-inventory.json` into a `reference/` directory beside that inventory file.

```bash
yarn cli docs-fetch <inventory-path> [--dirty]

# e.g. yarn cli docs-fetch ../plugins/ai-helpers/skills/prompt-engineering/.dev/reference-inventory.json
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
