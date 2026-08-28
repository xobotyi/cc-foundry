# Charm CLI Entry, Logging, and the Rendering Layer

The supporting libraries around bubbletea/bubbles/lipgloss: fang (CLI entry), log, ultraviolet, and the `x/` utility
packages.

## Fang — CLI Entry Point

`charm.land/fang/v2` wraps a cobra root command with styled help and errors, an automatic `--version`, a hidden `man`
command, shell completions, and signal handling:

```go
func main() {
    cmd := &cobra.Command{Use: "app"}
    if err := fang.Execute(context.Background(), cmd,
        fang.WithVersion(version),
        fang.WithNotifySignal(os.Interrupt),
    ); err != nil {
        os.Exit(1) // fang already printed the styled error — never re-print
    }
}
```

- Options: `WithVersion`/`WithCommit`/`WithoutVersion`, `WithoutManpage`, `WithoutCompletions`,
  `WithErrorHandler(func(w io.Writer, styles fang.Styles, err error))`, `WithNotifySignal(...os.Signal)`,
  `WithTheme(fang.ColorScheme)`, `WithColorSchemeFunc(func(lipgloss.LightDarkFunc) fang.ColorScheme)` — the scheme
  adapts to the terminal background through the passed light/dark picker.
- Built-in schemes: `fang.DefaultColorScheme` and `fang.AnsiColorScheme`, both
  `func(lipgloss.LightDarkFunc) ColorScheme`.
- Fang sets `SilenceUsage` and `SilenceErrors`, overrides the help func, and assigns the `Version` field on the root
  command — a custom help template does not survive. It generates one manpage for the root, not a per-subcommand tree.
  Needing either is the trigger to use plain cobra instead.
- Version auto-detection reads `debug.ReadBuildInfo()` and only produces a real version for `go install` builds. Inject
  it via ldflags and pass `fang.WithVersion` for release binaries; otherwise the version reads
  `unknown (built from source)`.

## Log — Structured Logging

`charm.land/log/v2` is a leveled, styled key/value logger: `log.Info(msg, keyvals...)`, `log.New(w)`,
`log.NewWithOptions(w, log.Options{ReportTimestamp: true, Level: log.DebugLevel, Prefix: "app"})`.

- Sub-loggers: `logger.With("k", v)`, `logger.WithPrefix(s)`. Context: `log.WithContext(ctx, logger)` and
  `log.FromContext(ctx)`.
- `*Logger` implements `slog.Handler`, so `slog.SetDefault(slog.New(logger))` works directly. `logger.StandardLog(...)`
  yields a stdlib `*log.Logger` for APIs such as `http.Server.ErrorLog`.
- Formatters: `TextFormatter` (default), `JSONFormatter`, `LogfmtFormatter`. The writer is a `colorprofile.Writer`, so
  styling is stripped for a non-TTY destination.
- **Never log to the terminal a running TUI owns.** Route logs to a file — `tea.LogToFile(path, prefix)` redirects the
  stdlib logger, or attach an slog file handler.
- `log.Fatal` and `log.Fatalf` call `os.Exit(1)`, so deferred cleanup — terminal restore included — never runs. Keep
  them out of TUI code paths.

## Ultraviolet — the Rendering Layer

`github.com/charmbracelet/ultraviolet` is the cell-buffer, diff-renderer, and input-decoding layer under bubbletea v2
(`tea.Msg` is an alias for `uv.Event`). It is pre-1.0 and carries an explicit API-instability warning — never upgrade it
independently of bubbletea, because the transitive pin is the correct one.

Applications use it indirectly, with one sanctioned direct use: a full-screen application drawing into `uv.ScreenBuffer`
sub-regions.

- `uv.NewScreenBuffer(w, h)` returns a `ScreenBuffer` **value** that satisfies both `uv.Screen` and `uv.Drawable`; it
  embeds `*RenderBuffer` and through it `*Buffer`, which supplies `Bounds()`, `Render()`, `Clear()`, and `Draw()`.
- `uv/screen` holds the whole-surface helpers: `screen.Clear(scr)`, `screen.ClearArea(scr, area)`,
  `screen.Fill(scr, cell)`, `screen.Clone(scr)`.
- `uv/layout` provides constraint-based rect splitting. Constraints are `layout.Len`, `layout.Fill`, `layout.Min`,
  `layout.Max`, `layout.Percent`, and `layout.Ratio`; `Split(area)` returns a `Splitted` slice whose `Assign(...)`
  writes into `*uv.Rectangle` targets.
- `uv.Rectangle` is an alias for `image.Rectangle`.

## x/ Utility Packages

- **`x/ansi`** — mandatory for string math over styled text: `ansi.StringWidth(s)`, `ansi.Truncate(s, length, tail)`,
  `ansi.Cut(s, left, right)`, `ansi.Strip(s)`. `len()` and byte slicing corrupt escape sequences.
- **`x/term`** — `term.IsTerminal(fd)`, the `term.File` interface that `lipgloss.HasDarkBackground` takes.
- **`x/editor`** — `editor.Command(...)` builds the `exec.Cmd` for `$EDITOR`; run it through `tea.ExecProcess`.
- **`x/exp/charmtone`** — the Charm brand palette as named `color.Color` values.
- **`x/exp/golden`**, **`x/exp/teatest/v2`** — testing.
