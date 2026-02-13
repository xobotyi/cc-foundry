# .dev — Development Tools

Internal CLI tools for cc-foundry plugin development.

## Running Commands

```bash
cd .dev
yarn cli <command> [options]
```

## Commands

### docs-fetch

Fetch documentation from URLs listed in a skill's
`reference-inventory.json` and save as markdown files.

```bash
yarn cli docs-fetch <inventory-path> [--dirty]
```

**Arguments:**
- `inventory-path` — Path to `reference-inventory.json` file

**Flags:**
- `--dirty` — Keep existing reference files (skip cleanup).
  By default, the `reference/` folder is deleted before fetching
  to remove orphaned files when sources are removed from inventory.

**Example:**

```bash
# Fetch prompt-engineering skill references (clean rebuild)
yarn cli docs-fetch \
  ../plugins/ai-helpers/skills/prompt-engineering/.dev/reference-inventory.json

# Incremental fetch (keep existing files)
yarn cli docs-fetch \
  ../plugins/ai-helpers/skills/prompt-engineering/.dev/reference-inventory.json \
  --dirty
```

**Inventory format:**

```json
{
  "sources": {
    "Label Name": "https://example.com/docs/page"
  }
}
```

The command:
1. If URL ends with `.md` — treats as raw markdown
2. Otherwise — fetches HTML, extracts with Readability, converts to markdown
3. Adds YAML frontmatter with source URL and fetch timestamp
4. Updates `lastFetched` in inventory file

---

**Maintenance:** Update this document when adding commands or
changing existing behavior.