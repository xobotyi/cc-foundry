---
name: charm-tui
description: >-
  Charmbracelet v2 TUI stack for Go: Bubble Tea (Elm architecture), Bubbles components, Lip Gloss styling and layout,
  Huh forms, Glamour markdown, fang CLI wrapper, testing with golden files and teatest. Invoke whenever task involves
  any interaction with terminal UIs in Go — building, reviewing, debugging, or testing TUI applications, bubbletea
  programs, terminal styling, keybindings, forms, or interactive terminal output.
---

# charm-tui

Terminal UIs in Go with the Charmbracelet v2 stack: Bubble Tea (Elm-architecture framework), Bubbles (components), Lip
Gloss (styling/layout), Huh (forms), Glamour (markdown), fang (CLI entry), log. This skill documents **v2 only** — model
training data is saturated with v1 code, and v1 idioms either fail to compile or silently misbehave against v2. When in
doubt, this skill and the local `go.mod` win over remembered API shapes.

<critical-constraints>

- **Import paths**: `charm.land/bubbletea/v2`, `charm.land/bubbles/v2/...`, `charm.land/lipgloss/v2`,
  `charm.land/huh/v2`, `charm.land/glamour/v2`, `charm.land/fang/v2`, `charm.land/log/v2`. Exceptions on GitHub paths:
  `github.com/charmbracelet/ultraviolet`, `github.com/charmbracelet/x/...`, `github.com/charmbracelet/colorprofile`.
  `github.com/charmbracelet/bubbletea` and friends resolve to v1 — never import them.
- **`View()` returns `tea.View`**, a struct — not a string. Wrap content with `tea.NewView(s)`.
- **Terminal features are declarative View fields** set on every render (`v.AltScreen`, `v.MouseMode`, `v.Cursor`,
  `v.WindowTitle`, …). There are no `tea.WithAltScreen()` options or `tea.EnterAltScreen` commands.
- **Key presses arrive as `tea.KeyPressMsg`** (`tea.KeyMsg` is an interface that also matches releases). The space bar
  is `"space"` in `msg.String()`, not `" "`.
- **`Update` is pure**: no I/O or expensive work — do it in a `tea.Cmd`. Commands run on other goroutines and must never
  mutate the model — they return a message; `Update` applies it.

</critical-constraints>

## References

- **Bubble Tea core** — `${CLAUDE_SKILL_DIR}/references/bubbletea.md` — full tea.View field catalog, program options,
  command/message catalogs, keyboard (Kitty enhancements) and mouse details, exec/suspend, errors/panics, framework
  gotchas
- **Bubbles components** — `${CLAUDE_SKILL_DIR}/references/bubbles.md` — per-component APIs (textinput, textarea,
  viewport, table, list, spinner, progress, timer, filepicker, paginator, help, key), real-cursor wiring, component
  gotchas
- **Lip Gloss styling** — `${CLAUDE_SKILL_DIR}/references/lipgloss.md` — Style API, color system, measurement,
  join/place layout, borders, layer compositing (overlays, hit-testing), table/tree/list sub-packages, standalone output
  writers
- **Huh forms + Glamour markdown** — `${CLAUDE_SKILL_DIR}/references/forms-and-markdown.md` — field types, validation,
  dynamic forms, themes, accessibility, bubbletea embedding; glamour styles, options, viewport integration
- **Architecture at scale** — `${CLAUDE_SKILL_DIR}/references/architecture.md` — the crush patterns: single-model
  architecture, imperative children, ultraviolet hybrid rendering, dialog overlay stack, virtualized lists with render
  caching, async/streaming integration
- **Ecosystem and testing** — `${CLAUDE_SKILL_DIR}/references/ecosystem-and-testing.md` — fang, log, ultraviolet
  positioning, x/ packages, golden View tests, teatest v2, tmux-driven verification

## The Core Model

Every Bubble Tea program is three methods on a model:

```go
package main

import (
    "fmt"
    "os"

    tea "charm.land/bubbletea/v2"
)

type model struct {
    count int
}

func (m model) Init() tea.Cmd { return nil }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyPressMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            return m, tea.Quit
        case "space":
            m.count++
        }
    case tea.MouseClickMsg:
        if msg.Button == tea.MouseLeft {
            m.count++
        }
    }
    return m, nil
}

func (m model) View() tea.View {
    v := tea.NewView(fmt.Sprintf("Count: %d\n\nspace/click to increment · q to quit\n", m.count))
    v.AltScreen = true
    v.MouseMode = tea.MouseModeCellMotion
    return v
}

func main() {
    if _, err := tea.NewProgram(model{}).Run(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}
```

- `Init() tea.Cmd` returns the first command (`nil` is fine). Some stale doc comments show a two-value `Init` signature
  — it does not compile; the interface is `Init() Cmd`.
- Set View fields on **every** return path of `View()` — a forgotten `v.AltScreen = true` on an early return exits the
  alt screen for that frame.
- ctrl+c is **not** handled automatically — raw mode delivers it as a key press; always handle it or users cannot
  interrupt.

## Commands and Messages

- A `tea.Cmd` is `func() tea.Msg`. Do I/O inside, return a custom message type, mutate state in `Update` when it
  arrives. Prefer named model methods over inline closures for commands.
- Message-returning functions are passed **uninvoked**: `return m, tea.Quit` — not `tea.Quit()`. Same for `tea.Suspend`,
  `tea.RequestWindowSize`, `tea.RequestBackgroundColor`, `tea.ClearScreen`.
- `tea.Batch(cmds...)` runs concurrently with **no ordering guarantee**; `tea.Sequence(cmds...)` runs in order. Use
  Sequence when order matters.
- `tea.Tick`/`tea.Every` fire **once** — re-return the command from `Update` on each tick to keep a timer alive.
- Inject external events with `p.Send(msg)` from any goroutine (pubsub bridges, servers, watchers).
- `tea.Println`/`tea.Printf` output is invisible while AltScreen is active — debug with `tea.LogToFile` instead.

## Input Handling

Match `tea.KeyPressMsg` and switch on `msg.String()` (`"enter"`, `"ctrl+c"`, `"space"`, `"up"`); field matching
(`msg.Code == 'c' && msg.Mod == tea.ModCtrl`) is the foolproof alternative. For real applications, define a keymap of
`key.Binding`s (`charm.land/bubbles/v2/key`) so bindings are declared once and the help view renders itself:

```go
keys := struct{ Up, Quit key.Binding }{
    Up:   key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "up")),
    Quit: key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
}
// Update: case tea.KeyPressMsg: switch { case key.Matches(msg, keys.Up): ... }
```

Mouse: enable via `v.MouseMode`, match `tea.MouseClickMsg`/`MouseWheelMsg`/`MouseMotionMsg`. Paste arrives as
`tea.PasteMsg`, never as a key message.

## Styling

- Lip Gloss `Style` is an immutable value — every setter returns a copy; build once, store, derive variants by
  assignment. Under Bubble Tea, just return styled strings from `View()`; downsampling is automatic.
- **Measure with `lipgloss.Width/Height(str)`** (ANSI- and wide-char-aware); **constrain with `Style.Width/Height(n)`**.
  Never `len()` on styled strings; for cutting/truncating styled text use `github.com/charmbracelet/x/ansi`
  (`ansi.Truncate`, `ansi.Cut`, `ansi.StringWidth`) — byte slicing corrupts escape sequences.
- Compose layouts with `lipgloss.JoinHorizontal/JoinVertical(pos, blocks...)` and
  `lipgloss.Place(w, h, hPos, vPos, content)`.
- **Colors are explicit in v2** — there is no automatic light/dark adaptation and no `AdaptiveColor`. Bootstrap theme
  detection through the event loop:

```go
func (m model) Init() tea.Cmd { return tea.RequestBackgroundColor }

// Update:
case tea.BackgroundColorMsg:
    m.styles = newStyles(msg.IsDark()) // build all styles once from isDark

func newStyles(isDark bool) styles {
    lightDark := lipgloss.LightDark(isDark)
    title := lipgloss.NewStyle().Foreground(lightDark(lipgloss.Color("#333"), lipgloss.Color("#eee")))
    // ...
}
```

- Centralize styles in one semantic struct built from `isDark`, threaded to components — no color literals scattered
  through render code.

## Layout Discipline

- Subtract frame sizes **before** rendering content: `contentW := termW - style.GetHorizontalFrameSize()`. A bordered
  panel consumes 2 cells per axis; forgetting this breaks every layout.
- Track terminal size from `tea.WindowSizeMsg` (sent at startup and on resize) and size children from it. There are no
  resize events on Windows.
- Truncate explicitly (`ansi.Truncate`) instead of relying on wrap inside fixed-size panels.
- Size panels with proportional weights from the terminal size, not fixed cell counts.
- Emoji and some CJK render 1 or 2 cells depending on the terminal — avoid variation-selector emoji in width-critical
  chrome.

## Components (Bubbles)

Value-type models: `New(...)` → forward messages with `m.child, cmd = m.child.Update(msg)` (returns the concrete type —
reassign!) → compose `View()` strings. Interactive components need `Focus()` (returns a `tea.Cmd` — dispatch it) and
silently ignore input when unfocused.

- **textinput / textarea** — single/multiline input; styles set via `SetStyles(DefaultStyles(isDark))`
- **viewport** — scrollable content window; zero-value size renders nothing — set dimensions before first render
- **table** — navigable rows; needs `WithFocused(true)`; fixed column widths
- **list** — filterable item list with batteries (pagination, spinner, help)
- **spinner / progress / timer / stopwatch** — animated; keep re-returning their tick/frame commands
- **help** — renders keymaps implementing `ShortHelp/FullHelp`
- **filepicker / paginator / cursor** — file selection, page math, cursor primitive

Every component defaults to **dark** styles — apply `DefaultStyles(isDark)` after background detection or light
terminals render wrong. Full APIs and per-component gotchas: see the bubbles reference.

## Forms and Markdown

- **Huh** for any form/prompt flow — standalone (`form.Run()`) or embedded in a bubbletea app (type-assert
  `form.(*huh.Form)` after Update, wrap `form.View()` in `tea.NewView`, watch `form.State == huh.StateCompleted`). Bind
  values with `.Value(&v)`. Themes: `WithTheme(huh.ThemeFunc(huh.ThemeCharm))`.
- **Glamour** for markdown → styled terminal output:
  `glamour.NewTermRenderer(glamour.WithStylePath("dark"), glamour.WithWordWrap(width))`. No auto style — pick
  `"light"`/`"dark"` from detected background; match word wrap to the viewport width and re-render on resize.

## Architecture

- **Small app (a screen, a few components)** — standard Elm composition: root model owns bubbles models, forwards
  messages, concatenates views with lipgloss joins.
- **Large app (screens, dialogs, streaming, long lists)** — the stack authors' production pattern (crush): exactly **one
  `tea.Model`**; sub-components are plain structs with imperative methods (`Render(width) string`, mutators returning
  `tea.Cmd`) that the root calls; do not nest models. One `switch msg.(type)` routes everything; focus state decides key
  routing; dialogs are a stack drawn last and intercept input first.
- Either way: create files to separate logic; keep it simple. Full at-scale patterns (ultraviolet buffers, overlay
  stack, virtualized lists, streaming): see the architecture reference.

## Testing

- **Primary idiom — golden View tests**: render the component directly, compare with
  `golden.RequireEqual(t, []byte(ansi.Strip(m.View())))` (`github.com/charmbracelet/x/exp/golden`); regenerate with
  `go test -update ./...`. No `tea.Program` needed.
- **Integration — teatest v2** (`github.com/charmbracelet/x/exp/teatest/v2`): drive a real program with
  `tm.Type(...)`/`tm.Send(tea.KeyPressMsg{Code: tea.KeyEnter})`. Always pin `tea.WithColorProfile(colorprofile.Ascii)`
  and `teatest.WithInitialTermSize(w, h)` for deterministic output.
- To watch it live, run the binary in tmux and `tmux capture-pane -p` the rendered frames.

## Application

When **writing** charm TUI code:

- Apply all conventions silently — don't narrate rules being followed
- Check `go.mod` for the actual pinned versions before reaching for an API; verify uncertain signatures against the
  vendored module or `pkg.go.dev/charm.land/...` rather than memory
- If an existing codebase contradicts a convention, follow the codebase and flag the divergence once

When **reviewing** charm TUI code:

- Cite the specific violation and show the fix inline; don't lecture
- Treat v1 idioms (`View() string`, `tea.KeyMsg` switches, `github.com/charmbracelet/bubbletea` imports,
  `tea.WithAltScreen()`) as defects even when they "look right"

## Integration

The **golang** skill governs Go implementation (errors, naming, structure, toolchain); this skill governs the charm TUI
stack. The lipgloss `table`/`tree`/`list` sub-packages render static output for plain CLIs too — reach for them before
hand-formatting aligned terminal output.

**The renderer owns the terminal: state flows in as messages, the view is a pure declaration — code that fights either
direction is wrong before it runs.**
