# Argument Parsing

Shell scripts need robust argument parsing to be usable. This reference covers
`getopts`, manual parsing, and validation patterns.

## `getopts` (POSIX)

The standard, portable approach for short options:

```bash
usage() {
  printf 'Usage: %s [-v] [-f FILE] [-n COUNT] [ARGS...]\n' "${0##*/}" >&2
  exit 64
}

verbose=false
file=""
count=1

while getopts ':vf:n:h' opt; do
  case "$opt" in
    v) verbose=true ;;
    f) file="$OPTARG" ;;
    n) count="$OPTARG" ;;
    h) usage ;;
    :) printf 'Error: -%s requires an argument\n' "$OPTARG" >&2; usage ;;
    ?) printf 'Error: unknown option -%s\n' "$OPTARG" >&2; usage ;;
  esac
done
shift $((OPTIND - 1))

# Remaining positional arguments are now in "$@"
```

**`getopts` rules:**
1. Leading `:` in optstring enables silent error handling
2. Colon after letter means option takes an argument (`f:`)
3. `$OPTARG` holds the argument for options that take one
4. `$OPTIND` is the index of the next argument to process
5. Always `shift $((OPTIND - 1))` after the loop

**Limitation:** `getopts` only handles short options (`-v`, `-f FILE`). For
long options (`--verbose`, `--file FILE`), use manual parsing.

## Manual Parsing (Long Options)

```bash
verbose=false
file=""
count=1
args=()

while (( $# > 0 )); do
  case "$1" in
    -v|--verbose) verbose=true; shift ;;
    -f|--file)
      [[ -n "${2:-}" ]] || die "Error: --file requires an argument"
      file="$2"; shift 2
      ;;
    -n|--count)
      [[ -n "${2:-}" ]] || die "Error: --count requires an argument"
      count="$2"; shift 2
      ;;
    -h|--help) usage ;;
    --)  shift; break ;;  # end of options
    -*)  die "Error: unknown option $1" ;;
    *)   args+=("$1"); shift ;;
  esac
done

# Append remaining arguments after --
args+=("$@")
```

**Rules:**
1. Always handle `--` to explicitly end option processing
2. Collect unknown positional arguments into an array
3. Validate required arguments early

## Argument Validation

```bash
# Check minimum argument count
(( $# >= 2 )) || die "Usage: ${0##*/} SOURCE DEST"

# Validate file exists
[[ -f "$file" ]] || die "Error: file not found: $file"

# Validate directory exists
[[ -d "$dir" ]] || die "Error: directory not found: $dir"

# Validate numeric argument
[[ "$count" =~ ^[0-9]+$ ]] || die "Error: count must be a positive integer"

# Validate non-empty
[[ -n "$name" ]] || die "Error: name cannot be empty"

# Validate file is readable
[[ -r "$file" ]] || die "Error: cannot read file: $file"
```

## Usage Messages

```bash
usage() {
  cat <<EOF
Usage: ${0##*/} [OPTIONS] FILE [FILE...]

Process files according to specified options.

Options:
  -v, --verbose    Enable verbose output
  -f, --format FMT Output format (json, csv, text)
  -o, --output DIR Output directory (default: current directory)
  -n, --dry-run    Show what would be done without doing it
  -h, --help       Show this help message

Examples:
  ${0##*/} -v data.csv
  ${0##*/} --format json --output /tmp input.txt
EOF
  exit 64
}
```

## Stdin Detection

```bash
# Check if stdin is a terminal (interactive) or pipe/file
if [[ -t 0 ]]; then
  echo "Reading from terminal"
else
  echo "Reading from pipe/file"
fi

# Read from file argument or stdin
input="${1:--}"  # default to stdin
if [[ "$input" == "-" ]]; then
  cat
else
  cat "$input"
fi
```

## Shift Patterns

```bash
# Process and remove first argument
command="$1"
shift

# Process pairs of arguments
while (( $# >= 2 )); do
  key="$1"
  value="$2"
  shift 2
done
```
