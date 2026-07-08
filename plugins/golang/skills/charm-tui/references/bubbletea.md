# Bubble Tea v2 — Core Framework Reference

Full API catalog for `charm.land/bubbletea/v2` (v2.0.x). Working-resolution rules live in SKILL.md — this reference
holds the complete View/option/command/message catalogs and lifecycle details.

## Model Interface and Program Lifecycle

```go
type Model interface {
    Init() Cmd                    // first command; nil is fine
    Update(Msg) (Model, Cmd)      // pure state transition
    View() View                   // returns tea.View struct, NOT string
}
```

`tea.Msg` is a type alias for `uv.Event` — bubbletea v2 is built on `github.com/charmbracelet/ultraviolet`; key and
mouse types are re-exports.

```go
p := tea.NewProgram(initialModel(), opts...)
finalModel, err := p.Run() // blocks until Quit/Kill/error
```

- **`p.Run()`** — blocks, returns the final model; the only way to start a program.
- **`p.Send(msg)`** — inject a message from outside the loop (goroutines, servers). Blocks until the program starts;
  safe no-op after exit.
- **`p.Quit()`** — graceful shutdown; renders the final model state once more.
- **`p.Kill()`** — immediate shutdown, skips the final render; `Run` returns `ErrProgramKilled`.
- **`p.Wait()`** — blocks until the program finishes.
- **`p.Println/Printf`** — print persistent lines above the UI (also as commands `tea.Println`/`tea.Printf`). Suppressed
  while AltScreen is active — use `tea.LogToFile` for debugging instead.

## The tea.View Struct

`View()` returns `tea.View`. Construct with `tea.NewView(content string)` or set `v.SetContent(s)`. Terminal features
are **declared on every render** — the View struct is the single source of truth; there are no toggle commands.

- **`Content`** — the rendered string (via `NewView`/`SetContent`)
- **`AltScreen`** — enter/leave the alternate screen buffer
- **`MouseMode`** — `tea.MouseModeNone` | `tea.MouseModeCellMotion` (clicks/release/wheel/drag) |
  `tea.MouseModeAllMotion` (adds motion without buttons)
- **`Cursor`** — `*tea.Cursor`; `nil` hides the cursor, non-nil shows it. `tea.NewCursor(x, y)` → block shape, blinking.
  Shapes: `CursorBlock`, `CursorUnderline`, `CursorBar`
- **`WindowTitle`** — sets the terminal window title
- **`ReportFocus`** — enables `FocusMsg`/`BlurMsg` delivery
- **`DisableBracketedPasteMode`** — opt out of bracketed paste
- **`BackgroundColor` / `ForegroundColor`** — set terminal default colors (`color.Color`)
- **`ProgressBar`** — `tea.NewProgressBar(state, value)` — native terminal/taskbar progress; states
  `ProgressBarNone/Default/Error/Indeterminate/Warning`
- **`KeyboardEnhancements`** — request Kitty-protocol features (see [Keyboard Input](#keyboard-input))
- **`OnMouse`** — `func(MouseMsg) Cmd` invoked by the renderer against last-rendered content; the sanctioned way to
  hit-test clicks without breaking unidirectional flow

Set View fields on **every** return path of `View()` — an early return that forgets `v.AltScreen = true` exits the alt
screen for that frame.

## Program Options

Terminal features (alt screen, mouse mode, focus reporting, bracketed paste, cursor, window title) are **View fields**,
not program options — options configure the program runtime only:

- **`tea.WithContext(ctx)`** — cancel the program via context
- **`tea.WithOutput(w)` / `tea.WithInput(r)`** — custom I/O; `WithInput(nil)` disables input entirely
- **`tea.WithEnvironment(env)`** — explicit environment (critical for SSH sessions, e.g. Wish)
- **`tea.WithFilter(func(Model, Msg) Msg)`** — intercept/veto messages; return `nil` to swallow (e.g. block `QuitMsg`
  for a confirm-exit dialog)
- **`tea.WithFPS(n)`** — max framerate (default 60, capped 120)
- **`tea.WithColorProfile(p)`** — force a color profile (testing)
- **`tea.WithWindowSize(w, h)`** — initial size (testing)
- **`tea.WithoutRenderer()`** — headless/daemon mode
- **`tea.WithoutSignalHandler()` / `tea.WithoutSignals()`** — signal handling control
- **`tea.WithoutCatchPanics()`** — disable built-in panic recovery

When stdin isn't a terminal, the program opens the TTY for input automatically — no option needed. Output optimization
is handled by the renderer automatically.

## Commands and Messages

`type Cmd func() Msg`. Commands run on separate goroutines — they must never mutate the model; they return data as a
`Msg`, and `Update` applies it.

- **`tea.Batch(cmds...)`** — run concurrently, **no ordering guarantee**; nil cmds filtered
- **`tea.Sequence(cmds...)`** — run in order
- **`tea.Tick(d, fn)`** — fires **once** after `d` from construction; re-return it from `Update` to loop
- **`tea.Every(d, fn)`** — fires **once**, aligned to system-clock boundaries (`Every(time.Minute)` fires at `:00`);
  re-return to loop

Message-returning functions passed **uninvoked** as commands (`return m, tea.Quit` — no parentheses):

- **`tea.Quit`** — graceful shutdown
- **`tea.Interrupt`** — abort; `Run` returns an error matching `errors.Is(err, tea.ErrInterrupted)`
- **`tea.Suspend`** — suspend the program (SIGTSTP); `ResumeMsg` arrives on foreground
- **`tea.RequestWindowSize`** — re-query size → `WindowSizeMsg`
- **`tea.ClearScreen`** — clear once
- **`tea.RequestBackgroundColor`** — → `BackgroundColorMsg` (has `.IsDark()`)
- **`tea.RequestForegroundColor` / `tea.RequestCursorColor`** — → corresponding color messages
- **`tea.RequestCursorPosition`** — → `CursorPositionMsg{X, Y}`
- **`tea.ReadClipboard`** — → `ClipboardMsg` (OSC52)
- **`tea.RequestTerminalVersion`** — → `TerminalVersionMsg`

Async work pattern: a plain `func() tea.Msg` **is** a `Cmd` — do the I/O inside, return a custom message type. Error
messages conventionally implement `error`:

```go
type errMsg struct{ err error }
func (e errMsg) Error() string { return e.err.Error() }

func fetchData(url string) tea.Cmd {
    return func() tea.Msg {
        resp, err := http.Get(url)
        if err != nil { return errMsg{err} }
        defer resp.Body.Close()
        return dataMsg{parse(resp.Body)}
    }
}
```

`WindowSizeMsg{Width, Height}` arrives once at startup and on every resize (never on Windows — no SIGWINCH; re-query
manually after suspecting a change).

## Keyboard Input

`tea.KeyMsg` is an **interface** covering presses and releases. Match `tea.KeyPressMsg` for normal input;
`tea.KeyReleaseMsg` exists on Kitty-protocol terminals.

Key struct fields:

- **`Code rune`** — the key: `'a'`, `tea.KeyEnter`, `tea.KeyTab`, `tea.KeyUp`, `tea.KeyF1`…
- **`Text string`** — printable text only; **empty for special keys and modifier combos**
- **`Mod KeyMod`** — modifier bitmask: `tea.ModCtrl/ModAlt/ModShift/ModMeta/ModHyper/ModSuper`; check with
  `msg.Mod.Contains(tea.ModAlt)`
- **`ShiftedCode` / `BaseCode`** — shifted key / US-layout key (Kitty only)
- **`IsRepeat`** — auto-repeat flag (Kitty / Windows Console only)

Matching idioms:

```go
case tea.KeyPressMsg:
    switch msg.String() {
    case "ctrl+c", "q":  return m, tea.Quit
    case "up", "k":      m.cursor--
    case "space":        m.toggle() // NOT " " — space is "space" in v2
    }
```

Field matching (foolproof): `msg.Code == 'c' && msg.Mod == tea.ModCtrl`. `msg.Keystroke()` is like `String()` but always
includes modifiers in fixed order (ctrl, alt, shift, meta, hyper, super).

With bubbles keymaps: `case key.Matches(msg, m.keys.Up):` — `key.Matches` from `charm.land/bubbles/v2/key` accepts
`tea.KeyPressMsg` directly.

Keyboard enhancements (Kitty protocol): request via View field, gate on the reply —

```go
// View():
v.KeyboardEnhancements.ReportEventTypes = true
// Update():
case tea.KeyboardEnhancementsMsg:
    m.supportsReleases = msg.SupportsEventTypes()
case tea.KeyReleaseMsg: // only arrives on supporting terminals
```

Helper methods on `KeyboardEnhancementsMsg`: `SupportsKeyDisambiguation()`, `SupportsEventTypes()`,
`SupportsAlternateKeys()`, `SupportsAllKeysAsEscapeCodes()`, `SupportsAssociatedText()`. Basic key disambiguation is
requested by default.

## Mouse Input

Enable via `v.MouseMode` in `View()`. `tea.MouseMsg` is an **interface**; concrete types:

- **`tea.MouseClickMsg`** — button press
- **`tea.MouseReleaseMsg`** — button release
- **`tea.MouseWheelMsg`** — scroll
- **`tea.MouseMotionMsg`** — movement (requires `MouseModeAllMotion` for button-less motion)

Each converts to the data struct via `msg.Mouse()` → `tea.Mouse{X, Y int; Button MouseButton; Mod KeyMod}` — zero-based,
(0,0) top-left. Buttons:
`tea.MouseLeft/MouseMiddle/MouseRight/MouseWheelUp/MouseWheelDown/ MouseWheelLeft/MouseWheelRight/MouseBackward/MouseForward`.

```go
case tea.MouseClickMsg:
    if msg.Button == tea.MouseLeft { m.clickAt(msg.X, msg.Y) }
case tea.MouseWheelMsg:
    m.scrollBy(msg.Mouse().Y)
```

In a Go type switch, `case tea.MouseMsg:` placed before the concrete types shadows them — order specific cases first.

## Paste, Focus, Clipboard

- **`tea.PasteMsg{Content}`** — bracketed paste content (paste never arrives as a key message)
- **`tea.PasteStartMsg` / `tea.PasteEndMsg`** — paste boundaries
- **`tea.FocusMsg` / `tea.BlurMsg`** — terminal focus; require `view.ReportFocus = true` and terminal support (tmux
  needs `set -g focus-events on`)
- **`tea.SetClipboard(s)` / `tea.ReadClipboard`** — OSC52 clipboard (works over SSH); `ClipboardMsg{Content}`;
  `SetPrimaryClipboard`/`ReadPrimaryClipboard` for X11/Wayland primary selection

## Terminal Queries

Request/response pairs — send the request command, handle the reply message:

- **`tea.RequestBackgroundColor`** → `tea.BackgroundColorMsg` — `.IsDark()` is the idiom for adaptive styling
- **`tea.RequestCapability("RGB")`** → `tea.CapabilityMsg`
- **`tea.RequestTerminalVersion`** → `tea.TerminalVersionMsg`
- **`tea.ColorProfileMsg`** — sent automatically at startup
- **`tea.EnvMsg`** — delivers the program environment (SSH sessions)
- **`tea.Raw(seq)`** — write raw escape sequences (last resort)

## External Processes and Suspend

```go
// Release the terminal, run an interactive process, resume with a message:
return m, tea.ExecProcess(exec.Command("vim", path), func(err error) tea.Msg {
    return editorFinishedMsg{err}
})
```

- **`tea.Exec(ExecCommand, fn)`** — generic form for non-`exec.Cmd` processes
- **`p.ReleaseTerminal()` / `p.RestoreTerminal()`** — manual control from outside the loop
- **`tea.Suspend`** — suspend to shell; `SuspendMsg` then `ResumeMsg` on fg. **ctrl+z is not automatic** — raw mode
  delivers it as `KeyPressMsg` `"ctrl+z"`; map it to `tea.Suspend` yourself
- Field-reported regression: child processes needing the TTY (editors, lazygit) may fail with `/dev/tty` errors on macOS
  unless `cmd.Stdin = os.Stdin` is set explicitly

## Errors, Panics, Logging

- Panic recovery is on by default, including inside command goroutines: terminal restored, stack to stderr, `Run`
  returns an error wrapping `ErrProgramKilled` and `ErrProgramPanic`. `TEA_DEBUG=true` also writes a panic log file.
- Check errors with `errors.Is` — `Run` wraps: an interrupt surfaces as `ErrProgramKilled` wrapping `ErrInterrupted`.
  Exit-130 idiom: `if errors.Is(err, tea.ErrInterrupted) { os.Exit(130) }`.
- **`tea.LogToFile(path, prefix)`** — redirect stdlib `log` to a file (the TUI owns stdout); caller defers `f.Close()`.
  `TEA_TRACE=<path>` enables internal I/O tracing.

## Gotchas

- Some doc comments inside the v2 source still show the beta-era `Init() (Model, Cmd)` signature — it does not compile
  against v2.0.x. The released interface is `Init() Cmd`.
- `case " ":` compiles but never matches — space is `"space"` in `String()` (`.Text` is still `" "`).
- `case tea.KeyMsg:` fires on both press and release on Kitty terminals — handlers run twice per keystroke. Use
  `tea.KeyPressMsg`.
- ctrl+c does not quit automatically — raw mode delivers it as a key press. Always handle it (or install a `WithFilter`
  guard); otherwise users cannot interrupt.
- `tea.Tick`/`tea.Every` fire once; forgetting to re-return them stops the timer after one tick. Their timers start at
  command construction, not execution.
- `Key.Text` is empty for enter/tab/special keys — check `msg.Code` or `msg.String()`, not `Text`.
- `tea.Println`/`tea.Printf` are invisible while AltScreen is active — use `tea.LogToFile`.
- `View()` runs after every Update and on the FPS ticker — keep it pure and fast; no I/O.
- Gate Kitty features (`KeyReleaseMsg`, `IsRepeat`, `ShiftedCode`) on `KeyboardEnhancementsMsg` — never assume releases
  arrive.
- No resize events on Windows; re-request via `tea.RequestWindowSize` after events that may have changed the size.
