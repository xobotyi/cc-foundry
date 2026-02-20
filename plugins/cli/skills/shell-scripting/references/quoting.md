# Quoting

Quoting is the #1 source of shell scripting bugs. Unquoted expansions undergo
word splitting and globbing — two implicit transformations that silently break
filenames with spaces, glob characters, or special characters.

## The Three Quoting Mechanisms

### Single Quotes

Preserve every character literally. No exceptions. No expansions.

```bash
echo 'Price is $5.00'      # Price is $5.00
echo 'Backslash: \'         # error: cannot include single quote
echo 'He said "hello"'     # He said "hello"
```

A single quote cannot appear inside single quotes. Use `$'...'` or
concatenation:

```bash
echo 'can'\''t'            # can't (end quote, escaped quote, start quote)
echo $'can\'t'             # can't (ANSI-C quoting, bash extension)
```

### Double Quotes

Preserve most characters literally, but allow these expansions:
- `$variable` and `${variable}` — parameter expansion
- `$(command)` — command substitution
- `$(( expr ))` — arithmetic expansion
- `\$`, `\"`, `\\`, `` \` ``, `\newline` — backslash escaping

```bash
name="World"
echo "Hello $name"          # Hello World
echo "Path is $(pwd)"       # Path is /home/user
echo "Two plus two is $((2+2))"  # Two plus two is 4
```

### ANSI-C Quoting (`$'...'`)

Bash extension. Interprets backslash escapes like C:

```bash
$'\n'     # newline
$'\t'     # tab
$'\\'     # literal backslash
$'\''     # literal single quote
$'\x41'   # hex: A
$'\u0041' # unicode: A (bash 4.4+)
```

## Word Splitting

When a variable or command substitution is **unquoted**, the shell splits the
result into words using characters in `$IFS` (default: space, tab, newline).

```bash
file="my document.txt"
cat $file         # WRONG: runs cat with two args: "my" and "document.txt"
cat "$file"       # RIGHT: runs cat with one arg: "my document.txt"

output=$(ls)
echo $output      # WRONG: all whitespace collapsed to single spaces
echo "$output"    # RIGHT: preserves original formatting
```

## Globbing (Pathname Expansion)

When a variable or command substitution is **unquoted**, the shell also expands
glob characters (`*`, `?`, `[...]`).

```bash
msg="Files: *.txt"
echo $msg         # WRONG: *.txt expands to matching filenames
echo "$msg"       # RIGHT: prints literal "Files: *.txt"
```

## Quoting Rules

### Always Quote

1. **Variable expansions:** `"$var"`, `"${var}"`, `"${var:-default}"`
2. **Command substitutions:** `"$(command)"`
3. **Array element access:** `"${array[0]}"`
4. **Strings with spaces or special chars:** `"hello world"`

### Safe to Leave Unquoted

1. **`[[ ]]` left-hand side:** `[[ $var == pattern ]]` (no word splitting
   inside `[[ ]]`)
2. **Assignments:** `var=$other_var` (right side of assignment is not split)
3. **`(( ))` arithmetic:** `(( x + y ))` (arithmetic context, no splitting)
4. **Integer special variables:** `$?`, `$#`, `$$`, `$!` (guaranteed no
   spaces, but quoting won't hurt)
5. **Case patterns:** `case $var in ...` (no splitting in case word)

### `"$@"` vs `"$*"`

This is the most critical quoting distinction for argument passing:

```bash
# "$@" preserves each argument as a separate word
# "$*" joins all arguments into a single word (separated by first IFS char)

set -- "arg one" "arg two" "arg three"

for x in "$@"; do echo "[$x]"; done
# [arg one]
# [arg two]
# [arg three]

for x in "$*"; do echo "[$x]"; done
# [arg one arg two arg three]

# NEVER use $* or $@ without quotes — word splitting breaks arguments
for x in $@; do echo "[$x]"; done
# [arg]
# [one]
# [arg]
# [two]
# [arg]
# [three]
```

**Rule:** Use `"$@"` to pass arguments through. Use `"$*"` only when you
deliberately want to join arguments into a single string.

### Array Expansion

```bash
arr=("one two" "three" "four five")

# RIGHT: each element as separate word
for item in "${arr[@]}"; do echo "$item"; done
# one two
# three
# four five

# WRONG: word splitting destroys element boundaries
for item in ${arr[@]}; do echo "$item"; done
# one
# two
# three
# four
# five
```

## Common Quoting Mistakes

### Quoting too much

```bash
# WRONG: quoted glob won't expand
for f in "*.txt"; do ...    # iterates once with literal "*.txt"

# RIGHT: glob must be unquoted
for f in *.txt; do ...      # iterates over matching files

# WRONG: quoted tilde won't expand
cd "~/Documents"            # looks for literal "~/Documents"

# RIGHT: tilde must be unquoted, or use $HOME
cd ~/Documents
cd "$HOME/Documents"
```

### Quoting inside `[[ ]]`

```bash
# Pattern matching: RHS must be unquoted for glob/regex
[[ $file == *.txt ]]        # RIGHT: glob pattern
[[ $file == "*.txt" ]]      # matches literal "*.txt"

# Regex: RHS must be unquoted
re='^[0-9]+$'
[[ $var =~ $re ]]           # RIGHT: regex match
[[ $var =~ "$re" ]]         # string comparison, not regex
```

### Nested quoting in command substitution

Quotes inside `$(...)` are independent from outer quotes:

```bash
# This is correct — inner quotes are separate
result="$(command "$(inner_command "$arg")")"
```

## `printf` vs `echo`

Prefer `printf` for reliable output:

```bash
# echo behavior varies across platforms and arguments
echo -n "hello"      # some systems print "-n hello"
echo "$var"          # if var is "-n", echo interprets it as option

# printf is consistent and safe
printf '%s' "hello"         # no trailing newline
printf '%s\n' "$var"        # always treats $var as data, never as option
printf '%s\n' "${arr[@]}"   # print each array element on its own line
```
