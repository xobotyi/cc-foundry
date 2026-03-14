# ARIA Roles, States, and Properties

ARIA (Accessible Rich Internet Applications) adds semantic meaning to elements when native HTML alone is insufficient.
The cardinal rule:

**No ARIA is better than bad ARIA.**

ARIA modifies only the accessibility tree -- it does not change element behavior, keyboard interaction, or visual
appearance. You must implement those yourself.

## The Five Rules of ARIA

- **Use native HTML first.** If an HTML element with the semantics you need exists, use it instead of ARIA.
- **Do not change native semantics** unless absolutely necessary. Never `<h2 role="tab">` -- use
  `<div role="tab"><h2>...</h2></div>`.
- **All interactive ARIA controls must be keyboard operable.** A `role="button"` must respond to Enter and Space.
- **Do not use `role="presentation"` or `aria-hidden="true"` on focusable elements.** This hides them from assistive
  technology while they remain keyboard reachable.
- **All interactive elements must have an accessible name.** Use visible labels, `aria-label`, or `aria-labelledby`.

## Roles

### Landmark Roles

Prefer HTML elements over ARIA landmark roles. Use ARIA only when the HTML equivalent does not exist or is not
supported.

- `banner` → `<header>` (top-level) — use ARIA for legacy browser support
- `navigation` → `<nav>` — use ARIA for legacy browser support
- `main` → `<main>` — use ARIA for legacy browser support
- `complementary` → `<aside>` — use ARIA for legacy browser support
- `contentinfo` → `<footer>` (top-level) — use ARIA for legacy browser support
- `search` → `<search>` — use ARIA for browsers without `<search>` support
- `form` → `<form>` (with accessible name) — use ARIA when `<form>` lacks a name
- `region` → `<section>` (with accessible name) — use ARIA when `<section>` lacks a name

### Widget Roles

Use these only when no native HTML equivalent exists:

- `tablist`, `tab`, `tabpanel` — tab interface; arrow keys between tabs, Tab into panel
- `dialog` — modal/non-modal dialog; focus trap, Escape to close
- `alertdialog` — urgent dialog requiring response; same as dialog
- `menu`, `menuitem` — action menu (not navigation); arrow keys, Enter to activate
- `menubar` — horizontal menu bar; arrow keys, Enter for submenus
- `tree`, `treeitem` — hierarchical list; arrow keys expand/collapse
- `combobox` — text input with popup; arrow keys in list, Escape to close
- `listbox`, `option` — selection list; arrow keys, Enter to select
- `slider` — range input; arrow keys adjust value
- `switch` — on/off toggle; Space to toggle
- `toolbar` — grouped controls; arrow keys between controls
- `tooltip` — descriptive popup; appears on focus and hover

### Live Region Roles

- `alert` — assertive, atomic; use for error messages, urgent warnings
- `status` — polite, atomic; use for success messages, status updates
- `log` — polite, additions relevant; use for chat messages, activity logs
- `timer` — off by default; use for countdown displays
- `marquee` — off by default; use for stock tickers, news feeds

## Key Attributes

### Naming and Describing

- `aria-labelledby` — names element by referencing another element's ID; 1st priority (overrides all others)
- `aria-label` — names element with a string; 2nd priority (when no visible label exists)
- `aria-describedby` — adds supplementary description; use after name is established
- `aria-description` — string description (no ID reference needed); use after name is established

**Naming priority order:** `aria-labelledby` > `aria-label` > `<label>` > element content > `title` attribute.

**Rules:**

- Prefer visible labels (`<label>`, element content) over `aria-label`.
- Use `aria-labelledby` to compose names from multiple elements.
- `aria-label` and `aria-labelledby` override native label text -- do not use them to supplement; they replace.
- Do not use `aria-label` on elements with `role="presentation"` or `role="none"`.

### State Attributes

- `aria-expanded` (`true`/`false`) — disclosure, accordion, menu trigger
- `aria-selected` (`true`/`false`) — tab, option, grid cell
- `aria-checked` (`true`/`false`/`mixed`) — checkbox, switch, radio
- `aria-pressed` (`true`/`false`/`mixed`) — toggle button
- `aria-disabled` (`true`/`false`) — non-interactive state (still focusable)
- `aria-hidden` (`true`/`false`) — remove from accessibility tree
- `aria-invalid` (`true`/`false`/`grammar`/`spelling`) — form validation
- `aria-required` (`true`/`false`) — required field indicator
- `aria-current` (`page`/`step`/`location`/`date`/`time`/`true`) — current item in a set
- `aria-busy` (`true`/`false`) — region is updating

### Relationship Attributes

- `aria-controls` — this element controls that element
- `aria-owns` — this element owns that element (virtual parent/child)
- `aria-flowto` — next element in reading order
- `aria-activedescendant` — virtual focus within a composite widget
- `aria-errormessage` — points to error message element for this input

### Live Region Attributes

- `aria-live` (`off`/`polite`/`assertive`) — announce content changes
- `aria-atomic` (`true`/`false`) — re-read entire region or just changes
- `aria-relevant` (`additions`/`removals`/`text`/`all`) — which changes to announce

**Rules:**

- Use `aria-live="polite"` for non-urgent updates (search results, status).
- Use `aria-live="assertive"` sparingly -- only for errors, alerts, urgent info.
- Set live regions in the DOM before content changes. Adding `aria-live` and content simultaneously may not be
  announced.
- Use `role="status"` (implicit `aria-live="polite"`) for status messages.
- Use `role="alert"` (implicit `aria-live="assertive"`) for error messages.

## Common ARIA Mistakes

- `<div role="button">` without keyboard handler — not keyboard accessible; use `<button>` or add keydown for
  Enter/Space
- `aria-hidden="true"` on focusable element — hidden from AT but still focusable; remove from tab order or remove
  `aria-hidden`
- `<nav role="navigation">` — redundant; remove the role attribute
- `aria-label` on `<div>` without a role — ignored by most AT; add an appropriate role or use a semantic element
- `aria-expanded` on the panel — should be on the trigger; move to the button/trigger element
- Missing `aria-controls` on tab — tab/panel relationship unclear; add `aria-controls` pointing to panel ID
