# Portability

Shell scripts may need to run across different shells (bash, dash, sh) and different operating systems (Linux, macOS,
BSDs). This reference covers when to target POSIX sh vs bash, and what constructs are safe in each.

## When to Use What

- **POSIX sh** (`#!/bin/sh`) — System scripts, init scripts, maximum portability
- **Bash** (`#!/usr/bin/env bash`) — User scripts, CI/CD, anywhere bash is guaranteed
- **Bash 4+** (`#!/usr/bin/env bash`) — Associative arrays, `mapfile`, `${var,,}` case ops

**macOS note:** macOS ships bash 3.2 permanently (GPL licensing). If targeting macOS, avoid bash 4+ features or require
users to install modern bash via Homebrew.

## POSIX sh: What You Have

### Available

- Parameter expansion: `${var}`, `${var:-default}`, `${var#pattern}`, `${var%pattern}`, `${var##pattern}`,
  `${var%%pattern}`, `${#var}`
- Command substitution: `$(command)` (preferred), `` `command` `` (legacy)
- Arithmetic: `$(( expr ))` (no `(( ))` command form)
- Tests: `[ condition ]` (`test` builtin)
- Control flow: `if`/`elif`/`else`/`fi`, `case`/`esac`, `for`/`while`/`until`
- Functions: `name() { ...; }` (no `function` keyword)
- Traps: `trap 'commands' SIGNAL`
- Here documents: `<<TAG`, `<<'TAG'` (no quoting), `<<-TAG` (strip tabs)
- Redirections: `>`, `>>`, `<`, `2>&1`, `>&2`
- Special variables: `$?`, `$#`, `$@`, `$*`, `$$`, `$!`, `$0`, `$-`

### Not Available in POSIX sh

- **`[[ ]]`** (Extended test) — POSIX workaround: use `[ ]` with proper quoting
- **`(( ))`** (Arithmetic command) — POSIX workaround: `[ "$a" -gt "$b" ]` or `$(( ))`
- **Arrays** (`arr=(a b c)`) — POSIX workaround: use positional parameters or IFS splitting
- **`local`** (Function locals) — Technically a widely-supported extension; not POSIX
- **`${var,,}`** (Lowercase) — POSIX workaround: `echo "$var" | tr '[:upper:]' '[:lower:]'`
- **`${var^^}`** (Uppercase) — POSIX workaround: `echo "$var" | tr '[:lower:]' '[:upper:]'`
- **`${var/p/r}`** (Substitution) — POSIX workaround: use `sed` or parameter expansion tricks
- **`=~` regex** (Regex match) — POSIX workaround: use `expr` or `case` with glob patterns
- **`<<<`** (Here-string) — POSIX workaround: use `echo "$var" | command` or here-doc
- **`<(cmd)`** (Process sub) — POSIX workaround: use temp files or pipes
- **`source`** (Source files) — POSIX workaround: use `.` (dot command)
- **`{1..10}`** (Brace expansion) — POSIX workaround: use `seq` or arithmetic loop
- **`$RANDOM`** (Random number) — POSIX workaround: read from `/dev/urandom`

## Bash-Specific Features Worth Using

When you target bash, these features are significant improvements over POSIX:

### `[[ ]]` — Extended Test

- No word splitting or globbing on variable expansions
- Supports `&&`/`||` inside the test
- Pattern matching: `[[ $var == *.txt ]]`
- Regex matching: `[[ $var =~ ^[0-9]+$ ]]`
- No need for `x"$var"` defensive prefix

### Arrays

```bash
# Indexed arrays (bash 2+)
files=("file one.txt" "file two.txt" "file three.txt")
for f in "${files[@]}"; do
  echo "$f"
done

# Associative arrays (bash 4+)
declare -A config
config[host]="localhost"
config[port]="8080"
```

### Process Substitution

```bash
# Compare two command outputs
diff <(sort file1) <(sort file2)

# Read from a command without subshell (preserves variables)
while read -r line; do
  count=$((count + 1))
done < <(grep -c pattern file)
echo "$count"  # variable persists
```

### `mapfile` / `readarray` (bash 4+)

```bash
mapfile -t lines < file.txt
echo "${#lines[@]} lines"
echo "${lines[0]}"
```

## Portable Patterns

### String Comparison

```bash
# POSIX
[ "$var" = "value" ]           # string equality (single =)
[ "$var" != "value" ]          # string inequality

# Bash
[[ $var == "value" ]]          # string equality
[[ $var == *.txt ]]            # glob pattern
[[ $var =~ ^[0-9]+$ ]]        # regex
```

### Numeric Comparison

```bash
# POSIX (always use these operators in [ ])
[ "$a" -eq "$b" ]    # equal
[ "$a" -ne "$b" ]    # not equal
[ "$a" -lt "$b" ]    # less than
[ "$a" -gt "$b" ]    # greater than
[ "$a" -le "$b" ]    # less or equal
[ "$a" -ge "$b" ]    # greater or equal

# Bash arithmetic
(( a > b ))           # cleaner, but not POSIX
```

### Substring Check

```bash
# POSIX (case statement for pattern matching)
case "$string" in
  *substring*) echo "found" ;;
  *) echo "not found" ;;
esac

# Bash
[[ $string == *substring* ]]
```

### Reading Input Line by Line

```bash
# POSIX
while IFS= read -r line; do
  printf '%s\n' "$line"
done < file

# Bash (also works in POSIX, but || handles missing final newline)
while IFS= read -r line || [ -n "$line" ]; do
  printf '%s\n' "$line"
done < file
```

### Default Values

```bash
# POSIX and bash — identical syntax
: "${VAR:=default}"            # set default if unset/empty
echo "${VAR:-fallback}"        # use fallback without modifying VAR
```

## GNU vs BSD Tool Differences

- **In-place sed** — GNU: `sed -i 's/a/b/' file` / BSD: `sed -i '' 's/a/b/' file` (GNU form not compatible on macOS)
- **Extended regex** — GNU: `grep -P` / BSD: not available; use `grep -E`
- **`date` format** — GNU: `date -d '2024-01-01'` / BSD: `date -j -f '%Y-%m-%d' '2024-01-01'`
- **`readlink -f`** — GNU: canonical path / BSD: not available; use `realpath`
- **`stat` format** — GNU: `stat -c '%s' file` / BSD: `stat -f '%z' file`
- **xargs null-delim** — GNU: `xargs -0 -r` / BSD: `xargs -0` (no `-r` on macOS)

**Guideline:** When possible, avoid GNU-specific extensions. When they're needed, document the dependency.
