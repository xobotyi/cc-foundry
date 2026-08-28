---
name: charm-tui
description: >-
  Write and review Charmbracelet v2 terminal UIs in Go: Bubble Tea programs, Bubbles components, Lip Gloss styling and
  layout, Huh forms, Glamour markdown, fang CLI entry, and TUI testing.
when_to_use: >-
  Invoke whenever a Go terminal UI is touched at all — writing, reviewing, refactoring, or debugging a Bubble Tea
  program, a Bubbles component, Lip Gloss styling, a Huh form, or a fang command. Also invoke on the symptoms: a model
  with `View() string` does not satisfy `tea.Model`, an import resolves to v1, a key case never matches, a component
  ignores every keystroke, colors come out wrong on a light terminal, a layout overflows by the border width, or a
  spinner freezes after one frame. Covers the Charm v2 stack; Go language conventions belong to the golang skill, and
  language-agnostic workflow to the coding skill.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

The Charm v2 stack is a different library from v1 behind the same names. Three biases decide most calls:

- **The module source outranks a remembered API shape.** Training data is saturated with v1, and a v1 idiom either fails
  to compile against v2 or misbehaves silently. Read `go.mod`, then the module itself, before reaching for a signature.
- **The View declares the terminal.** Every terminal feature is a field set on every render, never a program option and
  never a command.
- **`Update` is the only place state changes.** A command does its work on another goroutine and returns a message;
  `Update` applies it.

## Modules

- **`charm.land/<name>/v2`** — bubbletea, bubbles, lipgloss, huh, glamour, fang, log, wish.
- **`github.com/charmbracelet/...`** — ultraviolet, colorprofile, and every `x/...` package (`x/ansi`, `x/term`,
  `x/editor`, `x/exp/golden`, `x/exp/teatest/v2`, `x/exp/charmtone`).
- **`github.com/charmbracelet/bubbletea` and its siblings resolve to v1** — never import them. `charm.land/x/ansi` and
  `charm.land/ultraviolet` do not resolve at all.
- **The build error `module declares its path as charm.land/... but was required as github.com/charmbracelet/...` names
  a stale import.** Fix the import, then run `go mod tidy`.

## The Program

- **`View()` returns `tea.View`, a struct.** Build it with `tea.NewView(content)`. The interface is `Init() Cmd`,
  `Update(Msg) (Model, Cmd)`, `View() View`.
- **Terminal features are `tea.View` fields** — `AltScreen`, `MouseMode`, `Cursor`, `WindowTitle`, `ReportFocus`,
  `DisableBracketedPasteMode`, `BackgroundColor`, `ForegroundColor`, `ProgressBar`, `KeyboardEnhancements`, `OnMouse`.
  No `tea.WithAltScreen()` option and no `tea.EnterAltScreen` command exists.
- **Set every field on every return path of `View()`.** An early return that omits `v.AltScreen = true` leaves the
  alternate screen for that frame.
- **Doc comments inside the v2.0.x source still show the beta signature `Init() (Model, Cmd)`** — that form does not
  compile. `Init` returns one value.
- **`View()` runs after every `Update` and on the frame ticker.** Keep it free of I/O.
- **Handle ctrl+c explicitly.** Raw mode delivers it as an ordinary key press, and nothing quits the program without a
  `tea.Quit`.

Read [`${CLAUDE_SKILL_DIR}/references/bubbletea.md`] when a program option, a terminal query, an external process, or a
Kitty keyboard feature is needed — it carries the full View field catalog, the program-option set, every
request/response message pair, the exec and suspend API, and the panic and error contract.

## Commands and Messages

- **Never mutate the model from a `tea.Cmd`.** A command runs on its own goroutine — do the I/O there, return a typed
  message, and apply it in `Update`.
- **Pass a message-returning function uninvoked**: `return m, tea.Quit`, never `tea.Quit()`. The same holds for
  `tea.Suspend`, `tea.Interrupt`, `tea.ClearScreen`, `tea.RequestWindowSize`, and `tea.RequestBackgroundColor`.
  Constructors that take arguments are called: `tea.Tick(d, fn)`, `tea.Println(s)`, `tea.ExecProcess(cmd, fn)`.
- **`tea.Batch` runs its commands concurrently with no ordering guarantee; `tea.Sequence` runs them in order.**
- **`tea.Tick` and `tea.Every` fire once.** Re-return the command from `Update` on every tick to keep a timer alive.
  Both start their timer when the command is constructed, not when it runs.
- **Inject an external event with `p.Send(msg)`** from any goroutine.
- **`tea.Println` and `tea.Printf` produce nothing visible while `AltScreen` is set.** Debug through
  `tea.LogToFile(path, prefix)`.

## Input

- **Match `tea.KeyPressMsg`.** `tea.KeyMsg` is an interface covering presses and releases, so a `case tea.KeyMsg` runs
  the handler twice per keystroke on a Kitty-protocol terminal.
- **`msg.String()` names the space bar `"space"`.** `case " ":` compiles and never matches.
- **`Key.Text` is empty for `enter`, `tab`, the function keys, and every modifier combination.** Match on `msg.String()`
  or on `msg.Code`.
- **Declare bindings as `key.Binding` values** from `charm.land/bubbles/v2/key` and match with `key.Matches(msg, b)`,
  which is generic over `fmt.Stringer` and accepts a `tea.KeyPressMsg` directly. A binding's key names must equal the
  `String()` names exactly: `"space"`, `"pgup"`, `"ctrl+left"`.
- **Gate every Kitty feature on `tea.KeyboardEnhancementsMsg`** — `tea.KeyReleaseMsg`, `Key.IsRepeat`, and
  `Key.ShiftedCode` arrive only where the terminal reports support.
- **Enable the mouse through `v.MouseMode` and match the concrete message types** — `tea.MouseClickMsg`,
  `tea.MouseWheelMsg`, `tea.MouseMotionMsg`. A `case tea.MouseMsg` placed ahead of them shadows all three.
- **Paste arrives as `tea.PasteMsg`**, never as a key message.

## Styling

- **`lipgloss.Style` is a value and every setter returns a copy.** Build a style once and derive variants by assignment.
- **v2 has no `AdaptiveColor` and performs no light/dark detection.** Return `tea.RequestBackgroundColor` from `Init`,
  read `msg.IsDark()` off `tea.BackgroundColorMsg`, and build every color through `lipgloss.LightDark(isDark)`.
- **Hold every style in one semantic struct built from `isDark`** and thread it to the components. A color literal in
  render code is a defect.
- **`lipgloss.Color` never reports an error.** A malformed string yields `NoColor{}`, and an integer of 256 or more is
  reinterpreted as a 24-bit RGB value — `lipgloss.Color("999")` renders as RGB(0, 3, 231).
- **Measure with `lipgloss.Width` and `lipgloss.Height`; constrain with `Style.Width` and `Style.Height`.** `len()` over
  styled text counts escape bytes.
- **Cut styled text with `ansi.Truncate`, `ansi.Cut`, and `ansi.StringWidth`** from `github.com/charmbracelet/x/ansi`.
  Byte slicing corrupts escape sequences.
- **Never reach for the `compat` sub-package.** Its `AdaptiveColor` and `CompleteColor` query the terminal at import
  time through package-level variables, which competes with Bubble Tea for stdin and fails over SSH.

Read [`${CLAUDE_SKILL_DIR}/references/lipgloss.md`] when compositing layers, hit-testing a click, building a gradient,
or rendering a static table, tree, or list — it carries the Style API, the color system, the border set, the layer
compositor, the sub-packages, and the standalone output writers.

## Layout

- **Subtract the frame before rendering content**: `contentW := termW - style.GetHorizontalFrameSize()`. A bordered
  panel costs two cells per axis.
- **Size children from `tea.WindowSizeMsg`**, which arrives at startup and on every resize. Windows delivers no resize
  event — re-query with `tea.RequestWindowSize` after an event that may have changed the size.
- **`lipgloss.Place` never truncates.** Content larger than the box makes the call a no-op, so clamp with `MaxWidth` or
  `MaxHeight` first.
- **`lipgloss.JoinHorizontal` pads shorter blocks with unstyled spaces.** Set `Width` and `Height` on each block first
  where the background must stay continuous.
- **Size panels as a proportion of the terminal**, never as fixed cell counts.
- **Truncate explicitly rather than relying on wrapping inside a fixed-size panel.** Emoji and some CJK glyphs occupy
  one or two cells depending on the terminal, so keep variation-selector emoji out of width-critical chrome.

## Components

- **Every bubble is a value-type model — reassign the result**: `m.table, cmd = m.table.Update(msg)`. `Update` returns
  the concrete type, so no assertion is needed.
- **Never drop the `tea.Cmd` a component returns.** `Focus()` on textinput and textarea, `SetItems` on list,
  `SetPercent` on progress, and `Tick` on spinner each return the command that starts blinking, filtering, animation, or
  ticking.
- **`table.Focus()` and `table.Blur()` return nothing.** Focus a table with `table.WithFocused(true)` or `Focus()` — an
  unfocused table and an unfocused textinput ignore every message, which is what a dead component almost always is.
- **Construct through `New()`, never as a struct literal.** spinner, timer, stopwatch, and progress messages carry an
  instance ID, and a zero ID collides.
- **Every `New()` hardcodes dark styles.** Apply `DefaultStyles(isDark)` after background detection — help, list,
  textarea, and textinput take `isDark`; `table.DefaultStyles()` and `filepicker.DefaultStyles()` take no argument.
- **Constructor shapes differ.** `viewport.New(viewport.WithWidth(w), viewport.WithHeight(h))` takes options and renders
  nothing at zero size; `list.New(items, delegate, width, height)` takes its size positionally.
- **`table.Column.Width` is a fixed int.** Compute column widths from the terminal width.

Read [`${CLAUDE_SKILL_DIR}/references/bubbles.md`] when wiring a specific component — it carries the per-component API
for textinput, textarea, viewport, table, list, spinner, progress, timer, stopwatch, filepicker, paginator, help, and
key, plus the real-terminal-cursor wiring.

## Forms and Markdown

- **Reach for Huh for any prompt or form flow** rather than hand-building fields. Bind each result with `.Value(&v)`,
  and read a keyed value only after `form.State == huh.StateCompleted`.
- **Set a theme with `form.WithTheme(huh.ThemeFunc(huh.ThemeCharm))`.** `huh.ThemeCharm(isDark)` returns `*huh.Styles`,
  which does not satisfy `huh.Theme` — huh's own upgrade guide shows that call, and it does not compile.
- **Embedding a form takes two adaptations**: `form.Update` returns `(huh.Model, tea.Cmd)`, so type-assert back to
  `*huh.Form`; `form.View()` returns a `string`, so wrap it in `tea.NewView`.
- **A standalone form writes to stderr.** `WithProgramOptions` replaces the whole option slice and drops that default.
- **Wire `form.WithAccessible(...)` in every real application.** Accessible mode is the only path for screen-reader
  users, and `TERM=dumb` enables it on its own.
- **`huh.ErrUserAborted` is the ctrl+c error from `form.Run()`.** Exit 130 on that error.
- **Glamour v2 detects nothing.** Pass the style name explicitly and derive `"light"` or `"dark"` from
  `tea.BackgroundColorMsg.IsDark()`.
- **Match `glamour.WithWordWrap(n)` to the content width and rebuild the renderer on every `tea.WindowSizeMsg`.** A
  renderer does not react to a resize.
- **`glamour.WithStylePath` resolves a builtin style name first and falls back to reading the argument as a JSON file**,
  so a misspelled style name surfaces as a file-read error.

Read [`${CLAUDE_SKILL_DIR}/references/forms-and-markdown.md`] when building a form or rendering markdown — it carries
every Huh field type with its builders, the dynamic-form binding rules, themes, layouts, accessible mode, and the
Glamour option set.

## Architecture

- **One screen and a few components — compose in the standard Elm shape.** The root model owns the bubbles models,
  forwards messages to them, and joins their view strings.
- **Multiple screens, dialogs, streaming, or long scrollback — keep exactly one `tea.Model`.** Sub-components become
  plain structs with imperative methods that the root calls: `Render(width int) string` and mutators returning
  `tea.Cmd`. Never nest models; community tutorials teaching nested-model trees contradict the stack authors' own
  production practice.
- **One `switch msg.(type)` routes everything.** Focus state decides key routing, and dialogs draw last and take input
  first.

Read [`${CLAUDE_SKILL_DIR}/references/architecture.md`] when the application outgrows a handful of components — it
carries the single-model contract, hybrid rendering into ultraviolet buffers, the dialog overlay stack, virtualized
lists with render caching, and the async and streaming patterns.

## CLI Entry and Logging

- **`fang.Execute(ctx, rootCmd, opts...)` wraps a cobra root** with styled help and errors, `--version`, a hidden `man`
  command, completions, and signal handling. It prints the styled error itself — exit on the returned error without
  printing it again.
- **Never write a log line to the terminal a running TUI owns.** Route logs to a file.
- **`log.Fatal` calls `os.Exit(1)`**, so no deferred cleanup runs and the terminal is never restored. Keep it out of TUI
  code paths.

Read [`${CLAUDE_SKILL_DIR}/references/cli-and-logging.md`] when wiring a CLI entry point, configuring the logger, or
drawing into an ultraviolet buffer — it carries the fang option set and its limits, the log API and its slog bridge, and
the ultraviolet and `x/` package inventory.

## Testing

- **Default to golden View tests.** Render the component and compare with `golden.RequireEqual(t, ansi.Strip(m.View()))`
  from `github.com/charmbracelet/x/exp/golden`; regenerate with `go test -update ./...` and commit the result. A bubbles
  component's `View()` returns a `string`; a `tea.Model`'s returns a `tea.View`, so pass `m.View().Content`.
- **The golden path derives from `tb.Name()`.** Use one `t.Run` subtest per golden file, and expect a rename to orphan
  its golden.
- **Reserve `github.com/charmbracelet/x/exp/teatest/v2` for flows that need the event loop.** The non-`/v2` teatest does
  not compile against bubbletea v2.
- **Pin `tea.WithColorProfile(colorprofile.ASCII)` and `teatest.WithInitialTermSize(w, h)` in every teatest run.** The
  renderer emits escape sequences into a non-TTY buffer otherwise, which breaks substring assertions.

Read [`${CLAUDE_SKILL_DIR}/references/testing.md`] when writing the first test for a component or a program — it carries
the golden-test harness, the teatest driving API, and the tmux capture loop for watching a TUI run.

## Application

When **writing** Charm TUI code, apply these conventions silently — do not narrate a rule while following it. Read
`go.mod` for the pinned versions and confirm an uncertain signature against the module source rather than memory. Where
existing code contradicts a convention, follow the codebase and flag the divergence once.

When **reviewing** Charm TUI code, cite the violation and show the fix inline. Do not lecture. Treat every v1 idiom as a
defect, including the ones that look right.

```
Bad:  "In v2 the terminal features moved onto the View struct, so the alt screen is..."
Good: tea.NewProgram(m, tea.WithAltScreen()) -> v.AltScreen = true on every View() return
```

## Integration

The **golang** skill governs every Go decision outside the Charm API — naming, error handling, testing conventions, and
the toolchain — and wins on any question of how the Go code reads. This skill governs the Charm v2 stack. The **coding**
skill governs workflow. All are active at once.

The lipgloss `table`, `tree`, and `list` sub-packages render static output with no Bubble Tea program — reach for them
before hand-aligning terminal output in a plain CLI.

**The terminal belongs to the renderer: state arrives as messages, and the view declares what should be on screen.**
