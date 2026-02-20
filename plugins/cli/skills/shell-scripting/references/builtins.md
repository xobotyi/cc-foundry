# Builtins and Parameter Expansion

Prefer shell builtins over external commands. Each external command forks a
process — in a loop, this creates significant overhead. Shell builtins execute
in-process and are both faster and more portable.

## Parameter Expansion

### String Operations

| Operation | Syntax | Example |
|-----------|--------|---------|
| Length | `${#var}` | `name="hello"; echo ${#name}` -> `5` |
| Substring | `${var:offset:length}` | `${name:1:3}` -> `ell` |
| Remove shortest prefix | `${var#pattern}` | `${path#*/}` -> `b/c.txt` |
| Remove longest prefix | `${var##pattern}` | `${path##*/}` -> `c.txt` |
| Remove shortest suffix | `${var%pattern}` | `${path%/*}` -> `a/b` |
| Remove longest suffix | `${var%%pattern}` | `${path%%/*}` -> `a` |
| First substitution | `${var/pat/rep}` | `${name/l/L}` -> `heLlo` |
| All substitutions | `${var//pat/rep}` | `${name//l/L}` -> `heLLo` |
| Prefix substitution | `${var/#pat/rep}` | `${name/#he/HE}` -> `HEllo` |
| Suffix substitution | `${var/%lo/LO}` | `${name/%lo/LO}` -> `helLO` |

### Case Modification (bash 4+)

| Operation | Syntax | Example |
|-----------|--------|---------|
| First char uppercase | `${var^}` | `${name^}` -> `Hello` |
| All uppercase | `${var^^}` | `${name^^}` -> `HELLO` |
| First char lowercase | `${var,}` | `${VAR,}` -> `hELLO` |
| All lowercase | `${var,,}` | `${VAR,,}` -> `hello` |

### Default Values

| Syntax | Meaning |
|--------|---------|
| `${var:-word}` | Use `word` if `var` is unset or empty |
| `${var-word}` | Use `word` if `var` is unset |
| `${var:=word}` | Assign `word` if `var` is unset or empty |
| `${var:+word}` | Use `word` if `var` is set and non-empty |
| `${var:?msg}` | Error with `msg` if `var` is unset or empty |

### Indirection (bash)

```bash
name="greeting"
greeting="hello"
echo "${!name}"     # hello (indirect expansion)
```

## Replacing External Commands

### `basename` / `dirname`

```bash
path="/home/user/file.txt"

# Instead of: basename "$path"
echo "${path##*/}"              # file.txt

# Instead of: basename "$path" .txt
name="${path##*/}"; echo "${name%.txt}"  # file

# Instead of: dirname "$path"
echo "${path%/*}"               # /home/user
```

### `sed` for simple substitutions

```bash
var="hello-world-foo"

# Instead of: echo "$var" | sed 's/-/_/g'
echo "${var//-/_}"              # hello_world_foo

# Instead of: echo "$var" | sed 's/^hello//'
echo "${var#hello}"             # -world-foo
```

### `cut` for field extraction

```bash
line="field1:field2:field3"

# Instead of: echo "$line" | cut -d: -f1
IFS=: read -r first rest <<< "$line"
echo "$first"                   # field1

# Or using parameter expansion
echo "${line%%:*}"              # field1
```

### `wc -c` for string length

```bash
# Instead of: echo -n "$var" | wc -c
echo "${#var}"
```

### `expr` for arithmetic

```bash
# Instead of: i=$(expr $i + 1)
(( i++ ))                       # bash
i=$(( i + 1 ))                  # POSIX

# Instead of: expr "$string" : '.*'
echo "${#string}"
```

### `seq` for sequences

```bash
# Instead of: for i in $(seq 1 10)
for (( i = 1; i <= 10; i++ )); do
  echo "$i"
done

# Or for fixed ranges:
for i in {1..10}; do
  echo "$i"
done
```

### `tr` for case conversion (bash 4+)

```bash
# Instead of: echo "$var" | tr '[:upper:]' '[:lower:]'
echo "${var,,}"

# Instead of: echo "$var" | tr '[:lower:]' '[:upper:]'
echo "${var^^}"
```

### `date` (bash 4+)

```bash
# Instead of: date '+%Y-%m-%d'
printf '%(%Y-%m-%d)T\n' -1

# Instead of: date '+%s'
printf '%(%s)T\n' -1
```

### `cat` for reading files

```bash
# Instead of: content=$(cat file)
content=$(<file)

# Instead of: cat file | grep pattern
grep pattern file
grep pattern < file
```

### Command existence check

```bash
# Instead of: which command
command -v command >/dev/null 2>&1

# Or in a test:
if command -v git >/dev/null 2>&1; then
  echo "git is available"
fi
```

## Arithmetic

```bash
# Use (( )) for arithmetic commands
(( count++ ))
(( total = price * quantity ))
if (( a > b )); then echo "a is greater"; fi

# Use $(( )) for arithmetic substitution
result=$(( x + y ))
echo "Total: $(( price * quantity ))"

# POSIX arithmetic (no (( )) command)
result=$(( x + y ))
[ "$a" -gt "$b" ] && echo "a is greater"
```

## `read` Builtin

```bash
# Read a line
IFS= read -r line

# Read with prompt
read -rp "Enter name: " name

# Read with timeout (bash)
read -rt 5 -p "Quick! " answer

# Split on delimiter
IFS=: read -r user _ uid gid _ home shell <<< "$passwd_line"

# Read into array (bash 4+)
mapfile -t lines < file.txt
IFS=: read -ra fields <<< "$line"

# Read null-delimited (for find -print0)
while IFS= read -r -d '' file; do
  echo "$file"
done
```

## Arrays (Bash)

```bash
# Declaration
declare -a arr=("one" "two" "three")
arr+=("four")

# Access
echo "${arr[0]}"             # first element
echo "${arr[@]}"             # all elements (separate words)
echo "${arr[*]}"             # all elements (single word)
echo "${#arr[@]}"            # array length
echo "${!arr[@]}"            # all indices

# Iteration
for item in "${arr[@]}"; do
  echo "$item"
done

# Slicing
echo "${arr[@]:1:2}"         # elements 1-2

# Deletion
unset 'arr[1]'               # remove element (leaves gap)

# Associative arrays (bash 4+)
declare -A map
map[key]="value"
echo "${map[key]}"
[[ -v map[key] ]] && echo "key exists"
```
