# Configuration

Detailed conventions for configuration hierarchy, environment variables,
config files, and XDG directories. Extends the behavioral rules in SKILL.md
with full patterns and edge cases.

## Configuration Hierarchy

Configuration parameters are resolved in order of precedence (highest first):

1. **Command-line flags** -- most specific, per-invocation
2. **Environment variables** -- per-session or per-shell
3. **Project-level config** -- `.env`, project config files (version-controlled)
4. **User-level config** -- `~/.config/myapp/` (XDG)
5. **System-wide config** -- `/etc/myapp/`
6. **Built-in defaults** -- hardcoded in the program

Higher levels override lower levels. A flag always wins over an env var,
which always wins over a config file.

## Choosing the Right Mechanism

| Configuration Type | Mechanism | Example |
|---|---|---|
| Varies per invocation | Flags | `--verbose`, `--dry-run`, `--format json` |
| Stable per session, varies per machine | Env vars + flags | `HTTP_PROXY`, `NO_COLOR`, `EDITOR` |
| Stable per project, shared in VCS | Config file | `myapp.toml`, `Makefile`, `package.json` |
| Stable per user, across projects | User config (XDG) | `~/.config/myapp/config.toml` |
| Stable system-wide | System config | `/etc/myapp/config.toml` |

## XDG Base Directory Specification

Follow the [XDG Base Directory Spec][xdg] for user-level files:

| Variable | Default | Purpose |
|----------|---------|---------|
| `XDG_CONFIG_HOME` | `~/.config` | User configuration |
| `XDG_DATA_HOME` | `~/.local/share` | User data |
| `XDG_STATE_HOME` | `~/.local/state` | User state (logs, history) |
| `XDG_CACHE_HOME` | `~/.cache` | Non-essential cached data |
| `XDG_RUNTIME_DIR` | (system-set) | Runtime files (sockets, PIDs) |

[xdg]: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html

Place files in `$XDG_CONFIG_HOME/myapp/`, not `~/.myapp`. This reduces
home directory clutter and follows the convention used by yarn, fish,
neovim, tmux, and many modern tools.

## Environment Variables

### Naming

- Use `UPPERCASE_WITH_UNDERSCORES`.
- Prefix with your app name: `MYAPP_DEBUG`, `MYAPP_CONFIG`.
- Don't collide with [POSIX standard variables][posix-env].

[posix-env]: https://pubs.opengroup.org/onlinepubs/009695399/basedefs/xbd_chap08.html

### Well-Known Variables to Respect

| Variable | Purpose |
|----------|---------|
| `NO_COLOR` | Disable color output |
| `FORCE_COLOR` | Force color output |
| `DEBUG` | Enable verbose/debug output |
| `EDITOR` | User's preferred text editor |
| `PAGER` | User's preferred pager (`less`, `more`) |
| `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` | Network proxies |
| `SHELL` | User's preferred interactive shell |
| `TERM`, `TERMINFO`, `TERMCAP` | Terminal capabilities |
| `TMPDIR` | Temporary file directory |
| `HOME` | User's home directory |
| `LINES`, `COLUMNS` | Terminal dimensions |

### .env Files

Read `.env` files for project-level environment overrides:
- Use existing libraries (dotenv for Node, godotenv for Go, etc.)
- Don't treat `.env` as a substitute for proper config files -- it has
  one data type (string), no structure, and often contains secrets that
  shouldn't be in version control.

### Secrets in Environment Variables

Do NOT read secrets from environment variables. They leak through:
- `ps` output and `/proc/*/environ`
- Docker inspect
- systemd `systemctl show`
- Shell history via command substitution
- Log aggregation

Accept secrets via:
- Credential files (`--password-file`)
- stdin pipes
- Secret management services (Vault, AWS Secrets Manager)
- OS keyring integration

## Config File Formats

### Common Formats

| Format | Strengths | Use When |
|--------|-----------|----------|
| TOML | Human-readable, typed, hierarchical | General app config |
| YAML | Familiar to DevOps, supports comments | K8s/cloud ecosystem |
| JSON | Universal, no ambiguity | API config, when comments unnecessary |
| INI | Simple, flat | Legacy, very simple config |

### Config File Design

1. Document every config option with comments in the default config file.
2. Support generating a default config: `myapp config init`.
3. Validate config on load, report all errors at once (not one at a time).
4. Show the resolved config: `myapp config show` (with merged values from
   all sources).
5. When modifying system config files that aren't yours, use dated comments
   to mark your additions.

## Config Precedence Transparency

When debugging config issues, provide a way to see which source provided
each value:

```
$ myapp config show --resolved
port = 8080  (from: --port flag)
debug = true (from: MYAPP_DEBUG env)
theme = dark (from: ~/.config/myapp/config.toml)
timeout = 30 (from: default)
```
