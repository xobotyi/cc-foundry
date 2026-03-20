# Memory (CLAUDE.md and Auto Memory)

Two mechanisms carry knowledge across Claude Code sessions:

- **CLAUDE.md files** -- instructions you write for persistent context
- **Auto memory** -- notes Claude writes itself based on corrections and preferences

Both are loaded at the start of every conversation as context (not enforced configuration). More specific and concise
instructions produce more consistent adherence.

## CLAUDE.md vs Auto Memory

- **CLAUDE.md**: written by you, contains instructions/rules, scoped to project/user/org, loaded in full every session
- **Auto memory**: written by Claude, contains learnings/patterns, scoped per working tree, first 200 lines loaded every
  session

## CLAUDE.md Files

### Locations (precedence: more specific wins)

- **Managed policy**:
  - macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`
  - Linux/WSL: `/etc/claude-code/CLAUDE.md`
  - Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`
- **Project**: `./CLAUDE.md` or `./.claude/CLAUDE.md` (shared via source control)
- **User**: `~/.claude/CLAUDE.md` (personal, all projects)

Files in ancestor directories above cwd load at launch. Files in subdirectories load on demand when Claude reads files
in those directories.

### Writing Effective Instructions

- **Size**: target under 200 lines per file
- **Structure**: use markdown headers and bullets
- **Specificity**: concrete, verifiable instructions ("Use 2-space indentation" not "Format code properly")
- **Consistency**: avoid contradicting rules across files

### Imports

Use `@path/to/import` syntax. Relative paths resolve relative to the containing file. Max depth: 5 hops.

```text
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- git workflow @docs/git-instructions.md
- @~/.claude/my-project-instructions.md
```

First encounter of external imports triggers an approval dialog.

### Loading Behavior

- Walks up from cwd, loading CLAUDE.md at each directory level
- Subdirectory CLAUDE.md files load on demand when Claude reads files in those subdirectories
- `--add-dir` directories do NOT load CLAUDE.md by default; set `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` to
  include them
- Use `claudeMdExcludes` setting to skip irrelevant files in monorepos

### `.claude/rules/` Directory

Modular instruction files. Each `.md` file covers one topic. Discovered recursively.

```text
.claude/
├── CLAUDE.md
└── rules/
    ├── code-style.md
    ├── testing.md
    └── security.md
```

Rules without `paths` frontmatter load at launch. Path-scoped rules trigger when Claude reads matching files.

#### Path-Specific Rules

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
```

Glob pattern examples:

- `**/*.ts` -- all TypeScript files
- `src/**/*` -- all files under src/
- `*.md` -- markdown files in project root
- `src/components/*.tsx` -- specific directory

Supports brace expansion: `"src/**/*.{ts,tsx}"`

#### User-Level Rules

`~/.claude/rules/` -- applies to every project. Loaded before project rules (lower priority).

#### Symlinks

`.claude/rules/` supports symlinks for sharing rules across projects. Circular symlinks are detected.

### Excluding CLAUDE.md Files

`claudeMdExcludes` setting -- skip files by path or glob pattern:

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

Managed policy CLAUDE.md files cannot be excluded.

### Managed vs Settings

- **Settings** (`permissions.deny`, `sandbox.enabled`, etc.) -- enforced by client regardless of Claude's decisions
- **CLAUDE.md** -- shapes Claude's behavior but is not a hard enforcement layer

## Auto Memory

Claude saves notes across sessions: build commands, debugging insights, architecture notes, preferences.

### Enable/Disable

On by default. Toggle via `/memory` command or setting:

```json
{ "autoMemoryEnabled": false }
```

Or env var: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`

### Storage

`~/.claude/projects/<project>/memory/` -- derived from git repo (all worktrees share one directory).

```text
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Concise index, loaded every session (first 200 lines)
├── debugging.md       # Topic files, read on demand
└── ...
```

Custom location via `autoMemoryDirectory` setting (not accepted from project settings):

```json
{ "autoMemoryDirectory": "~/my-custom-memory-dir" }
```

### How It Works

- First 200 lines of `MEMORY.md` loaded at session start
- Topic files read on demand via file tools
- CLAUDE.md files loaded in full regardless of length
- `/memory` command: browse loaded files, toggle auto memory, open memory folder

### `/memory` Command

Lists all CLAUDE.md and rules files loaded in the current session. Select any file to open in editor.

## Troubleshooting

- **Not following CLAUDE.md**: run `/memory` to verify loading; check location; make instructions more specific; look
  for conflicts
- **System prompt level**: use `--append-system-prompt` (per-invocation, suited for scripts)
- **Debug loading**: use `InstructionsLoaded` hook to log which files load, when, and why
- **Too large**: move content to `@path` imports or `.claude/rules/` files
- **Lost after `/compact`**: CLAUDE.md survives compaction (re-read from disk); conversation-only instructions do not

## Subagent Memory

Subagents can maintain their own auto memory. See subagent configuration for details.
