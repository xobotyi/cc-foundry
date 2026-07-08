# Lip Gloss v2 — Styling and Layout Reference

Full API catalog for `charm.land/lipgloss/v2` (v2.0.x) and its `table`/`tree`/`list`/`compat` sub-packages.

## Style Fundamentals

`Style` is a plain value type — every setter returns a new Style; copy by assignment; derive variants freely:

```go
base := lipgloss.NewStyle().
    Bold(true).
    Foreground(lipgloss.Color("#7D56F4")).
    Padding(1, 2).
    Width(22)
active := base.Background(lipgloss.Color("#5A56E0")) // independent copy
out := base.Render("hello")
```

- `Render(strs ...string)` joins args with a space and prepends any `SetString` value; `Style` implements
  `fmt.Stringer`.
- `Inherit(other)` copies only properties **unset** on the receiver; margins, padding, and `SetString` never inherit.
- `Transform(func(string) string)` — applied at render time.
- `Hyperlink(url, params...)` — OSC8 clickable links.
- Underlines: `Underline(true)` ≡ `UnderlineStyle(lipgloss.UnderlineSingle)`; styles
  `UnderlineNone/Single/Double/Curly/Dotted/Dashed`, plus `UnderlineColor(c)`.
- Fill characters: `PaddingChar(rune)`, `MarginChar(rune)`.
- Tabs render as 4 spaces by default — `TabWidth(n)`, `TabWidth(0)` strips, `TabWidth(lipgloss.NoTabConversion)` keeps.

## Color System

- `lipgloss.Color(s)` is a **function** returning stdlib `image/color.Color`: `"#RRGGBB"`/`"#RGB"` hex, `"0"`–`"15"`
  basic ANSI, `"16"`–`"255"` indexed. Invalid input silently yields `NoColor{}`; a numeric string > 255 is reinterpreted
  as a 24-bit RGB integer (`Color("999")` is near-black, not ANSI).
- Named constants: `lipgloss.Black…White`, `lipgloss.BrightBlack…BrightWhite`.
- All style methods accept `color.Color` — any stdlib color works.
- **Adaptive colors are explicit.** Build a picker from a known background:

```go
lightDark := lipgloss.LightDark(isDark)          // isDark from tea.BackgroundColorMsg.IsDark()
fg := lightDark(lipgloss.Color("#333"), lipgloss.Color("#f1f1f1"))
```

- Standalone background probe: `lipgloss.HasDarkBackground(os.Stdin, os.Stdout)` — returns **true on any error** (piped
  output, no TTY); inside Bubble Tea use `tea.RequestBackgroundColor` instead.
- Per-profile colors: `lipgloss.Complete(colorprofile.Detect(os.Stdout, os.Environ()))(ansi, ansi256, truecolor)`.
- `compat` package (`compat.AdaptiveColor{Light, Dark color.Color}`, `compat.CompleteColor`) performs terminal I/O **at
  import time** via package-level vars — competes for stdin with Bubble Tea, not SSH-safe, discouraged for new code. Use
  `LightDark`/`Complete`.
- Gradients: `Blend1D(steps, stops...)` / `Blend2D(w, h, angleDeg, stops...)` (CIELAB). Utilities: `Darken`, `Lighten`,
  `Alpha`, `Complementary`.
- `Style.Render()` always emits full-fidelity ANSI — downsampling happens at the output layer (Bubble Tea does it
  internally; standalone code uses the lipgloss writers).

## Sizing and Measurement

Two distinct concepts — confusing them is the classic layout bug:

- **`Style.Width(i)` / `Style.Height(i)`** — setters constraining the rendered block (word-wraps content; the size
  includes border cells, excludes margins).
- **`lipgloss.Width(s)` / `lipgloss.Height(s)` / `lipgloss.Size(s)`** — package functions measuring an already-rendered
  string cell-accurately (ANSI-aware, wide-char-aware). **Never `len()`** on styled strings.
- **`Style.GetFrameSize() (x, y)`** — total margins+padding+border; use to compute content area:
  `contentW := termW - style.GetHorizontalFrameSize()`.
- `MaxWidth`/`MaxHeight` — hard clamps applied after render.
- `Inline(true)` — force single line (strips newlines).

## Layout Composition

`Position` is a float 0–1: `lipgloss.Top/Left` = 0.0, `Center` = 0.5, `Bottom/Right` = 1.0; any float works.

```go
cols := lipgloss.JoinHorizontal(lipgloss.Top, colA, colB, colC) // side by side
page := lipgloss.JoinVertical(lipgloss.Left, header, cols, footer)
out := lipgloss.Place(termW, termH, lipgloss.Center, lipgloss.Center, page)
```

- `JoinHorizontal` pads shorter blocks with **unstyled** spaces — size blocks with `Width`/`Height` first if you need
  styled fill (background continuity).
- `Place`/`PlaceHorizontal`/`PlaceVertical` **never truncate** — if content exceeds the box they are no-ops; clamp with
  `MaxWidth`/`MaxHeight` first.
- Whitespace styling: `lipgloss.WithWhitespaceStyle(style)`, `WithWhitespaceChars(s)`.

## Borders

- Presets:
  `NormalBorder, RoundedBorder, ThickBorder, DoubleBorder, BlockBorder, OuterHalfBlockBorder, InnerHalfBlockBorder, HiddenBorder, MarkdownBorder, ASCIIBorder`.
- `Border(b, sides ...bool)` — CSS-shorthand side control; `BorderStyle(b)` alone enables all four sides.
- Custom borders: fill the 13-field `lipgloss.Border` struct (corner/edge/middle pieces; `Middle*` used by tables).
- Gradient borders: `BorderForegroundBlend(...color.Color)` + `BorderForegroundBlendOffset(int)`.
- `HiddenBorder` preserves layout space — use it to keep dimensions stable when toggling borders.

## Layer Compositing

Cell-based compositor for overlays, dialogs, and mouse hit-testing:

```go
card := lipgloss.NewLayer(renderedBox).X(4).Y(2).Z(1).ID("card")
comp := lipgloss.NewCompositor(background, card)
out := comp.Render()

// mouse hit-testing:
if hit := comp.Hit(msg.X, msg.Y); !hit.Empty() {
    switch hit.ID() { case "card": ... }
}
```

- Layers nest (`NewLayer(content, children...)`); child coordinates are parent-relative; `Z` controls stacking.
- **`comp.Refresh()` is mandatory after mutating layer positions or the tree** — the compositor caches flattened bounds
  at construction; stale bounds break both rendering and hit-testing.
- `lipgloss.NewCanvas(w, h)` is a cell buffer with `Compose(uv.Drawable)` (one drawable — pass a compositor for multiple
  layers) and `Render()`.

## table / tree / list Sub-packages

Unlike `Style`, these builders are **mutable pointer types** — `t.Row(...)` mutates the shared `*Table`.

**table** (`charm.land/lipgloss/v2/table`):

```go
t := table.New().
    Border(lipgloss.NormalBorder()).
    BorderStyle(lipgloss.NewStyle().Foreground(purple)).
    StyleFunc(func(row, col int) lipgloss.Style {
        switch {
        case row == table.HeaderRow: return headerStyle // HeaderRow == -1
        case row%2 == 0:             return evenStyle
        default:                     return oddStyle
        }
    }).
    Headers("NAME", "AGE").
    Rows(rows...)
```

- Data rows are 0-indexed in `StyleFunc`; the header is `table.HeaderRow` (-1).
- `Width(w)` auto-sizes columns; `Height`+`YOffset` give a scrolling viewport with an overflow row; `Wrap(bool)`.
- Border side toggles: `BorderTop/Bottom/Left/Right/Header/Column/Row(bool)`.
- This is the static render-a-table package; for an interactive, navigable table use `bubbles/table`.

**tree** (`charm.land/lipgloss/v2/tree`):

- `tree.Root(".").Child("file", tree.Root("dir/").Child("nested"))` — `Child` accepts strings, `*Tree`, `Node`,
  `fmt.Stringer`, slices; a rootless child `*Tree` auto-nests under the previous sibling.
- Styling: `Enumerator` (`tree.DefaultEnumerator`, `tree.RoundedEnumerator`), `Indenter`, `EnumeratorStyle/Func`,
  `IndenterStyle/Func`, `RootStyle`, `ItemStyle/Func`, `Hide`, `Offset(start, end)`, `Width(int)`.

**list** (`charm.land/lipgloss/v2/list`):

- `list.New("a", "b", list.New("b1", "b2"))` — nesting by passing sub-lists as items; wraps tree.
- `Enumerator(list.Alphabet|Arabic|Roman|Bullet|Asterisk|Dash)` or custom `func(list.Items, int) string`.

## Text Utilities

- **`lipgloss.Wrap(s, width, breakpoints)`** — word-wrap preserving ANSI styles and hyperlinks across lines
- **`lipgloss.StyleRanges(s, lipgloss.NewRange(start, end, style)...)`** — style substrings of already-styled text (e.g.
  search-match highlighting)

## Standalone (non-TUI) Output

Only for CLIs printing styled text outside Bubble Tea — Bubble Tea downsamples View output itself, never route it
through these:

- **`lipgloss.Println/Print/Printf(v...)`** — print to stdout with profile-aware downsampling
- **`lipgloss.Fprintln/Fprint/Fprintf(w, v...)`** — print to any writer with that writer's profile
- **`lipgloss.Sprint/Sprintln/Sprintf(v...)`** — render to string using the **default stdout writer's** profile; if the
  target is stderr or a file, use `Fprint*` instead
- Default writer: `lipgloss.Writer = colorprofile.NewWriter(os.Stdout, os.Environ())` — reassign to customize

## Gotchas

- `Style.Width` (setter) vs `lipgloss.Width` (measure) are different things — mixing them up produces broken layouts.
- `Place` never truncates; oversized content makes it a no-op.
- `Inherit` skips margins/padding/SetString.
- Stale in-repo docstrings: the `table` docstring shows `row == 0` for headers (use `table.HeaderRow`), the README
  compositing snippet shows a multi-arg `Compose` (Canvas takes one drawable), and `compat/doc.go` references a
  nonexistent `impure` package. Follow this reference's patterns.
- `lipgloss.Color` never errors — typos render as terminal-default or unexpected RGB, silently.
- Reused styles with `SetString` silently prefix every `Render` output.
- `\r\n` is normalized to `\n` at render.
