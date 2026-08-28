# Testing Charm TUIs

Two harnesses cover the whole surface: golden View tests for rendering, and teatest for a flow that needs the event
loop.

## Golden View Tests — the Primary Idiom

Render the component directly and compare against a committed golden file. This is how bubbles itself is tested, and how
the stack authors test a production TUI:

```go
func TestTableRender(t *testing.T) {
    m := newTestTable()
    golden.RequireEqual(t, ansi.Strip(m.View()))
}
```

- `golden.RequireEqual` comes from `github.com/charmbracelet/x/exp/golden` and is generic over `[]byte | string`, so a
  rendered string needs no conversion.
- It compares against `testdata/<TestName>.golden` and escapes control sequences on both sides before diffing.
  Regenerate with `go test -update ./...`; the first run needs `-update`, and the golden file is committed.
- `ansi.Strip` is optional and makes the golden diff-friendly. Keep the escape sequences where the test is about color.
- A bubbles component's `View()` returns a `string`. A `tea.Model`'s `View()` returns a `tea.View`, so compare
  `m.View().Content`.
- The golden path derives from `tb.Name()`, so renaming a test orphans its golden file. Use `t.Run` subtests to get one
  golden per case.
- Unit-test component structs directly. The single-model architecture with imperative children makes every component
  testable without a `tea.Program`.

## teatest v2 — Full-Program Integration

For an end-to-end flow, use `github.com/charmbracelet/x/exp/teatest/v2`. The `/v2` module targets
`charm.land/bubbletea/v2`; the non-`/v2` teatest does not compile against it.

```go
tm := teatest.NewTestModel(t, m,
    teatest.WithInitialTermSize(70, 30),
    teatest.WithProgramOptions(tea.WithColorProfile(colorprofile.ASCII)), // deterministic output
)
tm.Type("hello")
tm.Send(tea.KeyPressMsg{Code: tea.KeyEnter})
teatest.WaitFor(t, tm.Output(),
    func(b []byte) bool { return bytes.Contains(b, []byte("done")) },
    teatest.WithDuration(5*time.Second),
)
out, _ := io.ReadAll(tm.FinalOutput(t))
teatest.RequireEqualOutput(t, out) // golden comparison of the final frame
final := tm.FinalModel(t).(model)
```

- **Always pin the color profile.** The v2 renderer emits escape sequences even into a non-TTY test buffer, which breaks
  every substring assertion. `colorprofile.ASCII` is the canonical constant; `colorprofile.Ascii` is a back-compat alias
  for it.
- `tea.WithWindowSize(w, h)` and `tea.WithColorProfile(p)` exist specifically to make a program testable.
- Default to golden View tests and reserve teatest for a flow that genuinely needs the loop — async commands, multi-step
  interaction.

## Watching a TUI Run

To see the rendered frames of a real binary, drive it under tmux: `tmux new-session -d`, send keys, then
`tmux capture-pane -p`. The captured plain text is assertable output.
