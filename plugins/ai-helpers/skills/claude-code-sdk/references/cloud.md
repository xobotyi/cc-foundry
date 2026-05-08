# Cloud Surfaces

Reference for every Claude Code surface that runs outside the local terminal: cloud sandbox sessions, scheduled cloud
agents, mobile/web bridges to local sessions, and CLI features that depend on Anthropic-managed infrastructure.

## Surface comparison

| Surface                 | Where it runs                | Min version | Plans                   | Provider restriction       |
| ----------------------- | ---------------------------- | ----------- | ----------------------- | -------------------------- |
| Routines                | Anthropic cloud VM           | v2.1.105    | Pro, Max, Team, Ent     | Anthropic API only         |
| Ultraplan               | Anthropic cloud VM           | v2.1.91     | Pro, Max, Team, Ent     | Not Bedrock/Vertex/Foundry |
| Ultrareview             | Anthropic cloud sandbox      | v2.1.86     | All (paid after 3 free) | Not Bedrock/Vertex/Foundry |
| Remote Control          | Local machine, viewed remote | v2.1.51     | Pro, Max, Team, Ent     | Claude.ai OAuth required   |
| Claude Code on the Web  | Anthropic cloud VM           | v2.0.24     | Pro, Max, Team, Ent     | Not Bedrock/Vertex/Foundry |
| Code Review (`/review`) | Local session                | —           | All                     | Any                        |
| Computer Use (CLI)      | Local macOS                  | v2.1.85     | Pro, Max only           | Claude.ai auth             |

Cloud-VM surfaces are blocked for organizations with Zero Data Retention enabled.

---

## Routines

Templated cloud agents that run on a schedule, via API, or in response to GitHub events. Execute on Anthropic-managed
cloud infrastructure — keep working when the laptop is closed. Research preview.

### Setup and management

- **Web UI** — `claude.ai/code/routines` (full editor; required for API/GitHub triggers)
- **CLI** — `/schedule [description]` (alias `/routines`); creates **scheduled triggers only**
- **Subcommands** — `/schedule list`, `/schedule update`, `/schedule run`

A routine is a saved configuration: prompt, repos, connectors, triggers. Each run creates a new session.

### Trigger types

| Trigger   | Setup                                | Notes                                                                          |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Scheduled | CLI or web                           | Recurring (hourly/nightly/weekly) or one-shot future timestamp                 |
| API       | Web only                             | Per-routine `/fire` endpoint with bearer token; token shown once on creation   |
| GitHub    | Web only; requires Claude GitHub App | PR opened, release published, etc.; webhook events subject to per-account caps |

A single routine can combine triggers. `/web-setup` grants repository access for cloning but does **not** install the
GitHub App or enable webhook delivery.

### Branch policy

By default, routines can only push to branches prefixed `claude/`. Toggle **Allow unrestricted branch pushes** per
repository when creating or editing the routine.

### Limits and failure modes

- **Daily run cap** — per-account limit on routine runs. One-off scheduled runs are exempt; they consume normal
  subscription usage like any other session.
- **Webhook caps** — GitHub events exceeding per-routine and per-account hourly caps are dropped during research
  preview. View limits at `claude.ai/code/routines`.
- **Extra usage** — when a routine hits the cap, organizations with extra usage enabled keep running on metered overage.
  Without it, additional runs are rejected.
- **API token loss** — tokens shown once, never retrievable. Store in a secret manager.
- **Environment scope** — each routine runs in a configured cloud environment (network access, env vars, setup scripts).
  Configure these before creating the routine.

---

## Ultraplan

Hands a planning task from the local CLI to a Claude Code on the web session running in plan mode. Claude drafts the
plan in the cloud while the terminal stays free; review and revise in the browser, then execute remotely or back in the
CLI. Research preview, v2.1.91+.

### Launch paths

| Path             | How                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Command          | `/ultraplan <prompt>` (opens confirmation dialog before launching)                             |
| Keyword          | Include the word `ultraplan` anywhere in a prompt (opens confirmation dialog)                  |
| Local plan pivot | After a local plan, choose **No, refine with Ultraplan on Claude Code on the web** (no dialog) |

### Status indicators

| Status                         | Meaning                                               |
| ------------------------------ | ----------------------------------------------------- |
| `◇ ultraplan`                  | Researching codebase and drafting the plan            |
| `◇ ultraplan needs your input` | Clarifying question; open the session link to respond |
| `◆ ultraplan ready`            | Plan ready to review in the browser                   |

`/tasks` shows the ultraplan entry; selecting it opens session link, agent activity, and a **Stop ultraplan** action.
Stopping archives the cloud session and clears the indicator — nothing is saved to the terminal.

### Requirements and conflicts

- Requires Claude Code on the web account and a GitHub repository
- Auto-creates a default cloud environment on first run (v2.1.101+)
- **Disconnects active Remote Control sessions** — both occupy the `claude.ai/code` interface; only one can be connected
  at a time
- Not available on Amazon Bedrock, Google Vertex AI, or Microsoft Foundry

---

## Ultrareview

Deep multi-agent code review on Claude Code on the web infrastructure. A fleet of reviewer agents in a remote sandbox
finds and independently verifies bugs in a branch or PR. Research preview, v2.1.86+.

### Invocation

| Form                 | Behavior                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| `/ultrareview`       | Reviews diff between current branch and default branch (incl. uncommitted/staged) |
| `/ultrareview <PR#>` | Reviews a GitHub PR; clones from GitHub, not local working tree                   |
| `claude ultrareview` | Non-interactive subcommand for CI/scripts; same review, blocks until done         |

The command runs **only when invoked** — Claude does not start an ultrareview on its own.

#### `claude ultrareview` flags

| Flag                  | Description                           |
| --------------------- | ------------------------------------- |
| `--json`              | Print raw findings as JSON to stdout  |
| `--timeout <minutes>` | Maximum minutes to wait (default: 30) |

Exit codes: `0` on completion (with or without findings), `1` on failure to launch / remote error / timeout, `130` on
Ctrl-C. Stopping the subcommand does **not** stop the remote review — follow the session URL printed to stderr.

### Pricing

| Plan              | Free runs                       | After free runs                 |
| ----------------- | ------------------------------- | ------------------------------- |
| Pro               | 3, expire 2026-05-05 (one-time) | Extra usage, ~$5–$20 per review |
| Max               | 3, expire 2026-05-05 (one-time) | Extra usage, ~$5–$20 per review |
| Team / Enterprise | None                            | Extra usage, ~$5–$20 per review |

Extra usage must be enabled to launch a paid review. Run `/extra-usage` to check or change. A run counts once the remote
session starts — reviews stopped early or that fail still consume a free run.

### Failure modes

- **Repo too large to bundle** — Claude prompts to use PR mode. Push the branch, open a draft PR, run
  `/ultrareview <PR#>`.
- **API-key-only auth** — not supported. Run `/login` and authenticate with Claude.ai first.
- **Bedrock/Vertex/Foundry** — not supported.
- **Zero Data Retention organizations** — not supported.
- **Stopped review** — archives cloud session; **partial findings are not returned**.
- **PR mode requirement** — needs a `github.com` remote on the repository.

Reviews typically run 5–10 minutes as background tasks. `/tasks` shows running and completed reviews. Findings appear as
a notification when complete; each includes file location and explanation.

### Compared to `/review`

| Dimension | `/review`                  | `/ultrareview`                                    |
| --------- | -------------------------- | ------------------------------------------------- |
| Runs      | Locally in session         | Remote cloud sandbox                              |
| Depth     | Single-pass                | Multi-agent fleet with independent verification   |
| Duration  | Seconds to a few minutes   | ~5–10 minutes                                     |
| Cost      | Counts toward normal usage | Free runs, then ~$5–$20 per review as extra usage |
| Best for  | Quick iteration feedback   | Pre-merge confidence on substantial changes       |

For automatic GitHub PR reviews without a CLI step, see Code Review integration.

---

## Remote Control

Continues a local Claude Code session from `claude.ai/code` or the Claude mobile app. Code stays on the local machine —
only the UI is remote. Research preview, v2.1.51+.

### Invocation

| Form                                          | Behavior                                                              |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `claude remote-control [name]`                | **Server mode**: process waits for remote connections, no local input |
| `claude --remote-control [name]` / `--rc`     | Interactive session with local input + remote bridge                  |
| `/remote-control [name]` / `/rc` (in-session) | Bridges current session; carries over conversation history            |
| `/remote-control` in VS Code (v2.1.79+)       | Ext command; banner shows status; no name argument or QR code         |

Server mode supports multiple concurrent sessions from a single process. Other modes: one remote session per interactive
process. CLI shows a session URL and QR code; spacebar in server mode shows the QR code.

### Compared to Claude Code on the web

| Dimension       | Remote Control               | Claude Code on the Web         |
| --------------- | ---------------------------- | ------------------------------ |
| Where code runs | Local machine                | Anthropic cloud VM             |
| Filesystem      | Local                        | Cloned from GitHub (or bundle) |
| MCP servers     | Local config available       | Only repo-declared servers     |
| Process         | Local CLI must keep running  | Independent of local CLI       |
| Network outage  | Reconnects when machine back | Continues running              |

### Plan, gates, and managed lockdown

- **Plans** — Pro, Max, Team, Enterprise. Off by default on Team/Enterprise; admin enables at
  `claude.ai/admin-settings/claude-code` (Remote Control toggle).
- **Auth** — Claude.ai OAuth required. API keys, Console accounts, and inference-only tokens (`claude setup-token` /
  `CLAUDE_CODE_OAUTH_TOKEN`) are not supported.
- **Workspace trust** — accept the dialog by running `claude` in the project directory once.
- **Managed lockdown** — `disableRemoteControl` in managed settings disables it on the device independent of the
  org-wide toggle.

### Error distinctions

| Error message                                              | Cause and fix                                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Remote Control requires a claude.ai subscription"         | Not authenticated with claude.ai. Run `claude auth login`; unset `ANTHROPIC_API_KEY`.                      |
| "Remote Control requires a full-scope login token"         | Inference-only token from `claude setup-token`/`CLAUDE_CODE_OAUTH_TOKEN`. Run `claude auth login`.         |
| "Remote Control is disabled by your organization's policy" | API-key/Console auth, admin toggle off, retention/compliance lock, or device-level `disableRemoteControl`. |
| "needs auth" (vs "failed")                                 | Token expired (re-auth) vs configuration/network failure (different remediation).                          |

`/status` distinguishes login method and subscription. v2.1.110+ shows a specific reason rather than a generic "not yet
enabled" message.

### Limitations and connection lifecycle

- **Local-only commands** — `/mcp`, `/plugin`, `/resume` (interactive pickers); local CLI only.
- **Remote-capable commands** — `/compact`, `/clear`, `/context`, `/usage`, `/exit`, `/extra-usage`, `/recap`,
  `/reload-plugins` work from mobile/web.
- **Local process must keep running** — closing terminal/quitting VS Code/stopping `claude` ends the session.
- **~10 min outage** — extended network outage on a still-awake machine times out the session; restart with
  `claude remote-control`.
- **Ultraplan conflict** — starting an ultraplan disconnects an active Remote Control session.
- **Session-flag caveats** — `--verbose`, `--sandbox`, `--no-sandbox` not available with `/remote-control` mid-session.

### `--teleport` (different feature)

`--teleport` (or `/teleport` / `/tp` in-session) **resumes a web session in the local terminal** — it does **not**
create a Remote Control session. It pulls cloud sessions back, not the other way around. Available since v2.0.24.

| Form                          | Behavior                                    |
| ----------------------------- | ------------------------------------------- |
| `claude --teleport`           | Interactive session picker                  |
| `claude --teleport <session>` | Resume a specific session directly          |
| `/teleport` / `/tp`           | Open picker without restarting the CLI      |
| `/tasks` → `t`                | Teleport into a selected background session |
| Web "Open in CLI" button      | Copy command to paste in terminal           |

If uncommitted changes exist, the user is prompted to stash first.

---

## Claude Code on the Web

Cloud sandbox at `claude.ai/code`. Each session runs in a fresh Anthropic-managed VM with the repository cloned from
GitHub. Pro/Max/Team users; Enterprise users with premium seats or Chat + Claude Code seats.

### Launch paths

| Form                       | Behavior                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| `claude --remote "<task>"` | Create a new cloud session; clones current GitHub remote at current branch     |
| `claude.ai/code` web UI    | Browser-driven session creation, session list, redesigned sidebar (W17)        |
| `--teleport` flow          | Pull a cloud session back into the local terminal (see Remote Control section) |

`--remote` and `--remote-control` are unrelated:

- `--remote` — creates a **cloud** session
- `--remote-control` — exposes a **local** session for monitoring from the web

### Cloud-environment availability

| Available                        | Not available                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Repo files (committed)           | User-level CLAUDE.md / settings / plugins                                       |
| Repo's `.claude/` config         | MCP servers added with `claude mcp add` (writes to local user config, not repo) |
| Plugins declared in repo         | Static API tokens, credentials (no dedicated secrets store yet)                 |
| `claude mcp add --scope project` | Interactive auth (AWS SSO, OAuth flows requiring browser callback)              |

Push local commits before `--remote`; the VM clones from GitHub, not the local machine.

### Local-bundle fallback

When `claude --remote` runs from a repo with no GitHub remote, Claude Code bundles the local repository (full history
across branches + uncommitted changes to tracked files) and uploads it. Force this even with GitHub connected via
`CCR_FORCE_BUNDLE=1`. Local-bundle sessions cannot push results back to a GitLab/Bitbucket remote.

### Failure modes and limits

- **Organization IP allowlist** — cloud calls come from Anthropic infrastructure, not your network. IP allowlists block
  every cloud session with an authentication error. Same applies to Code Review integration and Routines. Anthropic
  support can exempt Anthropic-hosted services.
- **Self-hosted GitHub Enterprise Server** — supported on Team and Enterprise plans.
- **Environment expired** — sessions stop after inactivity; environment is reclaimed. Local resume shows
  `Could not resume session ... its environment has expired`. Reopen from `claude.ai/code` to provision a fresh env with
  conversation history restored.
- **Rate limits** — shared with all other Claude/Claude Code usage; parallel tasks consume rate proportionately. No
  separate compute charge for the cloud VM.
- **Repository auth for teleport** — same account on both ends.

---

## Code Review

Local PR review with full-codebase context. The built-in `/review [PR]` command performs single-pass analysis in the
current session; can fetch comments via the `gh` CLI.

For deep, multi-agent verified analysis, use [Ultrareview](#ultrareview). For automatic reviews on GitHub PRs without a
CLI step, install Code Review GitHub integration — it posts inline findings as PR comments. Code Review integration is
subject to the same Organization IP allowlist constraints as routines and cloud sessions.

| Surface              | Trigger                        | Latency     | Output                           |
| -------------------- | ------------------------------ | ----------- | -------------------------------- |
| `/review` (local)    | Manual in session              | Seconds–min | In-conversation findings         |
| Code Review (GitHub) | Automatic on PR events         | Async       | Inline PR comments               |
| `/ultrareview`       | Manual or `claude ultrareview` | 5–10 min    | Notification + verified findings |

---

## Computer Use in CLI

Lets Claude open native macOS apps, click, type, and see the screen. macOS-only research preview shipped W14 (Mar 30 –
Apr 3, 2026), v2.1.85+. Built-in MCP server `computer-use`, off by default.

### Enablement

1. In an interactive session, run `/mcp`, find `computer-use` (shows as disabled), select **Enable**.
2. Persists per project — enable once per project.
3. First tool use prompts for two macOS permissions:
   - **Accessibility** (click, type, scroll)
   - **Screen Recording** (see what's on screen)
4. macOS may require a Claude Code restart after granting Screen Recording.

### Plan and provider gates

- Pro and Max only. **Not available on Team or Enterprise.**
- Requires Claude.ai authentication. Not available on Bedrock, Vertex, or Foundry — third-party-provider users need a
  separate Claude.ai account.
- Interactive session only — not available in `-p` non-interactive mode.

### Per-app approval

Approving the MCP server doesn't grant Claude access to every app. The first time Claude needs a specific app in a
session, a prompt shows:

- Which app(s) Claude wants to control
- Extra permissions requested (e.g., clipboard access)
- How many other apps will be hidden while Claude works

Approvals last for the current session. Apps with broad reach show extra warnings:

| Warning                      | Applies to                                           |
| ---------------------------- | ---------------------------------------------------- |
| "Equivalent to shell access" | Terminal, iTerm, VS Code, Warp, other terminals/IDEs |
| "Can read or write any file" | Finder                                               |
| "Can change system settings" | System Settings                                      |

### Per-app control level

| Tier         | Apps                        |
| ------------ | --------------------------- |
| View-only    | Browsers, trading platforms |
| Click-only   | Terminals, IDEs             |
| Full control | Everything else             |

### Failure modes

- **Machine-wide lock** — only one Claude Code session uses the computer at a time. New attempts fail with a message
  identifying the session that holds the lock. Finish or exit that session first.
- **`computer-use` not in `/mcp`** — verify macOS, v2.1.85+, Pro/Max plan, Claude.ai auth, interactive session.
- **`switch_display`** — was returning "not available in this session" on multi-monitor setups; fixed in v2.1.85.

---

## See also

- [`auto-mode.md`](./auto-mode.md) — auto mode classifier and `autoMode` configuration
- [`settings.md`](./settings.md) — managed settings, sandbox, server-managed settings
- [`channels.md`](./channels.md) — push events into a session as an alternative to polling
