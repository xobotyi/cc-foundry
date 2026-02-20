# Common Pitfalls

A catalog of frequent shell scripting mistakes, drawn from Greg Wooledge's
BashPitfalls, ShellCheck warnings, and real-world bugs.

## Iteration Pitfalls

### Parsing `ls` output

```bash
# WRONG — breaks on filenames with spaces, globs, newlines
for f in $(ls *.mp3); do
  something "$f"
done

# RIGHT — use globs directly
for f in ./*.mp3; do
  [[ -e "$f" ]] || continue
  something "$f"
done
```

### Word-split `for` loops on file content

```bash
# WRONG — splits on words, not lines; globs expand
for line in $(cat file); do
  echo "$line"
done

# RIGHT — use while read
while IFS= read -r line; do
  echo "$line"
done < file
```

### `find` output with `for`

```bash
# WRONG — breaks on spaces, newlines in paths
for f in $(find . -type f); do ...

# RIGHT — use find with -exec or -print0
find . -type f -exec process {} \;

# RIGHT — bash: while read with null delimiter
while IFS= read -r -d '' f; do
  process "$f"
done < <(find . -type f -print0)
```

## Variable Pitfalls

### Unquoted variables

```bash
# WRONG — word splitting and globbing
cp $file $target
echo $message

# RIGHT
cp -- "$file" "$target"
echo "$message"
```

### Spaces in assignments

```bash
var = "value"    # WRONG: runs "var" as command with "=" and "value" as args
var="value"      # RIGHT
```

### `local var=$(cmd)` masks exit code

```bash
# WRONG — local always returns 0, hiding command failure
local result=$(failing_command)
echo $?  # always 0

# RIGHT — separate declaration and assignment
local result
result=$(failing_command)
echo $?  # actual exit code
```

## Test Pitfalls

### `[` vs `[[`

```bash
# WRONG — [ doesn't handle empty variables
[ $var = "test" ]           # fails if $var is empty

# RIGHT — quote or use [[
[ "$var" = "test" ]         # POSIX way
[[ $var == "test" ]]        # Bash way (no word splitting)
```

### `&&` / `||` inside `[ ]`

```bash
# WRONG — && is a command separator, not a test operator
[ "$a" = 1 && "$b" = 2 ]

# RIGHT
[ "$a" = 1 ] && [ "$b" = 2 ]
[[ $a == 1 && $b == 2 ]]
```

### Numeric comparison with `>`

```bash
# WRONG — > is redirection in [ ], string comparison in [[ ]]
[ "$a" > "$b" ]             # creates file named "$b"
[[ $a > $b ]]               # lexicographic, not numeric

# RIGHT
[ "$a" -gt "$b" ]           # POSIX numeric comparison
(( a > b ))                 # Bash arithmetic
```

### `[[ $foo == $bar ]]` is pattern matching

```bash
# This does pattern matching, not string comparison
bar="*.txt"
[[ $foo == $bar ]]  # matches if foo ends in .txt

# For string comparison, quote the right side
[[ $foo == "$bar" ]]
```

## Pipeline Pitfalls

### Variables in pipeline subshells

```bash
# WRONG — while runs in subshell, count is lost
count=0
cat file | while read -r line; do
  (( count++ ))
done
echo "$count"  # always 0

# RIGHT — use process substitution
count=0
while read -r line; do
  (( count++ ))
done < <(cat file)
echo "$count"  # correct value
```

### Redirecting to the same file

```bash
# WRONG — file is truncated before sed reads it
sed 's/foo/bar/' file > file

# RIGHT — use temp file or sed -i
sed 's/foo/bar/' file > tmpfile && mv tmpfile file
sed -i 's/foo/bar/' file  # GNU sed
```

## Arithmetic Pitfalls

### `(( i++ ))` with `set -e`

```bash
set -e
i=0
(( i++ ))    # EXIT! post-increment returns 0 (old value), which is falsy

# Fix options:
(( ++i ))             # pre-increment returns 1
(( i += 1 ))          # addition returns non-zero
i=$(( i + 1 ))        # assignment, not standalone (( ))
```

### Leading zeros in arithmetic

```bash
# Bash treats leading zeros as octal
(( 010 == 8 ))   # true! 010 octal = 8 decimal

# Strip leading zeros before arithmetic
n="08"
n=${n#0}  # or use 10#$n to force base-10
(( result = 10#$n + 1 ))
```

## Miscellaneous Pitfalls

### `cmd1 && cmd2 || cmd3` is not if/then/else

```bash
# WRONG — cmd3 runs if cmd2 fails, even when cmd1 succeeded
true && false || echo "this runs unexpectedly"

# RIGHT — use proper if/then/else
if cmd1; then
  cmd2
else
  cmd3
fi
```

### `export var=~/path` — tilde may not expand

```bash
# Tilde expansion in export is implementation-dependent
export dir=~/projects    # may or may not expand ~

# RIGHT
dir=~/projects
export dir
# Or:
export dir="$HOME/projects"
```

### `echo "$var"` when var might start with `-`

```bash
# echo might interpret -n, -e, etc. as options
var="-n hello"
echo "$var"        # might print "hello" without newline

# RIGHT
printf '%s\n' "$var"
```

### Filenames starting with `-`

```bash
# WRONG — filename "-rf" could be interpreted as option
rm $file

# RIGHT — use -- to end option processing
rm -- "$file"

# Or prefix with ./
rm "./$file"
```

### Forgetting `--` with commands

Many commands interpret arguments starting with `-` as options. Always use
`--` before variable filenames:

```bash
cp -- "$src" "$dst"
mv -- "$old" "$new"
grep -- "$pattern" "$file"
sort -- "$file"
```
