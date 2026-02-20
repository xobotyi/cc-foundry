# Argument Conventions

Detailed conventions for command-line arguments, flags, and subcommands.
Extends the behavioral rules in SKILL.md with full specification details,
edge cases, and extended examples.

## POSIX Utility Syntax Guidelines

The POSIX guidelines (IEEE Std 1003.1-2017, Chapter 12) define the baseline
for portable argument syntax:

1. Utility names should be 2-9 characters, inclusive.
2. Names should include only lowercase letters and digits.
3. Each option name is a single alphanumeric character.
   `-W` is reserved for vendor options.
4. All options must be preceded by `-`.
5. Options without arguments, followed by at most one option
   with an argument, can be grouped behind one `-`: `-abc` = `-a -b -c`.
6. Option and option-argument should be separate arguments,
   except when the option-argument is optional (then it must be adjacent).
7. Option-arguments should not be optional.
8. Multiple option-arguments for a single option use comma
   or blank separation within one argument.
9. All options should precede operands.
10. `--` terminates options. Everything after is an operand.
11. Option order should not matter, unless mutually exclusive.
12. Operand order may matter (utility-specific).
13. `-` as an operand means stdin (or stdout from context).
14. If an argument looks like an option per guidelines 3-10,
    treat it as one.

## GNU Long Options

GNU extends POSIX with `--long-name` options:

- Every single-letter option should have a long equivalent.
- Long options use `--name=value` or `--name value` syntax.
- All programs should support `--version` and `--help`.
- Output files should be specified with `-o` or `--output`, not as bare
  positional arguments.

### Standard Long Option Names

The GNU Coding Standards define a [table of common long options][gnu-options]
for consistency across programs. Key entries:

| Short | Long | Purpose |
|-------|------|---------|
| `-a` | `--all` | All items |
| `-d` | `--debug` | Debug output |
| `-f` | `--force` | Force operation |
| `-h` | `--help` | Display help |
| `-n` | `--dry-run` | Simulate without executing |
| `-o` | `--output` | Output file |
| `-p` | `--port` | Port number |
| `-q` | `--quiet` | Suppress non-essential output |
| `-u` | `--user` | User |
| `-v` | `--verbose` | Verbose output |
| | `--version` | Version information |
| | `--json` | JSON output |
| | `--no-color` | Disable color |
| | `--no-input` | Non-interactive mode |
| | `--plain` | Machine-readable tabular output |

[gnu-options]: https://www.gnu.org/prep/standards/html_node/Option-Table.html

## Subcommand Patterns

For complex tools with multiple operations:

### Two-Level Subcommands

When a tool has many objects and operations, use `noun verb` or `verb noun`:

```
docker container create    # noun verb
docker container list
docker image pull
```

Be consistent with verb naming across object types. Don't have both "update"
and "upgrade" as subcommands -- disambiguate.

### Subcommand Consistency

- Use the same flag names for the same concepts across subcommands.
- Maintain consistent output formatting across subcommands.
- Support `--help` on every subcommand.
- Support `help <subcommand>` as an alias for `<subcommand> --help`.

### Avoid Ambiguous Shortcuts

Don't allow arbitrary abbreviations of subcommands. If `mycmd i` works as
`mycmd install`, you can never add `mycmd init`. Aliases are fine but they
must be explicit and documented.

### No Catch-All Subcommand

Don't make a default subcommand that runs when no subcommand matches. This
prevents you from ever adding new subcommands without breaking existing usage.

## Flag Design Patterns

### Flags vs Arguments

Prefer flags over positional arguments. Flags are self-documenting:

```sh
# Unclear: which is source, which is destination?
mycmd /path/a /path/b

# Clear:
mycmd --source /path/a --dest /path/b
```

Exception: primary action on a single target (e.g., `rm file.txt`).

### Boolean Flags

- `--flag` enables, `--no-flag` disables.
- Default should be the safe/common choice.
- Never require `--flag=true` or `--flag=false`.

### Secret Handling

Never accept secrets directly via flags (`--password=secret`) because:
- Values leak into `ps` output and shell history.
- Encourages insecure env var patterns.

Instead:
- Accept `--password-file /path/to/file`
- Read from stdin
- Use a credential helper or keyring integration

### Stdin Convention

If input or output is a file, support `-` to read from stdin or write to
stdout:

```sh
curl https://example.com/data.tar.gz | tar xvf -
```

### Order Independence

Make flags and subcommands order-independent where possible. Users commonly
add flags at the end by pressing up-arrow and appending.
