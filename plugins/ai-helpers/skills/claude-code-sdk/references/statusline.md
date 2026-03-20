# Status Line

A customizable bar at the bottom of Claude Code that runs a shell script, receives JSON session data on stdin, and
displays whatever the script prints.

## Configuration

Add `statusLine` to settings (`~/.claude/settings.json` or project settings):

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

- `type` -- must be `"command"`
- `command` -- script path or inline shell command
- `padding` -- extra horizontal spacing in characters (default: 0)

Inline command example using jq:

```json
{
  "statusLine": {
    "type": "command",
    "command": "jq -r '\"[\\(.model.display_name)] \\(.context_window.used_percentage // 0)% context\"'"
  }
}
```

### `/statusline` Command

Accepts natural language descriptions. Generates a script and updates settings automatically:

```text
/statusline show model name and context percentage with a progress bar
```

### Disable

Run `/statusline` and ask to remove, or delete the `statusLine` field from settings. Also disabled when
`disableAllHooks` is `true`.

## How It Works

- Script runs after each assistant message, permission mode change, or vim mode toggle
- Updates debounced at 300ms
- In-flight executions cancelled if new update triggers
- Runs locally, does not consume API tokens
- Temporarily hides during autocomplete, help menu, permission prompts

### Output Capabilities

- **Multiple lines** -- each `echo`/`print` produces a separate row
- **Colors** -- ANSI escape codes (e.g., `\033[32m` for green)
- **Links** -- OSC 8 escape sequences for clickable text (requires iTerm2, Kitty, WezTerm)

## Available Data (JSON on stdin)

| Field                                                                    | Description                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `model.id`, `model.display_name`                                         | Current model identifier and name                          |
| `cwd`, `workspace.current_dir`                                           | Current working directory (prefer `workspace.current_dir`) |
| `workspace.project_dir`                                                  | Directory where Claude Code was launched                   |
| `cost.total_cost_usd`                                                    | Total session cost in USD                                  |
| `cost.total_duration_ms`                                                 | Wall-clock time since session start (ms)                   |
| `cost.total_api_duration_ms`                                             | Time waiting for API responses (ms)                        |
| `cost.total_lines_added`, `cost.total_lines_removed`                     | Lines changed                                              |
| `context_window.total_input_tokens`                                      | Cumulative input tokens across session                     |
| `context_window.total_output_tokens`                                     | Cumulative output tokens across session                    |
| `context_window.context_window_size`                                     | Max context (200000 default, 1000000 for extended)         |
| `context_window.used_percentage`                                         | Pre-calculated context usage percentage                    |
| `context_window.remaining_percentage`                                    | Pre-calculated context remaining percentage                |
| `context_window.current_usage`                                           | Token counts from last API call (null before first call)   |
| `exceeds_200k_tokens`                                                    | Whether last response exceeded 200K total tokens           |
| `rate_limits.five_hour.used_percentage`                                  | 5-hour rate limit usage (0-100, Pro/Max only)              |
| `rate_limits.five_hour.resets_at`                                        | 5-hour window reset time (Unix epoch seconds)              |
| `rate_limits.seven_day.used_percentage`                                  | 7-day rate limit usage                                     |
| `rate_limits.seven_day.resets_at`                                        | 7-day window reset time                                    |
| `session_id`                                                             | Unique session identifier                                  |
| `transcript_path`                                                        | Path to conversation transcript                            |
| `version`                                                                | Claude Code version                                        |
| `output_style.name`                                                      | Current output style name                                  |
| `vim.mode`                                                               | Vim mode (`NORMAL`/`INSERT`, only when vim mode enabled)   |
| `agent.name`                                                             | Agent name (only with `--agent` flag)                      |
| `worktree.name`, `.path`, `.branch`, `.original_cwd`, `.original_branch` | Worktree info (only during `--worktree` sessions)          |

### Context Window Fields

Two tracking modes:

- **Cumulative** (`total_input_tokens`, `total_output_tokens`) -- sum across session
- **Current** (`current_usage`) -- last API call, reflects actual context state

`current_usage` contains: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`

`used_percentage` formula: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` (no output tokens).

### Conditionally Present Fields

- `vim` -- only when vim mode enabled
- `agent` -- only with `--agent` flag or agent settings
- `worktree` -- only during `--worktree` sessions
- `rate_limits` -- only for Claude.ai subscribers after first API response

### Nullable Fields

- `context_window.current_usage` -- null before first API call
- `context_window.used_percentage`, `remaining_percentage` -- may be null early in session

## Example: Context Window Progress Bar (Bash)

```bash
#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)

BAR_WIDTH=10
FILLED=$((PCT * BAR_WIDTH / 100))
EMPTY=$((BAR_WIDTH - FILLED))
BAR=""
[ "$FILLED" -gt 0 ] && printf -v FILL "%${FILLED}s" && BAR="${FILL// /▓}"
[ "$EMPTY" -gt 0 ] && printf -v PAD "%${EMPTY}s" && BAR="${BAR}${PAD// /░}"

echo "[$MODEL] $BAR $PCT%"
```

## Example: Multi-line with Git and Colors (Bash)

```bash
#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name')
DIR=$(echo "$input" | jq -r '.workspace.current_dir')
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
DURATION_MS=$(echo "$input" | jq -r '.cost.total_duration_ms // 0')

CYAN='\033[36m'; GREEN='\033[32m'; YELLOW='\033[33m'; RED='\033[31m'; RESET='\033[0m'

if [ "$PCT" -ge 90 ]; then BAR_COLOR="$RED"
elif [ "$PCT" -ge 70 ]; then BAR_COLOR="$YELLOW"
else BAR_COLOR="$GREEN"; fi

FILLED=$((PCT / 10)); EMPTY=$((10 - FILLED))
printf -v FILL "%${FILLED}s"; printf -v PAD "%${EMPTY}s"
BAR="${FILL// /█}${PAD// /░}"

MINS=$((DURATION_MS / 60000)); SECS=$(((DURATION_MS % 60000) / 1000))

BRANCH=""
git rev-parse --git-dir > /dev/null 2>&1 && BRANCH=" | 🌿 $(git branch --show-current 2>/dev/null)"

echo -e "${CYAN}[$MODEL]${RESET} 📁 ${DIR##*/}$BRANCH"
COST_FMT=$(printf '$%.2f' "$COST")
echo -e "${BAR_COLOR}${BAR}${RESET} ${PCT}% | ${YELLOW}${COST_FMT}${RESET} | ⏱️ ${MINS}m ${SECS}s"
```

## Performance: Caching Expensive Operations

Use a temp file cache with a TTL for slow commands like `git status`:

```bash
CACHE_FILE="/tmp/statusline-git-cache"
CACHE_MAX_AGE=5  # seconds

cache_is_stale() {
    [ ! -f "$CACHE_FILE" ] || \
    [ $(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0))) -gt $CACHE_MAX_AGE ]
}
```

Use a stable fixed filename -- process IDs (`$$`) change every invocation and defeat caching.

## Windows

Status line commands run through Git Bash. Invoke PowerShell from that shell:

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -NoProfile -File C:/Users/username/.claude/statusline.ps1"
  }
}
```

## Troubleshooting

- **Not appearing**: verify script is executable (`chmod +x`), outputs to stdout, `disableAllHooks` is not true
- **Shows `--` or empty**: fields may be null before first API response; use fallbacks (`// 0` in jq)
- **Unexpected context %**: use `used_percentage` (not cumulative totals which may exceed context window size)
- **OSC 8 links not clickable**: requires iTerm2/Kitty/WezTerm; Terminal.app unsupported
- **Workspace trust**: status line requires accepted workspace trust dialog (same as hooks)
- **Slow/stale**: cache expensive operations; scripts that hang block updates

Community projects: ccstatusline, starship-claude.
