# Charm Ecosystem and Testing

The supporting libraries around bubbletea/bubbles/lipgloss — fang (CLI entry), log, ultraviolet, the `x/` packages — and
how charm TUIs are tested.

## Import-Path Map

The single most common resolution failure — half the ecosystem is on the vanity domain, half is not:

- **`charm.land/*/v2`** — bubbletea, bubbles, lipgloss, huh, glamour, fang, log, wish
- **`github.com/charmbracelet/...`** — ultraviolet, colorprofile, and all `x/` packages (`x/ansi`, `x/term`, `x/editor`,
  `x/exp/golden`, `x/exp/teatest/v2`, `x/exp/charmtone`)

Writing `charm.land/x/ansi` or `charm.land/ultraviolet` fails to resolve. A build error "module declares its path as
`charm.land/...` but was required as `github.com/charmbracelet/...`" means a stale import — fix imports, then
`go mod tidy`.

## Fang — CLI Entry Point

`charm.land/fang/v2` wraps a cobra root command with styled help/errors, automatic `--version`, a hidden `man` command,
shell completions, and signal handling:

```go
func main() {
    cmd := &cobra.Command{Use: "app", ...}
    if err := fang.Execute(context.Background(), cmd,
        fang.WithVersion(version),
        fang.WithNotifySignal(os.Interrupt),
    ); err != nil {
        os.Exit(1) // fang already printed the styled error — never re-print
    }
}
```

- Options: `WithVersion/WithCommit/WithoutVersion`, `WithoutManpage`, `WithoutCompletions`,
  `WithErrorHandler(func(w, styles, err))`, `WithNotifySignal(...os.Signal)`,
  `WithColorSchemeFunc(func(lipgloss.LightDarkFunc) fang.ColorScheme)` — the scheme adapts to the terminal background
  via the passed light/dark picker.
- Fang sets `SilenceUsage`/`SilenceErrors` and overrides the help func and `Version` field on your root — custom help
  templates won't survive. It generates one manpage, not a per-subcommand tree. Needing either is the trigger to use
  plain cobra instead.
- Version auto-detection works only for `go install` builds; for release binaries inject via ldflags and pass
  `fang.WithVersion`.

## Log — Structured Logging

`charm.land/log/v2` — leveled, styled key/value logger; API: `log.Info(msg, keyvals...)`, `log.New(w)`,
`log.NewWithOptions(w, log.Options{ReportTimestamp: true, Level: log.DebugLevel, Prefix: "app"})`.

- Sub-loggers: `logger.With("k", v)`, `logger.WithPrefix(s)`; context: `log.WithContext`/`log.FromContext`.
- `*Logger` implements `slog.Handler` — `slog.SetDefault(slog.New(logger))` works directly; `logger.StandardLog(...)`
  yields a stdlib `*log.Logger` for APIs like `http.Server.ErrorLog`.
- Formatters: `TextFormatter` (default; styling auto-disables off-TTY), `JSONFormatter`, `LogfmtFormatter`.
- **Never log to the terminal a running TUI owns.** Route logs to a file (`tea.LogToFile` or an slog file handler);
  attach TTY-styled handlers only to writers that are actually terminals.
- `log.Fatal` calls `os.Exit(1)` — deferred cleanup (including terminal restore) never runs; avoid inside TUI code
  paths.

## Ultraviolet — the Rendering Layer

`github.com/charmbracelet/ultraviolet` is the cell-buffer, diff-renderer, and input-decoding layer under bubbletea v2
(`tea.Msg` = `uv.Event`). It is pre-1.0 with an explicit API-instability warning — don't hand-upgrade it independently
of bubbletea; the transitive pin is correct.

Apps use it indirectly, with one sanctioned direct use: full-screen apps drawing into `uv.ScreenBuffer` sub-regions (the
crush hybrid-rendering pattern — see the architecture reference). Its `layout` package provides constraint-based rect
splitting (`layout.Vertical(layout.Len(3), layout.Fill(1)).Split(area)`).

## x/ Utility Packages

- **`x/ansi`** — mandatory for any string math on styled text: `ansi.StringWidth` (display width), `ansi.Truncate` (clip
  with ellipsis), `ansi.Cut`, `ansi.Strip`. `len()` or byte slicing corrupts escape sequences.
- **`x/term`** — `term.IsTerminal(fd)`, `term.File` interface.
- **`x/editor`** — `editor.Command(...)` builds the `exec.Cmd` for `$EDITOR`; run it via `tea.ExecProcess`.
- **`x/exp/charmtone`** — the Charm brand palette (named `color.Color` values).
- **`x/exp/golden`**, **`x/exp/teatest/v2`** — testing (below).

## Testing

### Golden View Tests — the Primary Idiom

Render the component directly and compare against a committed golden file. This is how bubbles and crush are tested —
crush has zero teatest usage even at production scale:

```go
func TestTableRender(t *testing.T) {
    m := newTestTable()
    got := ansi.Strip(m.View()) // stripping optional but makes goldens diff-friendly
    golden.RequireEqual(t, []byte(got))
}
```

- `golden.RequireEqual` (from `github.com/charmbracelet/x/exp/golden`) compares against `testdata/<TestName>.golden`;
  regenerate with `go test -update ./...`. First run needs `-update`; goldens are committed.
- The golden path derives from `tb.Name()` — renaming a test orphans its golden. Use `t.Run` subtests for one golden per
  case.
- Unit-test component structs directly — the single-model/imperative-children architecture makes them testable without a
  `tea.Program`.

### teatest v2 — Full-Program Integration

For end-to-end flows, use `github.com/charmbracelet/x/exp/teatest/v2` (the `/v2` module targets
`charm.land/bubbletea/v2`; the non-v2 teatest doesn't compile against it):

```go
tm := teatest.NewTestModel(t, m,
    teatest.WithInitialTermSize(70, 30),
    teatest.WithProgramOptions(tea.WithColorProfile(colorprofile.Ascii)), // deterministic output
)
tm.Type("hello")
tm.Send(tea.KeyPressMsg{Code: tea.KeyEnter})
teatest.WaitFor(t, tm.Output(),
    func(b []byte) bool { return bytes.Contains(b, []byte("done")) },
    teatest.WithDuration(5*time.Second),
)
out, _ := io.ReadAll(tm.FinalOutput(t))
teatest.RequireEqualOutput(t, out) // golden comparison of final frame
final := tm.FinalModel(t).(model)
```

- **Always pin the color profile** (`tea.WithColorProfile(colorprofile.Ascii)`) — the v2 renderer emits escape sequences
  even into non-TTY test buffers, breaking substring assertions otherwise.
- `tea.WithWindowSize(w, h)` and `tea.WithColorProfile` exist specifically to make programs testable.
- Default to golden View tests; reserve teatest for flows that genuinely need the event loop (async commands, multi-step
  interactions).

### Agent-Driven Verification

To see a TUI actually running, drive it in tmux and capture rendered frames: `tmux new-session -d`, send keys, then
`tmux capture-pane -p` — the captured ASCII is assertable output.
