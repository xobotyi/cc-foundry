# Memory and Project Instructions

Two mechanisms carry knowledge across Claude Code sessions: CLAUDE.md files (instructions you write) and auto memory
(notes Claude writes itself). Both are loaded at the start of every conversation.

## .claude Directory Tree (Memory-Related)

```
your-project/
├── CLAUDE.md                          # Project instructions (committed)
├── CLAUDE.local.md                    # Personal project overrides (gitignored)
└── .claude/
    ├── CLAUDE.md                      # Alternative location for project instructions
    ├── rules/
    │   ├── code-style.md              # Unconditional rule (no paths: frontmatter)
    │   ├── testing.md                 # Path-scoped rule (paths: "**/*.test.ts")
    │   └── frontend/                  # Subdirectories discovered recursively
    │       └── react.md
    └── settings.json                  # claudeMdExcludes, autoMemoryEnabled

~/
├── .claude/
│   ├── CLAUDE.md                      # User instructions (all projects)
│   ├── rules/                         # User-level rules (all projects)
│   │   ├── preferences.md
│   │   └── workflows.md
│   └── projects/
│       └── <project>/memory/          # Auto memory (per project)
│           ├── MEMORY.md              # Index loaded every session
│           ├── debugging.md           # Topic file (read on demand)
│           └── api-conventions.md     # Topic file (read on demand)
│
│   # Managed policy (cannot be excluded)
├── /Library/Application Support/ClaudeCode/CLAUDE.md    # macOS
├── /etc/claude-code/CLAUDE.md                           # Linux/WSL
└── C:\Program Files\ClaudeCode\CLAUDE.md                # Windows
```

## CLAUDE.md Hierarchy

### Scope and Precedence

Instructions load from broadest to most specific. More specific locations take precedence when instructions conflict.
All discovered files are concatenated into context (not merged key-by-key like settings).

- **Managed policy** — OS-specific system path (see tree above). Organization-wide instructions managed by IT/DevOps.
  Shared with all users in org.
- **Project** — `./CLAUDE.md` or `./.claude/CLAUDE.md`. Team-shared project instructions. Shared via source control.
- **User** — `~/.claude/CLAUDE.md`. Personal preferences for all projects. Not shared.
- **Local** — `./CLAUDE.local.md`. Personal project-specific preferences. Not shared.

### Loading Behavior

- Claude Code walks up the directory tree from cwd, loading `CLAUDE.md` and `CLAUDE.local.md` at each level
- Within each directory, `CLAUDE.local.md` is appended after `CLAUDE.md` (personal notes are last-read at that level)
- CLAUDE.md files in subdirectories below cwd are **not loaded at launch** — they load on demand when Claude reads files
  in those subdirectories
- After `/compact`, project-root CLAUDE.md is re-read and re-injected; nested CLAUDE.md files reload when Claude next
  reads a file in that subdirectory
- Block-level HTML comments (`<!-- ... -->`) are stripped before injection (use for human-only notes without spending
  tokens)
- Managed policy CLAUDE.md **cannot be excluded** by any setting

### Additional Directories

The `--add-dir` flag gives Claude access to directories outside the main working directory. CLAUDE.md files from
additional directories are **not loaded by default**. Enable with:

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

`CLAUDE.local.md` files in additional directories are never loaded.

### Writing Effective Instructions

- **Size**: target under 200 lines per file; longer files reduce adherence
- **Structure**: markdown headers and bullets; organized sections over dense paragraphs
- **Specificity**: concrete and verifiable ("Use 2-space indentation" not "Format code properly")
- **Consistency**: conflicting rules across files cause arbitrary behavior; review periodically

## @import Syntax

CLAUDE.md files can import additional files using `@path/to/import`. Imported content expands inline at launch.

```text
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
```

- Relative paths resolve relative to the file containing the import, not the working directory
- Absolute paths are allowed
- Imported files can recursively import other files, **maximum depth of 5 hops**
- First encounter with external imports shows an approval dialog; declining disables imports permanently for that
  project

### Cross-Worktree Sharing

For personal instructions across git worktrees, import from home directory:

```text
- @~/.claude/my-project-instructions.md
```

### AGENTS.md Compatibility

If the repo uses `AGENTS.md` for other coding agents, import it:

```markdown
@AGENTS.md

## Claude Code
Use plan mode for changes under `src/billing/`.
```

## Path-Specific Rules (.claude/rules/)

Rules are markdown files in `.claude/rules/`, each covering one topic. All `.md` files are discovered recursively
(subdirectories supported).

### Loading

- Rules **without** `paths:` frontmatter load at session start (same priority as `.claude/CLAUDE.md`)
- Rules **with** `paths:` frontmatter load only when Claude reads a file matching the pattern
- User-level rules (`~/.claude/rules/`) load before project rules (project rules have higher priority)

### paths: Frontmatter

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "**/*.test.{ts,tsx}"
---

# API Testing Rules
- All endpoints must include input validation
```

Glob pattern examples:

- `**/*.ts` — all TypeScript files in any directory
- `src/**/*` — all files under `src/`
- `*.md` — markdown files in project root only
- `src/components/*.tsx` — React components in one directory
- `**/*.{ts,tsx}` — brace expansion for multiple extensions

### Symlinks

`.claude/rules/` supports symlinks for shared rule sets across projects:

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

Circular symlinks are detected and handled gracefully.

## claudeMdExcludes

Skip CLAUDE.md files by path or glob pattern. Useful in large monorepos where ancestor CLAUDE.md files are irrelevant.

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

- Patterns match against absolute file paths using glob syntax
- Configurable at any settings layer: user, project, local, or managed policy
- Arrays merge across layers
- Managed policy CLAUDE.md files **cannot be excluded**

## Auto Memory

Claude accumulates knowledge across sessions automatically: build commands, debugging insights, architecture notes, code
style preferences. Claude decides what's worth remembering based on future-conversation utility.

Requires Claude Code v2.1.59 or later.

### Enable/Disable

On by default. Toggle via:

- `/memory` command (in-session toggle)
- `autoMemoryEnabled` setting: `{"autoMemoryEnabled": false}`
- Environment variable: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`

### Storage

Each project gets its own memory directory:

```
~/.claude/projects/<project>/memory/
├── MEMORY.md              # Index loaded every session
├── debugging.md           # Topic file (on-demand)
└── api-conventions.md     # Topic file (on-demand)
```

- `<project>` is derived from the git repository path; all worktrees and subdirectories within the same repo share one
  directory
- Outside a git repo, the project root path is used
- Machine-local; not shared across machines or cloud environments

Custom directory via settings (accepted from policy, local, and user settings only — not project settings to prevent
redirecting writes to sensitive locations):

```json
{
  "autoMemoryDirectory": "~/my-custom-memory-dir"
}
```

### Loading

- First **200 lines** of `MEMORY.md`, or first **25KB** (whichever comes first), loaded at session start
- Content beyond this threshold is not loaded
- Topic files (e.g., `debugging.md`, `patterns.md`) are **not loaded at startup** — Claude reads them on demand
- CLAUDE.md files load in full regardless of length (unlike MEMORY.md)

### MEMORY.md Structure

Acts as an index. Claude keeps it concise by offloading detail to topic files:

```markdown
# Memory Index

## Project
- [build-and-test.md](build-and-test.md): npm run build (~45s), Vitest, dev server on 3001
- [architecture.md](architecture.md): API client singleton, refresh-token auth

## Reference
- [debugging.md](debugging.md): auth token rotation and DB connection troubleshooting
```

### Topic File Structure

Claude creates topic files with frontmatter when MEMORY.md grows:

```markdown
---
name: Debugging patterns
description: Auth token rotation and database connection troubleshooting
type: reference
---

## Auth Token Issues
- Refresh token rotation: old token invalidated immediately
- If 401 after refresh: check clock skew between client and server
```

### Subagent Memory

Subagents with `memory:` frontmatter get dedicated memory directories, separate from main session auto memory:

- **`project`** — `.claude/agent-memory/<agent-name>/`. Committed, shared with team.
- **`local`** — `.claude/agent-memory-local/<agent-name>/`. Gitignored, per-machine.
- **`user`** — `~/.claude/agent-memory/<agent-name>/`. Cross-project, personal.

Each subagent reads/writes its own MEMORY.md, not the main session's.

## /memory Command

Lists all loaded CLAUDE.md, CLAUDE.local.md, and rules files. Provides:

- Toggle auto memory on/off
- Link to open the auto memory folder
- File selection to open in editor

## Organization-Level Management

### Managed Policy CLAUDE.md

Deploy organization-wide instructions that cannot be excluded:

- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
- Linux/WSL: `/etc/claude-code/CLAUDE.md`
- Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`

Deploy via MDM, Group Policy, Ansible, or similar tools.

### Managed Settings vs Managed CLAUDE.md

- **Block specific tools, commands, or file paths** — managed settings: `permissions.deny`
- **Enforce sandbox isolation** — managed settings: `sandbox.enabled`
- **Environment variables and API provider routing** — managed settings: `env`
- **Authentication method and organization lock** — managed settings: `forceLoginMethod`, `forceLoginOrgUUID`
- **Code style and quality guidelines** — managed CLAUDE.md
- **Data handling and compliance reminders** — managed CLAUDE.md
- **Behavioral instructions for Claude** — managed CLAUDE.md

Settings are enforced by the client. CLAUDE.md instructions shape behavior but are not a hard enforcement layer.

## Troubleshooting

### Instructions Not Followed

- Run `/memory` to verify files are loaded
- Check file is in a loaded location (see hierarchy above)
- Make instructions more specific
- Check for conflicting instructions across files
- For system-prompt-level instructions, use `--append-system-prompt` (per-invocation, suited to scripts)
- Use the `InstructionsLoaded` hook to log which files load, when, and why

### After /compact

Project-root CLAUDE.md survives compaction and is re-injected. Nested CLAUDE.md files in subdirectories reload when
Claude next reads a file there. Conversation-only instructions are lost — add them to CLAUDE.md to persist.
