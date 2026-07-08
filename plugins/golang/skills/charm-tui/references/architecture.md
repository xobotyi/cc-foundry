# TUI Architecture at Scale — the Crush Patterns

How the stack's authors structure a large production TUI (crush, ~4300-line root model). Source of truth:
`crush/internal/ui` and its `AGENTS.md`. Use these patterns when an app outgrows a handful of components — multiple
screens, dialogs, streaming content, large scrollback.

## Choosing an Architecture

- **Small/medium app (one screen, a few bubbles)** — standard Elm composition: root model owns bubbles component models,
  forwards messages via `m.child, cmd = m.child.Update(msg)`, concatenates `View()` strings with lipgloss. This is what
  bubbletea's tutorials and examples teach; it scales fine to a page or two.
- **Large app (screens, overlays, virtualized lists, streaming)** — the crush architecture: **exactly one `tea.Model`**.
  Sub-components are plain stateful structs driven by imperative method calls; they do not participate in the Elm
  message loop. Community tutorials teaching nested-model trees contradict upstream's production practice — prefer the
  single-model pattern when scaling.

## Single-Model Architecture

The root `UI` struct is the sole `tea.Model`. It owns message routing (one large `switch msg.(type)` in `Update`), focus
state, layout computation, and dialog orchestration.

Sub-components follow this contract:

- Expose **imperative methods** for state changes (`SetMessages()`, `ScrollBy()`, `HandleMouseDown()`) — not
  `Update(tea.Msg)`.
- Return `tea.Cmd` from methods when side effects are needed.
- Render via `Render(width int) string` or `Draw(scr uv.Screen, area uv.Rectangle)`.
- Optionally use consumed-guard updates for input-hungry widgets:
  `func (c *Completions) Update(msg tea.KeyPressMsg) (tea.Msg, bool)` — the bool tells the root the key was consumed.
- The root `Update` decides when and how to call into each component. Never use commands to send messages when you can
  directly mutate children or state.

Update-loop shape:

```go
func (m *UI) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    var cmds []tea.Cmd
    switch msg := msg.(type) {
    // dialog messages intercepted FIRST, before all other routing
    // then: capability msgs, window size, key routing by focus state, ...
    }
    return m, tea.Batch(cmds...)
}
```

Key routing order: quit key first (opens confirm dialog) → if any dialog open, all input goes to the dialog and returns
early → cancel key when busy → route by focus state (editor focus → textarea, main focus → content list).

## Hybrid Rendering with Ultraviolet

Full-screen apps with regions and overlays draw into a cell buffer instead of concatenating strings.
`github.com/charmbracelet/ultraviolet` (note: github path, not charm.land) is bubbletea v2's rendering layer:

```go
func (m *UI) View() tea.View {
    canvas := uv.NewScreenBuffer(m.width, m.height)
    cursor := m.Draw(canvas, canvas.Bounds())
    v := tea.NewView(canvas.Render())
    v.AltScreen = true
    v.MouseMode = tea.MouseModeCellMotion
    v.BackgroundColor = m.styles.Background
    v.Cursor = cursor
    return v
}
```

- Components paint into sub-rectangles: `uv.NewStyledString(str).Draw(scr, rect)` — string-rendering components compose
  with buffer-drawing ones.
- `screen.Clear(scr)` first; draw in layer order: chrome → main content → popups → **dialogs last**; the cursor is
  returned only by the layer that owns focus.
- Rect layout via `ultraviolet/layout` constraint splitting:
  `layout.Vertical(layout.Len(headerH), layout.Fill(1)).Split(area).Assign(&header, &rest)`. Store computed rects in a
  comparable struct to detect layout changes cheaply.
- `uv.Buffer.Draw` skips empty cells (it does not clear) — nil out the target area before blitting a cached buffer or
  previous-frame cells bleed through.
- `uv.StyledString.Bounds()` measures grapheme width while `Draw` honors the destination's width method — size buffers
  per-line with `method.StringWidth`, not `Bounds()`, or emoji/CJK content truncates.

## Dialog Overlay Stack

```go
type Dialog interface {
    ID() string
    HandleMsg(msg tea.Msg) Action // Action is `any`; root consumes via type switch
    Draw(scr uv.Screen, area uv.Rectangle) *tea.Cursor
}
```

- `Overlay` manages a `[]Dialog` stack: `OpenDialog`/`CloseDialog`/`ContainsDialog`/`BringToFront`. Input routes only to
  the **front** dialog; `Draw` iterates the whole stack in order so earlier dialogs show beneath.
- Dialogs return typed action values (`ActionClose{}`, `ActionCmd{Cmd}`, app-specific actions); the root consumes them
  in one type switch. `tea.QuitMsg` can be aliased as an action type.
- Root draws the overlay after all content: `if m.dialog.HasDialogs() { return m.dialog.Draw(scr, scr.Bounds()) }`.
- **Grace period for async-opened dialogs**: absorb all keystrokes until input has been quiet ~200ms (ceiling ~1.5s) —
  otherwise a fast typist answers a permission prompt they never saw. Skip grace when reopening the same dialog ID
  within ~500ms.

## Virtualized Lists and Render Caching

For long scrollback (chat logs, results), render only visible items and cache aggressively:

- The list tracks `offsetIdx` (first visible item) + `offsetLine` (lines scrolled within it) and calls `Render(width)`
  only for visible items.
- List-level memo keyed by (item pointer, width, version). Items implement
  `{ Render(width int) string; Version() uint64; Finished() bool }`: embed a shared version counter and **`Bump()` on
  every output-affecting mutation** — a forgotten Bump freezes a stale render until resize ("item won't update until
  resize" is this bug). `Finished() == true` items are frozen and emitted verbatim.
- Mutators early-return when the new state equals the old — preserves cache hits:
  `if f.focused == focused { return }; f.focused = focused; f.version.Bump()`.
- Items additionally cache their own expensive renders keyed by width (two cache layers compose).
- Per-frame state (focus, highlight) is injected via registered render callbacks over visible items — not by iterating
  all items.
- Capability discovery via opt-in interfaces on items (`Focusable`, `Highlightable`, `Expandable`, `Animatable`,
  `MouseClickable`) — the list/root type-asserts per capability instead of one fat interface.

## Styles and Shared Context

- All styles live in one semantic `Styles` struct (nested groups per region: Header, Editor, Dialog, Help…) holding
  `lipgloss.Style` values plus bubbles sub-style structs (`textarea.Styles`, `help.Styles`) and a glamour
  `ansi.StyleConfig`. Components receive it via a shared `*common.Common{Workspace, Styles}` — no globals, no
  per-component color literals.
- Themes are built from ~30 semantic color roles (primary/accent/fgBase/error/…), not per-widget colors. Rebuilding
  styles is expensive — key the rebuild by theme identity and skip when unchanged.
- Raw ANSI shell output uses the 16 basic SGR colors, which can be illegible on the app background — remap through a
  themed `[16]color.Color` palette before display.

## Async Integration Patterns

- **External events → loop**: services publish typed events; one goroutine pumps them in via `program.Send(ev.Payload)`;
  `Update` matches them as ordinary messages (`case pubsub.Event[session.Session]:`).
- **Streaming (self-perpetuating channel drain)**: the message carries its channel; the handler mutates state, then
  returns a command that blocks on the next `<-ch` and re-sends the message. IO stays in commands; mutation stays in
  `Update`.
- **Toast/status**: wrap any message into a command with
  `func CmdHandler(msg tea.Msg) tea.Cmd { return func() tea.Msg { return msg } }`; clear after TTL with `tea.Tick`.
- **Stale-timer guards**: give timer messages a sequence number and ignore outdated ones (`hideMsg{seq}` vs current
  seq). Same trick debounces double-click (deferred single-click carrying a ClickID that newer clicks invalidate).
- **Input coalescing**: high-frequency mouse events flood the queue — a `tea.WithFilter` function throttles
  `MouseMotionMsg` and aggregates `MouseWheelMsg` into one coalesced message per ~16ms, returning `nil` to drop samples.
  Wheel delta magnitude is terminal-dependent (1 or 3 per tick) — treat it as a line count.

## Assorted Production Rules

- Mouse coordinates are screen-absolute — subtract the component's layout-rect origin before delegating hit-tests.
- `textarea.SetWidth` can change its height (soft-wrap reflow) — capture the previous height and run a second layout
  pass when it changed.
- Gate animations on visibility: propagate animation step messages only to visible items; pause off-screen animations
  and restart them when scrolled back into view. Re-arm spinner ticks only while actually busy.
- Follow mode (auto-scroll) must be re-applied after every content-height change: resize, animation steps, new items.
- Trim trailing spaces per content line before returning the View — fewer bytes to the terminal.
- Compact-mode breakpoints for small terminals (crush: width < 120 or height < 30) — design layouts to degrade.
- Terminal capability detection: feed `tea.EnvMsg`, `tea.ColorProfileMsg`, `tea.TerminalVersionMsg`, `tea.ModeReportMsg`
  and ultraviolet events into a capabilities struct at the top of `Update`; probe extras with `tea.Raw` escape
  sequences.
- Debug repaints with an env-gated random-color block drawn each frame.
