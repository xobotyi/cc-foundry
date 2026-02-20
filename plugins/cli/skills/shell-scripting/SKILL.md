---
name: shell-scripting
description: >-
  Shell script conventions and defensive patterns: strict mode, quoting,
  portability, error handling, and common pitfalls. Invoke whenever task
  involves writing or reviewing shell scripts (.sh, .bash, .zsh files).
---

# Shell Scripting

Write defensively. Shell defaults are hostile — unquoted variables split,
unset variables vanish silently, failed commands continue. Every rule here
exists to counteract a specific shell default that causes bugs.

## References

Extended examples, code patterns, and lookup tables for the rules below.

| Topic | Reference | Contents |
|-------|-----------|----------|
| Strict mode, error handling, traps, debugging | [strict-mode.md](references/strict-mode.md) | errexit caveats, pipefail examples, trap patterns, temp file safety, debugging techniques |
| Quoting rules, word splitting, globbing | [quoting.md](references/quoting.md) | Three quoting mechanisms, `"$@"` vs `"$*"`, array expansion, printf vs echo, nested quoting |
| POSIX sh vs bash, portable constructs | [portability.md](references/portability.md) | Feature comparison table, GNU vs BSD tool differences, portable pattern catalog |
| Argument parsing, getopts, validation | [arguments.md](references/arguments.md) | getopts template, manual long-option parsing, validation patterns, usage messages, stdin detection |
| Common shell scripting mistakes | [pitfalls.md](references/pitfalls.md) | Iteration pitfalls, variable pitfalls, test pitfalls, pipeline pitfalls, arithmetic traps |
| Pure bash/sh alternatives to external commands | [builtins.md](references/builtins.md) | Parameter expansion table, replacing sed/cut/basename/expr, arrays, read patterns, arithmetic |

## Script Header

Every bash script starts with:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- **Shebang:** Use `#!/usr/bin/env bash` — not `#!/bin/bash`. The `env`
  lookup is more portable across systems where bash is not at `/bin/bash`.
- **`set -e` (errexit):** Exit on command failure. Understand the exceptions:
  commands in `if`/`while` conditions, left side of `&&`/`||`, and negated
  commands (`!`) do not trigger errexit.
- **`set -u` (nounset):** Error on unset variables. Use `${VAR:-default}`
  for optional variables.
- **`set -o pipefail`:** Pipeline returns the rightmost failing command's
  exit code, not the last command's.
- **For POSIX sh scripts:** Use `#!/bin/sh`. Drop `pipefail` (not POSIX).
  Use `set -eu` with caution — `set -e` behavior varies across sh
  implementations.
- **File header comment:** After the shebang, add a brief description of
  what the script does.

```bash
#!/usr/bin/env bash
set -euo pipefail
#
# deploy.sh — Build and deploy the application to staging.
```

## Quoting

Quoting is the single most important discipline. Unquoted variables undergo
word splitting (breaks on IFS characters) and pathname expansion (glob
characters match filenames). Both are silent and devastating.

### Core Rules

- **Always double-quote variable expansions:** `"$var"`, `"${var}"`.
- **Always double-quote command substitutions:** `"$(command)"`.
- **Use `"$@"` to pass arguments through.** Never `$*` or `$@` unquoted.
  `"$@"` preserves each argument as a separate word. `"$*"` joins them.
- **Quote array expansions:** `"${arr[@]}"` expands each element as a
  separate word. Unquoted `${arr[@]}` undergoes word splitting.
- **Leave globs unquoted:** `for f in *.txt` — the glob must expand.
  But always quote variables inside the loop: `"$f"`.
- **Leave `[[ ]]` right-hand patterns unquoted** when doing glob or regex
  matching. Quote the right side for literal string comparison.
- **Use single quotes for literal strings** that need no expansion:
  `grep 'pattern' file`.
- **Use `printf` instead of `echo`** for data output. `echo` interprets
  `-n`, `-e` as options on some platforms. `printf '%s\n' "$var"` is
  always safe.

### When Quoting Is Not Needed

- Right side of assignment: `var=$other` (no splitting in assignment context)
- Inside `(( ))` arithmetic: `(( x + y ))`
- Inside `[[ ]]` on the left side: `[[ $var == pattern ]]`
- Integer special variables: `$?`, `$#`, `$$` (guaranteed no spaces)
- `case` word: `case $var in ...`

## Variable Handling

- **Naming:** lowercase with underscores for local variables (`file_path`,
  `line_count`). UPPER_CASE for exported/environment variables and
  constants (`PATH`, `MAX_RETRIES`).
- **Declare constants with `readonly`:**
  ```bash
  readonly CONFIG_DIR="/etc/myapp"
  ```
- **Use `local` in functions** to prevent variable leakage into global
  scope. Declare and assign on separate lines when capturing command output:
  ```bash
  local result
  result=$(some_command)
  ```
  Combined `local result=$(cmd)` masks the exit code — `local` always
  returns 0.
- **Default values:** Use `${VAR:-default}` to provide defaults without
  modifying the variable. Use `${VAR:=default}` to set and use.
- **Required variables:** Use `${VAR:?error message}` to abort if unset.
- **Arrays for lists:** Use bash arrays instead of space-delimited strings.
  ```bash
  files=("file one.txt" "file two.txt")
  command "${files[@]}"
  ```

## Error Handling

- **Check every command that can fail.** Use `|| exit 1`, `|| return 1`,
  or explicit `if` blocks. Especially `cd`, `mkdir`, `rm`, `cp`, `mv`.
  ```bash
  cd "$dir" || exit 1
  ```
- **Trap for cleanup.** Use `trap` on EXIT for reliable cleanup:
  ```bash
  tmpfile=$(mktemp) || exit 1
  trap 'rm -f "$tmpfile"' EXIT
  ```
- **Use `mktemp` for temp files.** Never hardcoded temp paths. Always
  clean up via trap.
- **Error messages to stderr:**
  ```bash
  die() { printf '%s\n' "$1" >&2; exit "${2:-1}"; }
  ```
- **Exit codes:** Return 0 for success, non-zero for failure. Use
  meaningful codes: 1 for general error, 2 for usage error, 64+ for
  application-specific errors (following sysexits convention).
- **Never use `set -e` as a substitute for error handling.** It has many
  edge cases. Use it as a safety net, but still check critical commands
  explicitly.

## Functions

- **Declare with `name() { ... }`** — no `function` keyword (it's not
  POSIX and adds nothing in bash).
- **Use `local` for all function variables.** Bash functions share the
  caller's scope by default — every undeclared variable is global.
- **Return values via exit code** (0 = success, non-zero = failure) or
  via stdout. Never rely on global variables for function output.
- **Separate `local` declaration from command substitution:**
  ```bash
  my_func() {
    local output
    output=$(some_command) || return 1
  }
  ```
- **Put all functions before executable code.** Only `set` statements,
  source commands, and constants should precede function definitions.
- **Use `main` for scripts with multiple functions.** Call `main "$@"` as
  the last line. This keeps the entry point obvious and lets all variables
  be local.
  ```bash
  main() {
    local arg="$1"
    # ...
  }
  main "$@"
  ```

## Control Flow

### Conditionals

- **Use `[[ ]]` in bash** — it prevents word splitting, supports `&&`/`||`
  inside the test, and enables pattern/regex matching. In POSIX sh, use
  `[ ]` with all variables quoted.
- **Use `(( ))` for numeric comparisons:**
  ```bash
  if (( count > 10 )); then ...
  ```
  In POSIX sh: `[ "$count" -gt 10 ]`.
- **Use `==` in `[[ ]]` and `=` in `[ ]`** for string equality.
- **Test empty/non-empty explicitly:** `[[ -z "$var" ]]` and
  `[[ -n "$var" ]]` — not `[[ "$var" ]]`.
- **Never use `&&`/`||` as if/then/else:**
  ```bash
  # WRONG — cmd3 runs if cmd2 fails, even when cmd1 succeeds
  cmd1 && cmd2 || cmd3
  # RIGHT
  if cmd1; then cmd2; else cmd3; fi
  ```

### Loops

- **Never parse `ls` output.** Use globs:
  ```bash
  for f in ./*.txt; do
    [[ -e "$f" ]] || continue
    process "$f"
  done
  ```
- **Use `while read` for line-oriented input:**
  ```bash
  while IFS= read -r line; do
    printf '%s\n' "$line"
  done < file
  ```
  The `IFS=` prevents leading/trailing whitespace trimming. The `-r`
  prevents backslash interpretation.
- **Use process substitution to avoid subshell variable loss:**
  ```bash
  while IFS= read -r line; do
    (( count++ ))
  done < <(command)
  echo "$count"  # preserved
  ```
- **Use `find -print0` with `read -d ''`** for filenames with special
  characters:
  ```bash
  while IFS= read -r -d '' file; do
    process "$file"
  done < <(find . -type f -print0)
  ```

### Case Statements

- **`case` for multi-way branching:**
  ```bash
  case "$1" in
    start)   do_start ;;
    stop)    do_stop ;;
    restart) do_stop; do_start ;;
    *)       die "Unknown command: $1" ;;
  esac
  ```
- **Indent patterns by 2 spaces** from `case`. Put `;;` on the same
  line as the action for one-liners, on its own line for multi-line
  actions.

## Input Handling

- **Use `getopts` for short options.** It is POSIX, handles combined flags
  (`-vf`), and manages `OPTARG`/`OPTIND` correctly.
- **Use manual parsing for long options.** `while (( $# > 0 )); do case`
  loop with explicit `--` handling.
- **Always handle `--`** to end option processing — prevents filenames
  starting with `-` from being interpreted as options.
- **Always use `--` when passing variables to commands:**
  ```bash
  rm -- "$file"
  grep -- "$pattern" "$file"
  ```
- **Prefix globs with `./`** to prevent files named `-rf` from becoming
  options:
  ```bash
  for f in ./*; do
    rm -- "$f"
  done
  ```
- **Provide a `usage()` function** for any script that takes arguments.
  Print to stderr and exit with code 64 (EX_USAGE).
- **Validate arguments early.** Check counts, types, file existence
  before starting work.
- **Detect stdin vs terminal:** `[[ -t 0 ]]` tests whether stdin is a
  terminal.

## Formatting

- **Indent with 2 spaces.** No tabs (except in `<<-` heredocs).
- **Maximum line length: 80 characters.** Use `\` continuation or heredocs
  for long strings.
- **`; then` and `; do` on the same line** as `if`/`for`/`while`:
  ```bash
  if [[ -f "$file" ]]; then
  for item in "${arr[@]}"; do
  while read -r line; do
  ```
- **Split long pipelines** one per line with `|` on the continuation line:
  ```bash
  command1 \
    | command2 \
    | command3
  ```
- **Use `$(command)` not backticks.** `$()` nests cleanly and is readable.
  Backticks require escaping and don't nest.
- **Prefer `${var}` braces** for all variables except positional parameters
  (`$1`-`$9`) and special parameters (`$?`, `$#`, etc.).

## Portability

- **Choose your target.** Decide upfront whether you need POSIX sh
  compatibility or can require bash.
- **If targeting bash:** use `#!/usr/bin/env bash`, use `[[ ]]`, arrays,
  and process substitution freely. Specify minimum bash version if using
  4.0+ features (associative arrays, `mapfile`, case modification).
- **If targeting POSIX sh:** use `#!/bin/sh`, use `[ ]` with quoted
  variables, no arrays, no `[[ ]]`, no `(( ))`, no `local` (technically
  non-POSIX but widely supported), no process substitution.
- **macOS ships bash 3.2 permanently.** If targeting macOS without
  requiring Homebrew bash, avoid bash 4+ features.
- **Avoid GNU-specific tool options** when portability matters: `sed -i`,
  `grep -P`, GNU `date` flags. Document the dependency when GNU tools
  are required.
- **Use `command -v`** to check if a program is available — not `which`
  (which is not a builtin and behaves differently across systems).

## ShellCheck Integration

- **Run ShellCheck on all scripts.** It catches quoting errors, portability
  issues, and common pitfalls automatically.
- **Use a directive comment for intentional violations:**
  ```bash
  # shellcheck disable=SC2086
  word_split_is_intentional $var
  ```
- **Specify shell dialect** if the shebang is absent or ambiguous:
  ```bash
  # shellcheck shell=bash
  ```
- **Common ShellCheck codes to know:**
  - SC2086: Double quote to prevent globbing and word splitting
  - SC2046: Quote this to prevent word splitting
  - SC2034: Variable appears unused (might be exported or sourced)
  - SC2155: Declare and assign separately to avoid masking return values
  - SC2164: Use `cd ... || exit` in case `cd` fails

## Application

**When writing shell scripts:** Apply all rules silently. Produce clean,
defensive code. Use strict mode, quote everything, handle errors, use arrays
for lists.

**When reviewing shell scripts:** Cite the specific rule violated. Show the
fix inline. Prioritize: quoting bugs > error handling gaps > style issues.

## Integration

- `the-coder` provides the overall coding workflow (discover, plan, verify)
- Language plugins (golang, javascript) handle language-specific tooling
- This skill handles shell-specific correctness and defensive patterns

Quote everything. Handle every error. Trust nothing.
