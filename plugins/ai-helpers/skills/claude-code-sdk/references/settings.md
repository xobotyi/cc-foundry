# Settings and Permissions

## Configuration Scopes

Settings are resolved top-down. The first scope that defines a value wins. Deny rules at any level cannot be overridden
by lower levels.

1. **Managed** — server-managed, plist/registry, or `managed-settings.json`. Shared.
2. **CLI** — `--allowedTools`, `--disallowedTools`, `--permission-mode`, etc. Not shared.
3. **Local** — `.claude/settings.local.json` (gitignored). Not shared.
4. **Project** — `.claude/settings.json` (committed). Shared.
5. **User** — `~/.claude/settings.json`. Not shared.

Array-valued settings (`permissions.allow`, `sandbox.filesystem.allowWrite`, etc.) are **concatenated and deduplicated**
across scopes, not replaced.

### Settings File Locations

- **User** — `~/.claude/settings.json`
- **Project** — `.claude/settings.json` (shared), `.claude/settings.local.json` (personal)
- **Managed** — multiple delivery mechanisms:
  - macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`
  - Linux/WSL: `/etc/claude-code/managed-settings.json`
  - Windows: `C:\Program Files\ClaudeCode\managed-settings.json`
  - Drop-in dir: `managed-settings.d/*.json` (merged alphabetically on top of base file)
  - MDM: macOS plist `com.anthropic.claudecode`, Windows registry `HKLM\SOFTWARE\Policies\ClaudeCode`
  - Server: delivered via Claude.ai admin console

Managed tier internal precedence: server-managed > MDM/OS-level > file-based > HKCU registry (Windows). Only one managed
source is used; sources do not merge across tiers.

Global config (`~/.claude.json`) stores preferences, OAuth, MCP servers, and per-project state. These keys go there, not
in `settings.json`: `autoConnectIde`, `autoInstallIdeExtension`, `editorMode`, `showTurnDuration`,
`terminalProgressBarEnabled`, `teammateMode`.

### Schema Validation

Add `"$schema": "https://json.schemastore.org/claude-code-settings.json"` to any `settings.json` for autocomplete and
inline validation in editors.

## Settings Keys

### Core Settings

- **`model`** (string) — override default model (`"claude-sonnet-4-6"`, `"claude-opus-4-6"`)
- **`modelOverrides`** (object) — map Anthropic model IDs to provider-specific IDs (e.g., Bedrock ARNs)
- **`availableModels`** (string[]) — restrict models in `/model` picker. Does not affect the Default option.
- **`effortLevel`** (string) — persist effort level: `"low"`, `"medium"`, `"high"`. Written by `/effort`.
- **`alwaysThinkingEnabled`** (boolean) — enable extended thinking by default for all sessions
- **`showThinkingSummaries`** (boolean) — show thinking summaries in interactive sessions. Non-interactive always
  receives them.
- **`outputStyle`** (string) — output style name to adjust the system prompt
- **`language`** (string) — preferred response language (`"japanese"`, `"spanish"`, etc.). Also sets voice dictation
  language.
- **`agent`** (string) — run main thread as a named subagent, applying its system prompt and tool restrictions
- **`autoUpdatesChannel`** (string) — `"stable"` (one week old, skips regressions) or `"latest"` (default)
- **`cleanupPeriodDays`** (number) — session files older than N days deleted at startup (default: 30, min: 1)
- **`env`** (object) — environment variables applied to every session
- **`hooks`** (object) — lifecycle hooks configuration
- **`includeGitInstructions`** (boolean) — include built-in commit/PR instructions in system prompt (default: `true`)
- **`plansDirectory`** (string) — where plan files are stored (default: `~/.claude/plans`)
- **`autoMemoryDirectory`** (string) — custom auto memory storage dir. Not accepted in project settings.
- **`respectGitignore`** (boolean) — `@` file picker respects `.gitignore` (default: `true`)
- **`voiceEnabled`** (boolean) — enable push-to-talk voice dictation. Written by `/voice`.
- **`fastModePerSessionOptIn`** (boolean) — when `true`, fast mode resets each session; user must `/fast` to re-enable

### UI/UX Settings

- **`prefersReducedMotion`** (boolean) — reduce/disable UI animations for accessibility
- **`spinnerTipsEnabled`** (boolean) — show tips in spinner (default: `true`)
- **`spinnerTipsOverride`** (object) — `{ excludeDefault: boolean, tips: string[] }` — custom spinner tips
- **`spinnerVerbs`** (object) — `{ mode: "replace"|"append", verbs: string[] }` — custom spinner action verbs
- **`statusLine`** (object) — custom status line config: `{ type: "command", command: "..." }`
- **`showClearContextOnPlanAccept`** (boolean) — show "clear context" option on plan accept screen (default: `false`)
- **`feedbackSurveyRate`** (number) — probability 0-1 for session quality survey (set `0` to suppress)
- **`companyAnnouncements`** (string[]) — messages shown at startup (random if multiple)
- **`defaultShell`** (string) — shell for `!` commands: `"bash"` (default) or `"powershell"`

### Authentication Settings

- **`apiKeyHelper`** (string) — shell script producing auth value sent as `X-Api-Key` and `Authorization: Bearer`
- **`forceLoginMethod`** (string) — `"claudeai"` (Claude.ai) or `"console"` (API billing)
- **`forceLoginOrgUUID`** (string|string[]) — require login to specific org(s). Array = any listed org accepted.
- **`awsAuthRefresh`** (string) — script that refreshes `.aws` directory for Bedrock
- **`awsCredentialExport`** (string) — script outputting JSON with AWS credentials

### Attribution Settings

- **`attribution.commit`** (string) — git commit attribution text. Empty string = no attribution.
- **`attribution.pr`** (string) — PR description attribution. Empty string = no attribution.

Default commit attribution includes the `Co-Authored-By` trailer. `attribution` supersedes the deprecated
`includeCoAuthoredBy` setting.

### Plugin Settings

- **`enabledPlugins`** (object) — `"plugin-name@marketplace": true|false`
- **`extraKnownMarketplaces`** (object) — named marketplace definitions:
  `{ "name": { source: { source, repo|url|path } } }`

Marketplace source types: `github` (repo), `git` (url), `directory` (path), `npm` (package), `url` (url), `hostPattern`
(regex), `settings` (inline plugins).

### MCP Settings

- **`enableAllProjectMcpServers`** (boolean) — auto-approve all project `.mcp.json` servers
- **`enabledMcpjsonServers`** (string[]) — specific `.mcp.json` servers to approve
- **`disabledMcpjsonServers`** (string[]) — specific `.mcp.json` servers to reject
- **`allowedMcpServers`** (array) — (managed) allowlist of MCP servers users can configure
- **`deniedMcpServers`** (array) — (managed) denylist of blocked MCP servers
- **`allowManagedMcpServersOnly`** (boolean) — (managed) only managed `allowedMcpServers` apply

### Hook Configuration Settings

- **`disableAllHooks`** (boolean) — disable all hooks and custom status line
- **`allowManagedHooksOnly`** (boolean) — (managed) only managed hooks, SDK hooks, and force-enabled plugin hooks load
- **`allowedHttpHookUrls`** (string[]) — URL patterns HTTP hooks may target (supports `*` wildcard). Merged across
  scopes.
- **`httpHookAllowedEnvVars`** (string[]) — env var names HTTP hooks may interpolate into headers. Merged across scopes.
- **`disableSkillShellExecution`** (boolean) — disable `!` shell execution in skills/commands from user/project/plugin
  sources

### Worktree Settings

- **`worktree.symlinkDirectories`** (string[]) — directories to symlink from main repo into each worktree
- **`worktree.sparsePaths`** (string[]) — directories to check out via git sparse-checkout (cone mode)

Use `.worktreeinclude` in project root to copy gitignored files (like `.env`) into new worktrees.

### File Suggestion Settings

Custom `@` autocomplete via external command:

```json
{
  "fileSuggestion": {
    "type": "command",
    "command": "~/.claude/file-suggestion.sh"
  }
}
```

The command receives `{"query": "src/comp"}` on stdin, outputs newline-separated file paths (max 15) on stdout. Runs
with hook environment variables including `CLAUDE_PROJECT_DIR`.

### Other Settings

- **`otelHeadersHelper`** (string) — script generating dynamic OpenTelemetry headers
- **`disableDeepLinkRegistration`** (string) — `"disable"` to prevent `claude-cli://` protocol handler registration
- **`useAutoModeDuringPlan`** (boolean) — plan mode uses auto mode semantics when available (default: `true`). Not in
  shared project settings.

### Managed-Only Settings

These keys are only read from managed settings. Placing them in user/project settings has no effect.

- **`allowedChannelPlugins`** — allowlist of channel plugins that may push messages
- **`allowManagedHooksOnly`** — block all non-managed hooks
- **`allowManagedMcpServersOnly`** — only managed MCP allowlist applies
- **`allowManagedPermissionRulesOnly`** — block user/project permission rules
- **`blockedMarketplaces`** — blocklist of marketplace sources (checked before download)
- **`channelsEnabled`** — enable channels for Team/Enterprise
- **`forceRemoteSettingsRefresh`** — block startup until remote settings are fetched; exit on failure
- **`pluginTrustMessage`** — custom message appended to plugin trust warning
- **`sandbox.filesystem.allowManagedReadPathsOnly`** — only managed `allowRead` paths apply
- **`sandbox.network.allowManagedDomainsOnly`** — only managed domains and `WebFetch` rules apply
- **`strictKnownMarketplaces`** — allowlist of marketplaces users can add

`disableBypassPermissionsMode` and `disableAutoMode` work from any scope but are typically placed in managed settings.

## Permission System

### Rule Evaluation Order

Rules are evaluated: **deny > ask > allow**. First match wins. Deny at any scope cannot be overridden.

### Rule Syntax

Format: `Tool` or `Tool(specifier)`

- `Bash` — all Bash commands
- `Bash(*)` — all Bash commands (equivalent to `Bash`)
- `Bash(npm run build)` — exact command `npm run build`
- `Bash(npm run *)` — commands starting with `npm run `
- `Bash(* --version)` — commands ending with ` --version`
- `Bash(git * main)` — commands like `git checkout main`, `git merge main`
- `Read(./.env)` — reading `.env` in current directory
- `Edit(/src/**/*.ts)` — editing TS files under project `src/`
- `Read(~/.zshrc)` — reading home `.zshrc`
- `Read(//Users/alice/secrets/**)` — absolute path `/Users/alice/secrets/**`
- `WebFetch(domain:example.com)` — fetch requests to example.com
- `mcp__puppeteer` — all tools from puppeteer MCP server
- `mcp__puppeteer__puppeteer_navigate` — specific MCP tool
- `Agent(Explore)` — the Explore subagent
- `Agent(my-custom-agent)` — a custom subagent by name

### Bash Wildcard Behavior

- `Bash(ls *)` (space before `*`) — enforces word boundary: matches `ls -la` but NOT `lsof`
- `Bash(ls*)` (no space) — no boundary: matches both `ls -la` and `lsof`
- `Bash(ls:*)` — equivalent to `Bash(ls *)`
- Claude is aware of `&&` — `Bash(safe-cmd *)` will not allow `safe-cmd && other-cmd`
- "Yes, don't ask again" on compound commands saves separate rules per subcommand (up to 5)

### Read and Edit Pattern Types

Patterns follow gitignore specification:

- **`//path`** — absolute from filesystem root. E.g. `Read(//Users/alice/secrets/**)`
- **`~/path`** — relative to home directory. E.g. `Read(~/Documents/*.pdf)`
- **`/path`** — relative to **project root**. E.g. `Edit(/src/**/*.ts)`
- **`path` or `./path`** — relative to **current directory**. E.g. `Read(*.env)`

`*` matches files in a single directory; `**` matches recursively. `/Users/alice/file` is project-relative, NOT absolute
-- use `//Users/alice/file` for absolute paths.

Read and Edit deny rules apply to Claude's built-in file tools only, not to Bash subprocesses. A `Read(./.env)` deny
rule blocks the Read tool but not `cat .env` in Bash. Enable the sandbox for OS-level enforcement.

### Extending Permissions with Hooks

PreToolUse hooks run before permission prompts. Hook output can:

- **Deny** (exit code 2): blocks the tool call before permission rules are evaluated
- **Allow** (`"allow"` in output): skips the prompt but deny/ask rules still apply after
- **Force prompt** (exit code 0 with decision): overrides allow rules to force a prompt

Deny rules in managed settings take precedence over hook `"allow"` results. A blocking hook (exit 2) takes precedence
over allow rules.

## Permission Modes

- **`default`** — reads only. Use for: getting started, sensitive work.
- **`acceptEdits`** — reads, file edits, filesystem commands (`mkdir`, `mv`, etc.) in working dir. Use for: code
  iteration with post-hoc review.
- **`plan`** — reads only (Claude proposes but does not modify). Use for: exploration before changes.
- **`auto`** — everything, with background classifier safety checks. Use for: long tasks, reducing prompt fatigue.
- **`dontAsk`** — only pre-approved tools (explicit `allow` rules). Use for: locked-down CI and scripts.
- **`bypassPermissions`** — everything except protected paths. Use for: isolated containers/VMs only.

### Switching Modes

- **Mid-session**: `Shift+Tab` cycles `default` > `acceptEdits` > `plan`. Optional modes (`auto`, `bypassPermissions`)
  appear after opt-in flags.
- **At startup**: `claude --permission-mode <mode>`
- **Persistent default**: `permissions.defaultMode` in settings
- `dontAsk` is set only via `--permission-mode dontAsk` (never in cycle)

### acceptEdits Mode

Auto-approves file edits and filesystem Bash commands (`mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed`) in working
directory or `additionalDirectories`. Also auto-approves these when prefixed with safe env vars (`LANG=C`, `NO_COLOR=1`)
or wrappers (`timeout`, `nice`, `nohup`). Paths outside scope and all other Bash commands still prompt.

### Auto Mode

Requirements: Team/Enterprise/API plan, Claude Sonnet 4.6 or Opus 4.6, Anthropic API only, admin-enabled on
Team/Enterprise, v2.1.83+.

**Blocked by default**: `curl | bash`, sending data to external endpoints, production deploys, mass deletion, IAM
changes, force push, pushing to `main`.

**Allowed by default**: local file ops in working dir, installing declared dependencies, reading `.env` and sending
creds to matching API, read-only HTTP, pushing to current/Claude-created branch.

**Fallback**: 3 consecutive blocks or 20 total blocks pauses auto mode and resumes prompting. Any allowed action resets
the consecutive counter.

**Classifier**: runs on Sonnet 4.6 regardless of session model. Counts toward token usage. Reads user messages, tool
calls, CLAUDE.md — tool results are stripped (immune to prompt injection in file/web content).

On entering auto mode, broad allow rules are dropped: blanket `Bash(*)`, wildcarded interpreters, package-manager run
commands, `Agent` allow rules. Narrow rules like `Bash(npm test)` carry over.

### Auto Mode Configuration

Set in user settings, `.claude/settings.local.json`, or managed settings. NOT read from shared project settings.

```json
{
  "autoMode": {
    "environment": [
      "Source control: github.example.com/acme-corp",
      "Trusted cloud buckets: s3://acme-builds",
      "Trusted internal domains: *.corp.example.com"
    ],
    "allow": [
      "Deploying to staging namespace is allowed: isolated, resets nightly"
    ],
    "soft_deny": [
      "Never run database migrations outside the migrations CLI"
    ]
  }
}
```

- `environment` — prose descriptions of trusted infrastructure (repos, buckets, domains, services). Leaves default
  allow/soft_deny intact.
- `allow` — **replaces** the entire default allow list. Exceptions to soft_deny rules.
- `soft_deny` — **replaces** the entire default block list.

Precedence inside classifier: `soft_deny` blocks first, `allow` overrides as exceptions, explicit user intent overrides
both.

Run `claude auto-mode defaults` to get the full built-in lists before customizing. Run `claude auto-mode config` to see
effective rules. Run `claude auto-mode critique` for AI feedback on custom rules.

### dontAsk Mode

Auto-denies every tool not matching `permissions.allow`. Explicit `ask` rules are also denied (no prompting). Fully
non-interactive for CI.

### bypassPermissions Mode

Disables all permission prompts. Writes to protected paths still prompt. Must start with
`--permission-mode bypassPermissions` or `--dangerously-skip-permissions`. Admins block via
`permissions.disableBypassPermissionsMode: "disable"` in managed settings.

### Protected Paths

Writes to these paths are never auto-approved in any mode:

**Directories**: `.git`, `.vscode`, `.idea`, `.husky`, `.claude` (except `.claude/commands`, `.claude/agents`,
`.claude/skills`, `.claude/worktrees`)

**Files**: `.gitconfig`, `.gitmodules`, `.bashrc`, `.bash_profile`, `.zshrc`, `.zprofile`, `.profile`, `.ripgreprc`,
`.mcp.json`, `.claude.json`

### Permission Settings Keys

- **`permissions.allow`** (string[]) — rules to auto-approve tool use
- **`permissions.ask`** (string[]) — rules to prompt for confirmation
- **`permissions.deny`** (string[]) — rules to block tool use
- **`permissions.additionalDirectories`** (string[]) — additional working directories for file access
- **`permissions.defaultMode`** (string) — default permission mode
- **`permissions.disableBypassPermissionsMode`** (string) — `"disable"` to block bypass mode
- **`permissions.disableAutoMode`** (string) — `"disable"` to block auto mode
- **`permissions.skipDangerousModePermissionPrompt`** (boolean) — skip bypass mode confirmation prompt. Ignored in
  project settings.

## Sandbox Configuration

Sandbox provides OS-level filesystem and network isolation for Bash commands and their child processes. Complementary to
permissions (which control Claude's tools).

- macOS: Seatbelt (built-in)
- Linux/WSL2: bubblewrap + socat (install required)
- WSL1: not supported

Enable with `/sandbox` command or `sandbox.enabled: true` in settings.

### Sandbox Modes

- **Auto-allow** — sandboxed Bash commands run without permission. Non-sandboxable commands fall back to normal
  permission flow.
- **Regular** — all Bash commands go through standard permissions, even when sandboxed.

Both modes enforce the same filesystem/network restrictions. Difference is only auto-approval.

When `autoAllowBashIfSandboxed: true` (default), sandboxed Bash runs without prompting even if permissions include
`ask: Bash(*)`.

### Sandbox Settings Keys

- **`sandbox.enabled`** (boolean, default: `false`) — enable sandbox
- **`sandbox.failIfUnavailable`** (boolean, default: `false`) — exit on startup if sandbox cannot start
- **`sandbox.autoAllowBashIfSandboxed`** (boolean, default: `true`) — auto-approve sandboxed Bash commands
- **`sandbox.excludedCommands`** (string[], default: `[]`) — commands that run outside sandbox (e.g., `["docker *"]`)
- **`sandbox.allowUnsandboxedCommands`** (boolean, default: `true`) — allow `dangerouslyDisableSandbox` escape hatch.
  Set `false` for strict.
- **`sandbox.enableWeakerNestedSandbox`** (boolean, default: `false`) — weaker sandbox for unprivileged Docker
  (Linux/WSL2). **Reduces security.**
- **`sandbox.enableWeakerNetworkIsolation`** (boolean, default: `false`) — allow TLS trust service access (macOS).
  **Reduces security.**

### Filesystem Settings

- **`sandbox.filesystem.allowWrite`** (string[]) — additional writable paths (merged across scopes, merged with `Edit`
  allow rules)
- **`sandbox.filesystem.denyWrite`** (string[]) — blocked write paths (merged across scopes, merged with `Edit` deny
  rules)
- **`sandbox.filesystem.denyRead`** (string[]) — blocked read paths (merged across scopes, merged with `Read` deny
  rules)
- **`sandbox.filesystem.allowRead`** (string[]) — re-allow reads within `denyRead` regions (takes precedence over
  `denyRead`)
- **`sandbox.filesystem.allowManagedReadPathsOnly`** (boolean) — (managed) only managed `allowRead` entries apply

### Sandbox Path Prefixes

- **`/`** — absolute from filesystem root (`/tmp/build`)
- **`~/`** — relative to home (`~/.kube` becomes `$HOME/.kube`)
- **`./` or no prefix** — relative to project root (project settings) or `~/.claude` (user settings)

Note: sandbox paths use standard conventions (`/tmp/build` is absolute). This differs from Read/Edit permission rules
where `/path` is project-relative and `//path` is absolute.

### Network Settings

- **`sandbox.network.allowedDomains`** (string[], default: `[]`) — allowed outbound domains (supports `*.example.com`
  wildcards)
- **`sandbox.network.allowManagedDomainsOnly`** (boolean, default: `false`) — (managed) only managed domains apply
- **`sandbox.network.allowUnixSockets`** (string[], default: `[]`) — accessible Unix socket paths
- **`sandbox.network.allowAllUnixSockets`** (boolean, default: `false`) — allow all Unix socket connections
- **`sandbox.network.allowLocalBinding`** (boolean, default: `false`) — allow binding to localhost ports (macOS only)
- **`sandbox.network.allowMachLookup`** (string[], default: `[]`) — additional XPC/Mach service names (macOS). Supports
  trailing `*`.
- **`sandbox.network.httpProxyPort`** (number) — custom HTTP proxy port
- **`sandbox.network.socksProxyPort`** (number) — custom SOCKS5 proxy port

### Full Sandbox Example

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker *"],
    "filesystem": {
      "allowWrite": ["/tmp/build", "~/.kube"],
      "denyRead": ["~/.aws/credentials"]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org", "registry.yarnpkg.com"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

### Permissions + Sandbox Interaction

- **Permissions** control which tools Claude can use (all tools: Bash, Read, Edit, WebFetch, MCP)
- **Sandbox** provides OS-level enforcement for Bash commands and child processes only
- Filesystem restrictions merge from both `sandbox.filesystem.*` settings and `Read`/`Edit` permission rules
- Network restrictions merge from `sandbox.network.allowedDomains` and `WebFetch` permission rules
- Use both for defense-in-depth: permissions block at the Claude decision layer, sandbox blocks at the OS layer

### Security Limitations

- Network filtering restricts domains only; it does not inspect traffic content
- Broad domains like `github.com` may allow data exfiltration
- Domain fronting can bypass network filtering
- `allowUnixSockets` to Docker socket grants host system access
- Overly broad `allowWrite` to `$PATH` dirs or shell config files enables privilege escalation
- `enableWeakerNestedSandbox` considerably weakens isolation (use only with additional isolation)

## Verify Configuration

- `/status` — shows active settings sources and their origins
- `/permissions` — lists all permission rules and their source files
- `/sandbox` — configure sandbox modes
- `/config` — open settings UI
- `claude auto-mode defaults` — print built-in auto mode rules
- `claude auto-mode config` — print effective auto mode config
- `claude auto-mode critique` — AI review of custom auto mode rules
