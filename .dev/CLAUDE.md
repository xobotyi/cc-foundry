# .dev — Development Tools

## Running Commands

```bash
cd .dev
yarn cli <command> [options]
```

## Commands

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
