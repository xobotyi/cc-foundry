# Memory Management Reference

Claude Code persists instructions across sessions using CLAUDE.md files.

## Memory Hierarchy

| Memory Type            | Location                                           | Purpose                               | Shared With                     |
|------------------------|----------------------------------------------------|---------------------------------------|---------------------------------|
| Managed policy         | System paths (see below)                           | Organization-wide instructions        | All users in organization       |
| Project memory         | `./CLAUDE.md` or `./.claude/CLAUDE.md`             | Team-shared project instructions      | Team via source control         |
| Project rules          | `./.claude/rules/*.md`                             | Modular topic-specific instructions   | Team via source control         |
| User memory            | `~/.claude/CLAUDE.md`                              | Personal preferences for all projects | Just you (all projects)         |
| Project memory (local) | `./CLAUDE.local.md`                                | Personal project-specific preferences | Just you (current project)      |

**Managed policy paths:**

- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- Linux: `/etc/claude-code/CLAUDE.md`
- Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`

Files higher in hierarchy take precedence and are loaded first.

## Import Syntax

CLAUDE.md files can import additional files using `@path/to/import`:

```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
- Personal overrides @~/.claude/my-project-instructions.md
```

**Rules:**

- Both relative and absolute paths allowed
- Home directory paths (`~/.claude/...`) work for individual instructions
- Imports not evaluated inside code spans/blocks
- Recursive imports supported (max 5 hops)
- Run `/memory` to see loaded memory files

## Memory Lookup

Claude Code reads memories recursively:

1. Starting in cwd, recurses up to root
2. Reads any `CLAUDE.md` or `CLAUDE.local.md` found
3. Discovers nested CLAUDE.md in subtrees when reading files in those directories

### Load from Additional Directories

The `--add-dir` flag gives access to additional directories. To also load
memory files from these directories:

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

## Edit Memories

Use `/memory` command to open any memory file in your system editor.

## Bootstrap Project Memory

```
> /init
```

Analyzes codebase to detect build systems, test frameworks, and patterns.

## Modular Rules with `.claude/rules/`

Organize instructions into multiple files:

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # Main project instructions
│   └── rules/
│       ├── code-style.md   # Code style guidelines
│       ├── testing.md      # Testing conventions
│       └── security.md     # Security requirements
```

All `.md` files in `.claude/rules/` loaded as project memory.

### Path-Specific Rules

Scope rules to specific files using YAML frontmatter:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format
```

Rules without `paths` field apply to all files.

### Glob Patterns

| Pattern                | Matches                               |
|------------------------|---------------------------------------|
| `**/*.ts`              | All TypeScript files in any directory |
| `src/**/*`             | All files under `src/`                |
| `*.md`                 | Markdown files in project root        |
| `src/components/*.tsx` | React components in specific directory|

Multiple patterns:

```yaml
---
paths:
  - "src/**/*.ts"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

Brace expansion:

```yaml
---
paths:
  - "src/**/*.{ts,tsx}"
  - "{src,lib}/**/*.ts"
---
```

### Subdirectories

```
.claude/rules/
├── frontend/
│   ├── react.md
│   └── styles.md
├── backend/
│   ├── api.md
│   └── database.md
└── general.md
```

All `.md` files discovered recursively.

### Symlinks

Share common rules across projects:

```bash
# Symlink a shared rules directory
ln -s ~/shared-claude-rules .claude/rules/shared

# Symlink individual files
ln -s ~/company-standards/security.md .claude/rules/security.md
```

Symlinks resolved normally. Circular symlinks handled gracefully.

### User-Level Rules

Personal rules in `~/.claude/rules/`:

```
~/.claude/rules/
├── preferences.md    # Personal coding preferences
└── workflows.md      # Preferred workflows
```

User-level rules loaded before project rules (project rules have higher priority).

## Organization-Level Management

Deploy centrally managed CLAUDE.md via configuration management (MDM, Group
Policy, Ansible) to the managed policy location.

## Best Practices

- **Be specific**: "Use 2-space indentation" not "Format code properly"
- **Use structure**: Bullet points grouped under descriptive headings
- **Review periodically**: Update as project evolves
- **Keep focused**: Each rules file should cover one topic
- **Use descriptive filenames**: Filename should indicate content
- **Use conditional rules sparingly**: Only add `paths` when truly file-specific
- **Organize with subdirectories**: Group related rules
