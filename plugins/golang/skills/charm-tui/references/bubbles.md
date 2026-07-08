# Bubbles v2 — Component Reference

Per-component API catalog for `charm.land/bubbles/v2` (v2.1.x). Requires `charm.land/bubbletea/v2` and
`charm.land/lipgloss/v2` — the three move together.

## Universal Component Lifecycle

Every component is a value-type `Model` with `New(...)`, `Update(tea.Msg) (Model, tea.Cmd)` returning the **concrete
type** (no type assertion needed), and `View() string`. Interactive components add `Focus() tea.Cmd` / `Blur()`.

```go
var cmd tea.Cmd
m.table, cmd = m.table.Update(msg) // reassign — value semantics
return m, cmd
```

- Size via methods: `SetWidth(w)`/`Width()`, `SetHeight(h)`/`Height()` (filepicker, help, progress, table, textinput,
  viewport; viewport also `SetYOffset()`/`YOffset()`).
- `DefaultKeyMap()` is a function returning a fresh keymap (paginator, textarea, textinput).
- **Every `New()` hardcodes dark styles.** Apply `DefaultStyles(isDark)` after background detection (see SKILL.md
  theme-bootstrap pattern) — help, list (`NewDefaultItemStyles(isDark)` too), textarea, textinput take `isDark`;
  `table.DefaultStyles()` takes no argument.
- `runeutil` and `memoization` are internal packages — not importable.

## key — Bindings and Matching

```go
type keyMap struct{ Up, Down, Quit key.Binding }

var keys = keyMap{
    Up: key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "move up")),
    // ...
}

// Update:
case tea.KeyPressMsg:
    switch {
    case key.Matches(msg, m.keys.Up): m.cursor--
    }
```

- `key.Matches` is generic over `fmt.Stringer` — pass `tea.KeyPressMsg` directly.
- Key names must match bubbletea v2's `String()` names exactly: `"space"`, `"pgup"`, `"ctrl+left"`, `"alt+backspace"`.
- `binding.SetEnabled(false)` — disabled bindings never match **and** vanish from help output; use for contextual keys.
- Mutators: `SetKeys`, `SetHelp`, `Unbind()`.

## help

- `help.New()`, then `help.Model.View(k help.KeyMap)` — the only bubble whose `View` takes an argument.
- Your keymap satisfies `help.KeyMap` by implementing `ShortHelp() []key.Binding` and `FullHelp() [][]key.Binding`.
- `Model.ShowAll` toggles single-line vs full grid. Only `ShortHelpView` respects width — `FullHelpView` never
  truncates.
- Styles: `DefaultStyles(isDark)` / `DefaultDarkStyles()` / `DefaultLightStyles()`.

## textinput

- `textinput.New()` — prompt `"> "`, virtual cursor on, dark styles.
- `Focus()` returns a `tea.Cmd` that starts cursor blink — **dispatch it, don't drop it**. `Blur()` returns nothing.
- Styles are unexported: `s := textinput.DefaultStyles(isDark)`, mutate
  `s.Focused.Prompt/.Text/.Placeholder/ .Suggestion` (`Styles{Focused, Blurred StyleState; Cursor CursorStyle}`), then
  `ti.SetStyles(s)`.
- `EchoMode`: `EchoNormal` / `EchoPassword` / `EchoNone`. `Validate ValidateFunc` for live validation.
- Suggestions: `ShowSuggestions = true` + `SetSuggestions([]string)`.
- Bracketed paste (`tea.PasteMsg`) is handled natively; ctrl+v uses the system clipboard and can fail headless.

## textarea

- `textarea.New()` — `ShowLineNumbers=true`, thick-border prompt, dark styles.
- Styles: `Styles.Focused`/`Styles.Blurred` of type
  `StyleState{Base, Text, LineNumber, CursorLineNumber, CursorLine, EndOfBuffer, Placeholder, Prompt}`;
  `DefaultStyles(isDark)`.
- Sizing: `DynamicHeight` + `MinHeight` + `MaxContentHeight` for auto-growing input; `SetWidth` must be re-called if the
  prompt changes after init.
- Navigation/query: `Column()`, `ScrollYOffset()`, `MoveToBegin()`/`MoveToEnd()`, `SetCursorColumn(col)`; PageUp/
  PageDown bindings included.
- Scrolling follows the cursor — the embedded viewport's pager keys are deliberately empty.

## viewport

- `viewport.New(viewport.WithWidth(80), viewport.WithHeight(24))` — option constructor. **Zero-value size renders
  nothing**; set dimensions (usually from `tea.WindowSizeMsg`) before first render.
- Content: `SetContent(string)` / `SetContentLines([]string)` / `GetContent()`.
- `SoftWrap bool` — virtual soft-wrapping; `FillHeight bool` — pad with empty lines.
- `LeftGutterFunc(GutterContext{Index, TotalLines, Soft}) string` — line-number gutters.
- `StyleLineFunc func(int) lipgloss.Style` — per-line styling.
- Highlights: `SetHighlights([][]int)` (rune ranges, e.g. from `regexp.FindAllStringIndex`), `HighlightNext()`/
  `HighlightPrevious()`/`ClearHighlights()`, styled via `HighlightStyle`/`SelectedHighlightStyle`.
- Horizontal scrolling: left/right keys, `SetXOffset`, `HorizontalScrollPercent()`.
- Mouse wheel on by default (delta 3).

## table

- `table.New(table.WithColumns([]table.Column{{Title: "ID", Width: 10}}), table.WithRows(rows), table.WithFocused(true), table.WithHeight(h))`;
  `Row = []string`.
- **Unfocused tables ignore all messages** — a dead table is a missing `WithFocused(true)`/`Focus()`.
- `SelectedRow()`, `Cursor()`/`SetCursor(n)`.
- `SetStyles(Styles{Header, Cell, Selected})`; `DefaultStyles()` takes no `isDark`.
- Column widths are fixed ints — no auto-sizing; compute from the terminal width yourself.
- `KeyMap` satisfies `help.KeyMap`; `HelpView()` renders it.

## list

- `list.New(items []list.Item, delegate list.ItemDelegate, width, height int)` — positional size args.
- `Item` = `{ FilterValue() string }`. `DefaultDelegate` renders items implementing
  `{ Title() string; Description() string }`; customize via its `UpdateFunc`/`ShortHelpFunc`/`FullHelpFunc` hooks.
- Full control: implement
  `ItemDelegate{Render(w io.Writer, m Model, index int, item Item); Height() int; Spacing() int; Update(tea.Msg, *Model) tea.Cmd}`
  — style the selected row via `index == m.Index()`.
- `SetItems`/`InsertItem`/`SetItem` return `tea.Cmd`s that drive re-filtering — return them.
- Batteries: title, status bar, paginator, spinner (`StartSpinner`/`StopSpinner`), fuzzy filtering (`FilterState`:
  `Unfiltered`/`Filtering`/`FilterApplied`), help (`AdditionalShortHelpKeys`/`AdditionalFullHelpKeys`).
- Resize idiom: `h, v := docStyle.GetFrameSize(); m.list.SetSize(msg.Width-h, msg.Height-v)`.
- Styles: `DefaultStyles(isDark)`, item styles `NewDefaultItemStyles(isDark)`; filter input styled via `Styles.Filter`
  (a full `textinput.Styles`).

## spinner

- `spinner.New(spinner.WithSpinner(spinner.Dot), spinner.WithStyle(s))`.
- Animate: `Init` returns `m.spinner.Tick` (method value **is** a `tea.Cmd`); keep forwarding ticks or animation
  freezes:

```go
case spinner.TickMsg:
    m.spinner, cmd = m.spinner.Update(msg)
    return m, cmd
```

- Built-ins: `Line, Dot, MiniDot, Jump, Pulse, Points, Globe, Moon, Monkey, Meter, Hamburger, Ellipsis`.
- Tick messages carry instance IDs — messages from other spinners are rejected, so fan-out is safe.

## progress

Two modes:

- **Animated**: `return m, m.progress.SetPercent(0.6)`, then forward `progress.FrameMsg` through
  `m.progress.Update(msg)`. `Percent()` returns the animation **target**, not the drawn value; `IsAnimating()` reports
  in-flight transitions.
- **Pure-functional**: `m.progress.ViewAs(pct)` — no Update wiring, no FrameMsg.

Options: `WithColors(...color.Color)` (one color = solid fill, several = blend), `WithDefaultBlend()`,
`WithScaled(bool)`, `WithColorFunc(func(total, current float64) color.Color)`, `WithWidth`, `WithoutPercentage`,
`WithFillCharacters`, `WithSpringOptions`. `FullColor`/`EmptyColor` are `color.Color`.

## timer / stopwatch

- `timer.New(30*time.Second, timer.WithInterval(100*time.Millisecond))` — `Init()` starts ticking; emits
  `TickMsg{ID, Timeout}` per interval, `TimeoutMsg{ID}` at expiry. `Start`/`Stop`/`Toggle` return `tea.Cmd`s — state
  changes flow through messages, not direct mutation. `Timeout` is the mutable remaining time; format it yourself
  (`View()` prints Go duration syntax).
- `stopwatch.New(stopwatch.WithInterval(d))` — `Init()` returns `Start()`; `Elapsed() time.Duration`;
  `Start`/`Stop`/`Toggle`/`Reset` return `tea.Cmd`s.

## filepicker

- `filepicker.New()` starting at `CurrentDirectory: "."`; `Init()` reads the directory.
- Selection check happens **after** Update with the same message:

```go
m.fp, cmd = m.fp.Update(msg)
if didSelect, path := m.fp.DidSelectFile(msg); didSelect { m.chosen = path }
```

- Config: `AllowedTypes []string`, `FileAllowed`/`DirAllowed`, `ShowHidden`/`ShowPermissions`/`ShowSize`, `AutoHeight`,
  `SetHeight`. `DidSelectDisabledFile` for blocked types.

## paginator

- `paginator.New(paginator.WithTotalPages(n), paginator.WithPerPage(k))`; `Type`: `paginator.Dots` or
  `paginator.Arabic`.
- Manual-list idiom: `p.SetTotalPages(len(items)); start, end := p.GetSliceBounds(len(items))` → slice your items.
- `ActiveDot`/`InactiveDot` strings style the dots.

## Real Terminal Cursor

textinput/textarea support the real terminal cursor instead of the drawn (virtual) one:

```go
ti.SetVirtualCursor(false)

// top-level View():
v := tea.NewView(content)
if c := m.input.Cursor(); c != nil {
    c.Position.X += xOffset // offset by everything rendered left/above the component
    c.Position.Y += lipgloss.Height(header)
    v.Cursor = c
}
return v
```

`Cursor()` returns `nil` when the virtual cursor is on **or** the component is blurred — always guard.

## Gotchas

- Dark styles are the universal default — light-terminal users see wrong colors until you apply `DefaultStyles(isDark)`
  after background detection.
- Unfocused textinput/table silently ignore all messages — "component doesn't react" is almost always a focus bug.
- Constructing component models as struct literals instead of `New()` breaks message routing — spinner/timer/
  stopwatch/progress messages carry instance IDs; a zero ID collides.
- `list.New` takes positional width/height unlike the option-style constructors elsewhere.
- `filepicker.DidSelectFile` must receive the exact message just passed to `Update` — calling it outside that flow
  always returns false.
- Dropping the `tea.Cmd` returned by `Focus()`, `SetItems`, `SetPercent`, or `Tick` silently kills blinking, filtering,
  animation, or ticking.
