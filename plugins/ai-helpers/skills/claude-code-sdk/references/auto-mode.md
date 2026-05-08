# Auto Mode

Permission mode where a separate background classifier model reviews each tool call before execution. Blocks scope
escalation, untrusted infrastructure, and prompt-injection-driven actions; runs everything else without prompts.
Research preview, requires Claude Code v2.1.83 or later.

## Status and availability

| Field         | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| Stage         | Research preview                                                                              |
| Min version   | v2.1.83                                                                                       |
| Plans         | Max, Team, Enterprise, API. **Not on Pro.**                                                   |
| Models        | Sonnet 4.6, Opus 4.6, Opus 4.7 (Team/Enterprise/API). Max plan: Opus 4.7 only.                |
| Provider      | Anthropic API only. **Not on Bedrock, Vertex, or Foundry.**                                   |
| Admin gate    | Team/Enterprise admins must enable in Claude Code admin settings before users can turn it on. |
| Lock-off      | Admins set `permissions.disableAutoMode: "disable"` in managed settings to block it entirely. |
| Eligible flag | If reported unavailable, one of the requirements above is unmet — not a transient outage.     |

`--enable-auto-mode` was removed in v2.1.111. Start a session with `--permission-mode auto` instead.

## How the classifier works

A separate model (Sonnet 4.6, server-configured, independent of `/model` selection) reviews each pending tool call
before execution. Each check sends a portion of the transcript plus the pending action, adding a round-trip of latency.
Calls count toward token usage.

**Decision order** — first match wins:

1. Explicit allow/deny rules in `permissions.allow`/`permissions.deny`.
2. Read-only actions and file edits in the working directory (skip the classifier, except writes to protected paths).
3. Everything else routes to the classifier.
4. If the classifier blocks, Claude receives the reason and tries an alternative approach.

**On entering auto mode**, broad allow rules that grant arbitrary code execution are dropped:

- `Bash(*)` or `PowerShell(*)`
- Wildcarded interpreters like `Bash(python*)`
- Package-manager run commands
- `Agent` allow rules

Narrow rules like `Bash(npm test)` carry over. Dropped rules are restored when leaving auto mode.

## Prompt-injection resistance

The classifier sees:

- User messages
- Tool calls (the action being evaluated)
- `CLAUDE.md` content

The classifier **never sees tool results** (file contents, web page text, MCP results). Hostile instructions embedded in
fetched content cannot manipulate its approval decisions, even if they influence the primary model.

A separate server-side probe scans incoming tool results for suspicious content before Claude reads them. Hostile
content is therefore intercepted twice: at ingest by the probe, and at action time by the classifier that never read it.

## What the classifier blocks by default

The classifier trusts the working directory and the current repo's configured remotes. Everything else is treated as
external until configured via `autoMode.environment`.

**Scope-escalation blocks:**

- Production deploys and migrations
- Mass deletion on cloud storage
- Granting IAM or repo permissions
- Modifying shared infrastructure
- Irreversibly destroying files that existed before the session
- Force push, or pushing directly to `main`

**Untrusted-infrastructure blocks:**

- Sending sensitive data to external endpoints
- Targets not in `autoMode.environment`

**Hostile-content blocks:**

- Downloading and executing code (`curl | bash`)
- Actions that appear driven by hostile content read from a file or web page

**User-stated boundaries:**

The classifier treats boundaries you state in conversation as block signals. "Don't push" or "wait until I review before
deploying" blocks matching actions even when default rules would allow them. Boundaries persist until lifted in a later
message; Claude's own judgment that a condition was met does not lift them. Boundaries are not stored as rules — the
classifier re-reads the transcript each check, so context compaction can drop them. For a hard guarantee, add a
`permissions.deny` rule.

## Failure modes

### Scope escalation block

Action exceeds the request's stated intent (deploys, IAM changes, force push). Resolution: narrow the request, add a
trusted-infrastructure entry to `autoMode.environment`, or hit `r` in `/permissions` → Recently denied to retry.

### Untrusted-infrastructure block

Destination not in `autoMode.environment`. Resolution: add the repo, bucket, or domain to `autoMode.environment` in
managed or user settings, then re-run `claude auto-mode config` to confirm.

### Hostile-content block

Action looks driven by injected instructions. Resolution: review the source content; if benign, restate the request
explicitly so the classifier reads it as user intent rather than tool-result-driven.

### Classifier outage ("cannot determine the safety")

Error: `<model> is temporarily unavailable, so auto mode cannot determine the safety of...`. The classifier model is
overloaded. Reads, searches, and edits inside the working directory continue working since they skip the classifier.

- Retry after a few seconds; Claude usually retries on its own
- If retries persist, continue with read-only tasks
- This is transient and unrelated to eligibility — no settings change needed

In v2.1.126+, the spinner turns red when a permission check stalls (instead of looking like the tool is running).
v2.1.128+ error message includes a hint: retry, `/compact`, or run with `--debug`.

### Circuit breaker fallback

Auto mode pauses and resumes manual prompting if the classifier blocks:

- **3 consecutive blocks**, or
- **20 total blocks** in a session.

Approving the prompted action resumes auto mode. Any allowed action resets the consecutive counter; the total counter
resets only when its own limit triggers a fallback. Thresholds are not configurable.

In non-interactive mode (`-p`), repeated blocks **abort the session** since no user is present to provide fallback
approval.

### Reviewing denials

Each denial appears in `/permissions` under the **Recently denied** tab. Press `r` on a denied action to mark it for
retry: when you exit the dialog, Claude Code sends a message telling the model it may retry that tool call. Repeated
denials for the same destination usually mean the classifier is missing context — add the destination to
`autoMode.environment`. To react programmatically, use the `PermissionDenied` hook (returns `{retry: true}` to tell the
model it may retry).

## Configuration

Set in user settings, `.claude/settings.local.json`, or managed settings. **Not** read from shared project settings.

```json
{
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: github.example.com/acme-corp",
      "Trusted cloud buckets: s3://acme-builds",
      "Trusted internal domains: *.corp.example.com"
    ],
    "allow": ["$defaults", "Deploying to staging namespace is allowed: isolated, resets nightly"],
    "soft_deny": ["$defaults", "Never run database migrations outside the migrations CLI"]
  }
}
```

Entries are **prose, not regex or tool patterns**. The classifier reads them as natural-language rules. Write them the
way you would describe your infrastructure to a new engineer.

### `environment`

Trusted infrastructure. The classifier uses it to decide what "external" means; any destination not listed is a
potential exfiltration target. Defaults trust the working repo and its configured remotes. A thorough section covers:

- **Organization** — company name, primary use (software dev, infrastructure automation, data engineering)
- **Source control** — every GitHub/GitLab/Bitbucket org developers push to
- **Cloud providers and trusted buckets** — bucket names or prefixes
- **Trusted internal domains** — `*.internal.example.com`
- **Key internal services** — CI, artifact registries, internal package indexes, incident tooling
- **Additional context** — regulated-industry constraints, multi-tenancy, compliance requirements

### `soft_deny`

Replaces the built-in block list (unless you include `"$defaults"`). For high-risk actions specific to your environment
that the defaults miss.

### `allow`

Replaces the built-in allow list (unless you include `"$defaults"`). Exceptions to `soft_deny` rules.

### `$defaults` sentinel (v2.1.118+)

Including the literal string `"$defaults"` in any of the three arrays splices the built-in list in at that position, so
custom rules can go before or after them and inherit updates as the built-in list changes across releases.

### Precedence inside the classifier

1. `soft_deny` rules block first
2. `allow` rules override matching blocks as exceptions
3. **Explicit user intent** overrides both: if the user's message directly and specifically describes the exact action
   ("force-push this branch"), the classifier allows it even when `soft_deny` matches. General requests ("clean up the
   repo") do **not** count as explicit intent.

There is no `autoMode.deny` field. To hard-block an action regardless of intent, use `permissions.deny` in managed
settings — it runs before the classifier and cannot be overridden.

## CLI subcommands

| Command                     | Purpose                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `claude auto-mode defaults` | Print the built-in `environment`/`allow`/`soft_deny` rules as JSON                  |
| `claude auto-mode config`   | Print the effective config with your settings applied and `$defaults` expanded      |
| `claude auto-mode critique` | AI feedback on custom rules, flagging ambiguous, redundant, or false-positive-prone |

Run `auto-mode config` after saving settings to confirm the effective rules are what you expect. To remove or rewrite a
built-in rule, save `auto-mode defaults` to a file, edit the lists, and paste the result in place of `"$defaults"`.

## Enterprise lockdown via managed settings

Auto mode runs after the permissions system. To enforce hard limits no user-level rule can lift, place these in managed
settings:

| Setting                                        | Effect                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `permissions.disableAutoMode: "disable"`       | Removes auto from `Shift+Tab` cycle; rejects `--permission-mode auto` at startup                 |
| `permissions.deny`                             | Hard-blocks an action regardless of intent or classifier configuration                           |
| `sandbox.network.allowManagedDomainsOnly`      | Only managed `allowedDomains` and `WebFetch` allow rules apply; user/project domains ignored     |
| `sandbox.filesystem.allowManagedReadPathsOnly` | Only managed `allowRead` paths apply; user/project `allowRead` entries ignored                   |
| `allowManagedHooksOnly`                        | Only managed hooks, SDK hooks, and force-enabled plugin hooks load                               |
| `autoMode.*` in managed settings               | Server-managed `environment`/`allow`/`soft_deny` lists are picked up by the classifier centrally |

`denyWrite`/`denyRead`/`deniedDomains` always merge from all sources regardless of the `allowManaged*Only` flags.

## Cost characteristics

- Classifier runs on a server-configured model (Sonnet 4.6) independent of `/model` selection
- Classifier calls **count toward token usage**
- Each check adds a round-trip before execution
- Reads and working-directory edits skip the classifier — overhead is concentrated in shell commands and network ops

## See also

- [`permissions.md`](./settings.md#permission-system) — rule syntax, modes, protected paths
- [`settings.md`](./settings.md#sandbox-configuration) — sandbox network/filesystem keys for hard enforcement
- Configure auto mode docs: `claude auto-mode defaults | config | critique`
