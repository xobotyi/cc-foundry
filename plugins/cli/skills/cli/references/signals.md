# Signal Handling

Detailed conventions for Unix signal handling, graceful shutdown, and
cleanup behavior. Extends the behavioral rules in SKILL.md with full
signal tables and implementation patterns.

## Common Signals

| Signal | Number | Default Action | Purpose |
|--------|--------|----------------|---------|
| `SIGHUP` | 1 | Terminate | Terminal hangup / config reload |
| `SIGINT` | 2 | Terminate | Interrupt from keyboard (Ctrl-C) |
| `SIGQUIT` | 3 | Core dump | Quit from keyboard (Ctrl-\) |
| `SIGABRT` | 6 | Core dump | Abort signal (from `abort()`) |
| `SIGKILL` | 9 | Terminate | Unblockable kill |
| `SIGPIPE` | 13 | Terminate | Broken pipe (write to closed pipe) |
| `SIGTERM` | 15 | Terminate | Polite termination request |
| `SIGTSTP` | 20 | Stop | Terminal stop (Ctrl-Z) |
| `SIGCONT` | 18 | Continue | Resume after stop |
| `SIGUSR1` | 10 | Terminate | User-defined |
| `SIGUSR2` | 12 | Terminate | User-defined |
| `SIGWINCH` | 28 | Ignore | Terminal window size change |

## SIGINT (Ctrl-C)

The most important signal to handle correctly:

1. **Respond immediately.** Print a message ("Shutting down...") before
   starting cleanup.
2. **Cleanup with a timeout.** Don't let cleanup hang forever. Set a
   deadline (e.g., 5 seconds).
3. **Second Ctrl-C skips cleanup.** Tell the user what the second press
   will do:
   ```
   ^C Gracefully stopping... (press Ctrl+C again to force)
   ```
4. **Exit with code 130** (128 + 2) to preserve signal information for
   calling scripts.

### Implementation Pattern

```
on SIGINT:
    if first_interrupt:
        print "Shutting down... (Ctrl+C again to force)"
        start cleanup with timeout
        set first_interrupt = false
    else:
        exit immediately (code 130)
```

## SIGTERM

Polite termination request, typically from `kill` or process managers:

1. Handle identically to SIGINT (graceful shutdown + cleanup).
2. Exit with code 143 (128 + 15).
3. Process managers (systemd, Docker, Kubernetes) send SIGTERM first,
   then SIGKILL after a timeout. Complete cleanup within that window.

## SIGPIPE

Sent when writing to a pipe whose read end is closed (e.g., when the
user pipes your output to `head`):

1. **Don't print an error.** The user intentionally closed the pipe.
2. **Exit cleanly.** Most languages handle this automatically, but
   some (Python, Go) need explicit handling.
3. Exit with code 141 (128 + 13) or 0.

### Language-Specific Notes

- **Python:** `BrokenPipeError` -- catch and exit quietly.
- **Go:** Ignore `SIGPIPE` for stdout; write errors return `EPIPE`.
- **Rust:** Default handler already exits quietly.
- **Node.js:** `process.stdout.on('error', ...)` for `EPIPE`.

## SIGHUP

Historically means the terminal hung up. Modern usage:

- **Daemons:** Reload configuration (conventional for long-running services).
- **CLI tools:** Treat as termination (same as SIGTERM).

## SIGWINCH

Terminal window resized:

- If your output depends on terminal width (tables, progress bars),
  re-read `COLUMNS` and `LINES` on SIGWINCH.
- Most TUI frameworks handle this automatically.

## Crash-Only Design

Design your program so it can be killed at any point and recover on
next run:

1. Use atomic file operations (write to temp, rename).
2. Use write-ahead logs or journals for multi-step operations.
3. Check for incomplete state on startup and recover.
4. Defer non-critical cleanup to the next run.
5. Avoid cleanup that must complete for correctness.

This makes your program both more robust and more responsive -- it can
exit immediately on any signal.

## Child Process Signals

When your program spawns child processes:

1. Forward SIGINT and SIGTERM to child process groups.
2. Wait for children to exit before exiting yourself.
3. Set a timeout: if children don't exit, send SIGKILL.
4. Report which children were killed if relevant.

## Exit Code After Signal

When exiting due to a signal, use exit code `128 + signal_number`:

```
SIGINT (2)  -> exit 130
SIGTERM (15) -> exit 143
SIGPIPE (13) -> exit 141
```

This lets calling scripts distinguish "user cancelled" from "error."
