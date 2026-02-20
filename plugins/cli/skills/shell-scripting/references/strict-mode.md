# Strict Mode and Error Handling

Defensive shell scripting starts with strict mode. These settings change shell
behavior from "silently continue on failure" to "stop and report."

## The Strict Mode Header

```bash
#!/usr/bin/env bash
set -euo pipefail
```

### `set -e` (errexit)

Aborts the script when a command exits with non-zero status. Exceptions:

- Commands in `if`/`while`/`until` conditions
- Commands before `&&` or `||`
- Commands in `!` (negation)
- Commands in subshells that are part of conditions

**Caveats with `errexit`:**

```bash
# This will NOT trigger errexit because the failing command
# is on the left side of ||
false || true

# This WILL exit — standalone failing command
false

# Careful: (( )) with value 0 returns exit status 1
set -e
i=0
(( i++ ))  # exits! i was 0, post-increment returns 0 (falsy in C)
# Fix: use (( ++i )) or (( i += 1 )) or : $(( i++ ))
```

**Functions and `errexit`:**

```bash
# errexit does NOT propagate into functions called from conditions
check_something() {
  false       # this won't abort when called from if
  echo "still running"
}
if check_something; then
  echo "ok"
fi
```

### `set -u` (nounset)

Treats unset variables as errors during expansion. This catches typos in
variable names and missing initializations.

```bash
set -u
echo "$undefined_var"  # error: undefined_var: unbound variable

# Safe patterns for optional variables:
echo "${OPTIONAL_VAR:-default_value}"  # use default if unset
echo "${OPTIONAL_VAR:+value_if_set}"   # use alternate if set
```

### `set -o pipefail`

By default, a pipeline's exit status is the exit status of the last command.
With `pipefail`, a pipeline returns the exit status of the rightmost command
that failed (or 0 if all succeeded).

```bash
set -o pipefail

# Without pipefail: exit status is 0 (from wc)
# With pipefail: exit status is 1 (from grep)
grep "nonexistent" file.txt | wc -l
```

Use `PIPESTATUS` (bash) to inspect individual command exit codes:

```bash
cmd1 | cmd2 | cmd3
echo "${PIPESTATUS[0]} ${PIPESTATUS[1]} ${PIPESTATUS[2]}"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Misuse of shell builtin |
| 126 | Command not executable |
| 127 | Command not found |
| 128+N | Killed by signal N |

Return meaningful exit codes from scripts:

```bash
readonly EX_OK=0
readonly EX_USAGE=64
readonly EX_DATAERR=65
readonly EX_NOINPUT=66
readonly EX_SOFTWARE=70

die() {
  printf '%s\n' "$1" >&2
  exit "${2:-1}"
}
```

## Trap-Based Cleanup

Use `trap` to run cleanup code on script exit, regardless of how the script
terminates:

```bash
cleanup() {
  local exit_code=$?
  rm -f "$tmpfile"
  exit "$exit_code"
}
trap cleanup EXIT

tmpfile=$(mktemp)
# ... script body ...
# cleanup runs automatically on any exit
```

**Trap signals:**

| Signal | When |
|--------|------|
| `EXIT` | Script exits (any reason) |
| `ERR` | Command fails (with `set -e`) |
| `INT` | Ctrl+C |
| `TERM` | `kill` (default signal) |
| `HUP` | Terminal hangup |

**Trap rules:**

```bash
# Multiple signals in one trap
trap cleanup EXIT INT TERM

# Reset a trap
trap - EXIT

# Show current traps
trap -p
```

## Temporary Files

Always use `mktemp` for temporary files and clean up with traps:

```bash
tmpfile=$(mktemp) || die "Failed to create temp file"
tmpdir=$(mktemp -d) || die "Failed to create temp dir"
trap 'rm -rf "$tmpfile" "$tmpdir"' EXIT
```

Never use predictable filenames in `/tmp` — this creates race conditions
and symlink attacks.

## Subshell Isolation for `cd`

```bash
# Wrong: cd failure leaves you in wrong directory
cd /some/path
rm important_file

# Right: check cd, or use subshell
cd /some/path || exit 1
rm important_file

# Better: subshell isolates directory change
(
  cd /some/path || exit 1
  rm important_file
)
```

## Debugging

```bash
# Trace execution (prints each command before running)
set -x

# Trace only a specific section
set -x
# ... debug this section ...
set +x

# Custom trace prefix showing file and line
PS4='+${BASH_SOURCE}:${LINENO}: '
set -x

# Syntax check without executing
bash -n script.sh

# Verbose mode (prints lines as read)
set -v
```
