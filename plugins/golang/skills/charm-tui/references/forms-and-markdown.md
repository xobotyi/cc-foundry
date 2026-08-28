# Huh v2 Forms and Glamour v2 Markdown

API catalog for `charm.land/huh/v2` (forms/prompts) and `charm.land/glamour/v2` (markdown → ANSI rendering).

## Huh — Form Model

A `Form` is a list of `Group`s (pages); each `Group` is a list of `Field`s. Two run modes: standalone (`form.Run()`
spins up its own `tea.Program`) or embedded inside a bubbletea app as a sub-model.

```go
var name string
var confirmed bool

form := huh.NewForm(
    huh.NewGroup(
        huh.NewInput().Title("Name").Value(&name).Validate(notEmpty),
        huh.NewConfirm().Title("Proceed?").Value(&confirmed),
    ),
)
if err := form.Run(); err != nil {
    if errors.Is(err, huh.ErrUserAborted) { os.Exit(130) }
    return err
}
```

- `.Value(&v)` binds a pointer — values update as the user progresses; the safest way to read results.
- `.Key("name")` enables `form.Get/GetString/GetInt/GetBool(key)` — recorded on field progression, keyed fields only;
  read after `StateCompleted`.
- `Run()` errors: `huh.ErrUserAborted` (ctrl+c), `huh.ErrTimeout` (`WithTimeout`), `ErrTimeoutUnsupported` (timeout +
  accessible mode).
- Standalone forms render to **stderr** by default (accessible mode uses stdout) — piping stdout does not capture the
  TUI.
- Single quick prompt: every field has `.Run()` — `huh.NewInput().Title("Name?").Value(&name).Run()`.

## Huh — Field Types

- **`NewInput()`** — single line; `Prompt`, `Placeholder/PlaceholderFunc`, `Suggestions/SuggestionsFunc`, `CharLimit`,
  `EchoMode(huh.EchoModePassword/EchoModeNone)`, `Inline(bool)`
- **`NewText()`** — multiline; `Lines(int)`, `ShowLineNumbers`, `ExternalEditor`/`Editor(...)` (ctrl+e opens $EDITOR)
- **`NewSelect[T comparable]()`** — `Options(...)/OptionsFunc(fn, binding)`, `Height(int)`, `Inline(bool)`. Filtering is
  always available through the `/` key and cannot be switched off. `Filtering(bool)` is **not** an enable switch — it
  sets the live filtering state and focuses the filter input, so `.Filtering(true)` starts the field with the filter box
  already open.
- **`NewMultiSelect[T comparable]()`** — `Limit(int)`, x/space toggles, ctrl+a select-all. `Filterable(bool)` is the
  enable switch here and defaults to true; `Filtering(bool)` sets the live state exactly as on `Select`.
- **`NewConfirm()`** — `Affirmative`/`Negative` labels, `y`/`n` accept and reject keys, `h`/`l`/`left`/`right` toggle,
  `WithButtonAlignment(lipgloss.Position)`; `.Negative("")` removes the No button and makes the toggle key a no-op
- **`NewNote()`** — display-only. A note is skipped in navigation unless it is the **only** field in its group;
  `.Next(true)` renders a Next button (label via `.NextLabel`) and does not affect skipping.
- **`NewFilePicker()`** — `CurrentDirectory`, `AllowedTypes`, `FileAllowed`/`DirAllowed`, `ShowHidden`, `ShowSize`,
  `ShowPermissions`, `Height`

Builders are chainable and return the concrete type. `Title`, `Description`, and their `*Func` variants exist on every
input field; `Value(*T)`, `Key(string)`, `Accessor`, and `Validate(func(T) error)` exist on every field except `Note`,
which carries no value; `FilePicker` has `Title`/`Description` but no `TitleFunc`/`DescriptionFunc`. Options:
`huh.NewOption(key, value)`, `huh.NewOptions(values...)` (key = `fmt.Sprint(value)`), `.Selected(true)` to pre-select.

Validation runs on field submit and blur; a failing `Validate` blocks progression and renders via the theme's error
styles; `form.Errors()` returns the current group's errors.

## Huh — Dynamic Forms

`TitleFunc/DescriptionFunc/OptionsFunc/PlaceholderFunc/SuggestionsFunc` take `(fn, binding any)` — `fn` re-runs only
when the hash of `binding` changes (results cached per hash). Pass a **pointer to the upstream variable**:

```go
huh.NewSelect[string]().
    Value(&state).
    Height(8). // OptionsFunc-backed selects default to height 10
    TitleFunc(func() string { return "State in " + country }, &country).
    OptionsFunc(func() []huh.Option[string] {
        return huh.NewOptions(fetchStates(country)...)
    }, &country)
```

- A never-changing binding means the func never re-runs; a hot binding re-fetches on every change.
- `OptionsFunc` runs as a `tea.Cmd` with a spinner after 25ms — safe for network calls.
- Conditional pages: `group.WithHide(bool)` / `WithHideFunc(func() bool)`.

## Huh — Themes and Accessibility

- `Theme` is an interface `{ Theme(isDark bool) *Styles }`; `ThemeFunc` adapts a plain function. Built-ins
  (`ThemeCharm/ThemeDracula/ThemeCatppuccin/ThemeBase16/ThemeBase`) are `func(isDark bool) *Styles`, so:

```go
form.WithTheme(huh.ThemeFunc(huh.ThemeCharm)) // compile-safe form
```

huh's own upgrade guide shows `WithTheme(huh.ThemeCharm(isDark))` — that passes `*Styles`, which does not implement
`Theme`; use the `ThemeFunc` form. `isDark` is auto-detected from `tea.BackgroundColorMsg` while the form runs. Custom
themes: start from `huh.ThemeBase(isDark)`, override fields, wrap in `ThemeFunc`.

- Accessible mode is form-level only: `form.WithAccessible(os.Getenv("ACCESSIBLE") != "")` — swaps the TUI for
  sequential stdin/stdout prompts. `TERM=dumb` auto-enables it. Screen-reader users depend on this — wire the gate in
  real applications.
- Layouts: `WithLayout(l)` takes one `huh.Layout` — `huh.LayoutDefault` (one group at a time), `huh.LayoutStack`,
  `huh.LayoutColumns(n)`, or `huh.LayoutGrid(rows, cols)`.
- `huh/spinner`: `spinner.New().Title("Loading…").ActionWithErr(func(ctx context.Context) error { ... }).Run()` — a
  blocking spinner around a task. `Action(func())` is the error-free form.

## Huh — Embedding in Bubble Tea

`huh.Form` satisfies `huh.Model` — an interface whose `View()` returns `string` and whose `Update` returns
`(huh.Model, tea.Cmd)`. Embedding requires three adaptations:

```go
func (m appModel) Init() tea.Cmd { return m.form.Init() }

func (m appModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    form, cmd := m.form.Update(msg)
    if f, ok := form.(*huh.Form); ok { m.form = f } // type-assert back to *huh.Form
    if m.form.State == huh.StateCompleted { /* read values, move on */ }
    return m, cmd
}

func (m appModel) View() tea.View {
    return tea.NewView(m.form.View()) // wrap the string
}
```

- Form states: `StateNormal` / `StateCompleted` / `StateAborted`.
- Embedded forms usually want chrome off: `.WithWidth(45).WithShowHelp(false).WithShowErrors(false)`; render help and
  errors yourself from `form.Help()`, `form.KeyBinds()`, `form.Errors()`.
- `WithProgramOptions` **replaces** the internal option slice, silently dropping the default `tea.WithOutput(os.Stderr)`
  — re-add output/input options when using it.
- `form.WithViewHook(func(tea.View) tea.View)` — set AltScreen/mouse mode on the standalone-run view.

## Glamour — Markdown Rendering

Glamour v2 is pure: no terminal detection, no downsampling — pick a style explicitly, downsample at output.

```go
// One-shot:
out, err := glamour.Render(markdown, "dark")

// Reusable renderer (preferred for repeated renders):
r, _ := glamour.NewTermRenderer(
    glamour.WithStylePath("dark"),
    glamour.WithWordWrap(width),
)
out, _ := r.Render(markdown)
```

- Built-in styles: `"ascii"`, `"dark"` (default), `"dracula"`, `"tokyo-night"`, `"light"`, `"notty"`, `"pink"` —
  constants in `glamour/v2/styles`. **No auto style** — on light terminals pass `"light"` explicitly (derive from
  `tea.BackgroundColorMsg.IsDark()` or `lipgloss.HasDarkBackground`).
- Options: `WithStandardStyle(name)`, `WithStyles(ansi.StyleConfig)`, `WithStylesFromJSONBytes/JSONFile`,
  `WithWordWrap(int)` (default 80), `WithTableWrap(bool)`, `WithPreservedNewLines()`, `WithEmoji()`,
  `WithBaseURL(string)`, `WithChromaFormatter("terminal16m")`, `WithEnvironmentConfig()` (`GLAMOUR_STYLE` env).
- `WithStylePath` tries a builtin name first, then a JSON file path — a typo'd style name surfaces as a confusing
  file-read error.
- Custom styles: `ansi.StyleConfig` with per-element style blocks, JSON-serializable.
- Engine: goldmark with GFM; code blocks highlighted via chroma (default formatter `terminal256`).
- Standalone printing: `lipgloss.Print(out)` for profile-aware downsampling — `fmt.Print` shows wrong colors on
  non-truecolor terminals.

Viewport integration — glamour output is a plain styled string:

```go
// on tea.WindowSizeMsg: recreate the renderer, WithWordWrap must match content width
r, _ := glamour.NewTermRenderer(glamour.WithStylePath(style), glamour.WithWordWrap(vpWidth))
out, _ := r.Render(markdown)
m.viewport.SetContent(out)
```

The renderer does not react to resize — recreate it (or re-render) on `tea.WindowSizeMsg`.
