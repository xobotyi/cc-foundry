# cc-foundry

Claude Code plugin development repository.

## Structure

```
cc-foundry/
├── .dev/                 # Development CLI tools
├── plugins/              # Plugin packages
│   ├── ai-helpers/       # AI artifact engineering skills
│   ├── git-commit/       # Git commit workflow
│   └── skill-enforcer/   # Skill activation enforcement
└── CLAUDE.md
```

Each plugin has its own `CLAUDE.md` with plugin-specific context.

## Building Skills with External Documentation

<workflow>
When a skill needs to embed external documentation as reference material:

1. **Create inventory** — add `.dev/reference-inventory.json` in the skill directory:
   ```json
   {
     "sources": {
       "Topic Name": "https://example.com/docs/page.md"
     }
   }
   ```

2. **Fetch docs** — from repo root:
   ```bash
   cd .dev && yarn cli docs-fetch <path-to-inventory.json>
   ```
   URLs ending in `.md` fetch as raw markdown. Others convert from HTML.

3. **Distill into references** — process fetched content into skill `references/*.md` files

Full CLI docs: [.dev/CLAUDE.md](.dev/CLAUDE.md)
</workflow>

## Conventions

<conventions>
**Skill structure:**
- Router pattern: SKILL.md routes to `references/` for detailed content
- Keep SKILL.md under 500 lines; move depth to references

**Development artifacts:**
- `.dev/` directories contain build tooling and source materials
- `.dev/reference/` holds fetched docs (raw source, not shipped as-is)
- `references/` holds processed content (shipped with plugin)

**Plugin context:**
- Each plugin has `CLAUDE.md` explaining its components
- Each plugin has `README.md` for user-facing documentation

**Version management:**
- Plugin versions must be synchronized between `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
- Update both files when bumping versions
</conventions>
