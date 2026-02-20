# Exit Codes

Detailed conventions for process exit codes and signal-related exit
behavior. Extends the behavioral rules in SKILL.md with full tables and
edge cases.

## Standard Exit Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `0` | Success | Operation completed successfully |
| `1` | General error | Catch-all for unspecified failures |
| `2` | Usage error | Invalid arguments, missing required flags |

These three codes cover the vast majority of CLI tools. Only define
additional codes when the caller (script, CI) needs to distinguish
specific failure modes.

## Extended Exit Codes

Some tools define richer exit code ranges. The most common convention
(used by `grep`, `diff`, `curl`, and many others):

| Range | Meaning |
|-------|---------|
| `0` | Success |
| `1` | General/operational error |
| `2` | Command-line usage error |
| `3-125` | Application-specific errors |
| `126` | Command found but not executable |
| `127` | Command not found |
| `128+N` | Terminated by signal N |

## Signal Exit Codes

When a process is killed by a signal, the conventional exit code is
`128 + signal_number`:

| Signal | Number | Exit Code | Meaning |
|--------|--------|-----------|---------|
| SIGHUP | 1 | 129 | Hangup |
| SIGINT | 2 | 130 | Interrupt (Ctrl-C) |
| SIGQUIT | 3 | 131 | Quit (Ctrl-\) |
| SIGABRT | 6 | 134 | Abort |
| SIGKILL | 9 | 137 | Kill (unblockable) |
| SIGTERM | 15 | 143 | Termination |

The shell sets `$?` to 128+N when a child is killed by signal N. If your
program catches a signal and exits cleanly, use the conventional exit code
to preserve the signal information for calling scripts.

## Design Guidelines

### Map exit codes to actionable failure modes:

```
0 = success
1 = runtime/operational error (network failure, file not found)
2 = usage error (bad arguments, missing required input)
```

### Document non-standard codes:

If your program uses codes beyond 0/1/2, document them in `--help` and
man pages.

### Exit code in scripts:

Scripts use `$?` or `set -e` to check exit codes. A program that returns
0 on partial failure will silently break pipelines.

### Partial success:

If a program operates on multiple items and some succeed while others fail,
choose a convention and document it:
- Return 0 if any succeeded (optimistic)
- Return 1 if any failed (pessimistic, usually safer)
- Return a specific code for partial failure

### Boolean commands:

Commands that answer a yes/no question (`test`, `grep`):
- `0` = true / match found
- `1` = false / no match
- `2` = error (couldn't perform the check)
