# Portability

Shell scripts may need to run across different shells (bash, dash, sh) and
different operating systems (Linux, macOS, BSDs). This reference covers when
to target POSIX sh vs bash, and what constructs are safe in each.

## When to Use What

| Target | Shebang | Use Case |
|--------|---------|----------|
| POSIX sh | `#!/bin/sh` | System scripts, init scripts, maximum portability |
| Bash | `#!/usr/bin/env bash` | User scripts, CI/CD, anywhere bash is guaranteed |
| Bash 4+ | `#!/usr/bin/env bash` | Associative arrays, `mapfile`, `${var,,}` case ops |

**macOS note:** macOS ships bash 3.2 permanently (GPL licensing). If targeting
macOS, avoid bash 4+ features or require users to install modern bash via
Homebrew.

## POSIX sh: What You Have

### Available

- Parameter expansion: `${var}`, `${var:-default}`, `${var#pattern}`,
  `${var%pattern}`, `${var##pattern}`, `${var%%pattern}`, `${#var}`
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

| Feature | Bash Equivalent | POSIX Workaround |
|---------|----------------|------------------|
| `[[ ]]` | Extended test | Use `[ ]` with proper quoting |
| `(( ))` | Arithmetic command | `[ "$a" -gt "$b" ]` or `$(( ))` |
| Arrays | `arr=(a b c)` | Use positional parameters or IFS splitting |
| `local` | Function locals | Technically a widely-supported extension; not POSIX |
| `${var,,}` | Lowercase | `echo "$var" \| tr '[:upper:]' '[:lower:]'` |
| `${var^^}` | Uppercase | `echo "$var" \| tr '[:lower:]' '[:upper:]'` |
| `${var/p/r}` | Substitution | Use `sed` or parameter expansion tricks |
| `=~` regex | Regex match | Use `expr` or `case` with glob patterns |
| `<<<` | Here-string | Use `echo "$var" \| command` or here-doc |
| `<(cmd)` | Process sub | Use temp files or pipes |
| `source` | Source files | Use `.` (dot command) |
| `{1..10}` | Brace expansion | Use `seq` or arithmetic loop |
| `$RANDOM` | Random number | Read from `/dev/urandom` |

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

| Operation | GNU (Linux) | BSD (macOS) |
|-----------|-------------|-------------|
| In-place sed | `sed -i '' 's/a/b/' file` | `sed -i '' 's/a/b/' file` |
| In-place sed | `sed -i 's/a/b/' file` | Not compatible |
| Extended regex | `grep -P` | Not available; use `grep -E` |
| `date` format | `date -d '2024-01-01'` | `date -j -f '%Y-%m-%d' '2024-01-01'` |
| `readlink -f` | Canonical path | Not available; use `realpath` |
| `stat` format | `stat -c '%s' file` | `stat -f '%z' file` |
| xargs null-delim | `xargs -0 -r` | `xargs -0` (no `-r` on macOS) |

**Guideline:** When possible, avoid GNU-specific extensions. When they're
needed, document the dependency.
