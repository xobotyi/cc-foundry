# ARIA Roles, States, and Properties

ARIA (Accessible Rich Internet Applications) adds semantic meaning to elements
when native HTML alone is insufficient. The cardinal rule:

**No ARIA is better than bad ARIA.**

ARIA modifies only the accessibility tree -- it does not change element behavior,
keyboard interaction, or visual appearance. You must implement those yourself.

## The Five Rules of ARIA

1. **Use native HTML first.** If an HTML element with the semantics you need
   exists, use it instead of ARIA.
2. **Do not change native semantics** unless absolutely necessary. Never
   `<h2 role="tab">` -- use `<div role="tab"><h2>...</h2></div>`.
3. **All interactive ARIA controls must be keyboard operable.** A
   `role="button"` must respond to Enter and Space.
4. **Do not use `role="presentation"` or `aria-hidden="true"` on focusable
   elements.** This hides them from assistive technology while they remain
   keyboard reachable.
5. **All interactive elements must have an accessible name.** Use visible
   labels, `aria-label`, or `aria-labelledby`.

## Roles

### Landmark Roles

Prefer HTML elements over ARIA landmark roles. Use ARIA only when the HTML
equivalent does not exist or is not supported.

| ARIA Role | HTML Equivalent | When to Use ARIA |
|-----------|----------------|------------------|
| `banner` | `<header>` (top-level) | Legacy browser support |
| `navigation` | `<nav>` | Legacy browser support |
| `main` | `<main>` | Legacy browser support |
| `complementary` | `<aside>` | Legacy browser support |
| `contentinfo` | `<footer>` (top-level) | Legacy browser support |
| `search` | `<search>` | Browsers without `<search>` support |
| `form` | `<form>` (with accessible name) | When `<form>` lacks a name |
| `region` | `<section>` (with accessible name) | When `<section>` lacks a name |

### Widget Roles

Use these only when no native HTML equivalent exists:

| Role | Purpose | Keyboard Contract |
|------|---------|-------------------|
| `tablist`, `tab`, `tabpanel` | Tab interface | Arrow keys between tabs, Tab into panel |
| `dialog` | Modal/non-modal dialog | Focus trap, Escape to close |
| `alertdialog` | Urgent dialog requiring response | Same as dialog |
| `menu`, `menuitem` | Action menu (not navigation) | Arrow keys, Enter to activate |
| `menubar` | Horizontal menu bar | Arrow keys, Enter for submenus |
| `tree`, `treeitem` | Hierarchical list | Arrow keys expand/collapse |
| `combobox` | Text input with popup | Arrow keys in list, Escape to close |
| `listbox`, `option` | Selection list | Arrow keys, Enter to select |
| `slider` | Range input | Arrow keys adjust value |
| `switch` | On/off toggle | Space to toggle |
| `toolbar` | Grouped controls | Arrow keys between controls |
| `tooltip` | Descriptive popup | Appears on focus and hover |

### Live Region Roles

| Role | Behavior | Use Case |
|------|----------|----------|
| `alert` | Assertive, atomic | Error messages, urgent warnings |
| `status` | Polite, atomic | Success messages, status updates |
| `log` | Polite, additions relevant | Chat messages, activity logs |
| `timer` | Off by default | Countdown displays |
| `marquee` | Off by default | Stock tickers, news feeds |

## Key Attributes

### Naming and Describing

| Attribute | Purpose | Priority |
|-----------|---------|----------|
| `aria-labelledby` | Names element by referencing another element's ID | 1st (overrides all others) |
| `aria-label` | Names element with a string | 2nd (when no visible label exists) |
| `aria-describedby` | Adds supplementary description | After name is established |
| `aria-description` | String description (no ID reference needed) | After name is established |

**Naming priority order:** `aria-labelledby` > `aria-label` > `<label>` >
element content > `title` attribute.

**Rules:**
1. Prefer visible labels (`<label>`, element content) over `aria-label`.
2. Use `aria-labelledby` to compose names from multiple elements.
3. `aria-label` and `aria-labelledby` override native label text -- do not
   use them to supplement; they replace.
4. Do not use `aria-label` on elements with `role="presentation"` or
   `role="none"`.

### State Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `aria-expanded` | `true`/`false` | Disclosure, accordion, menu trigger |
| `aria-selected` | `true`/`false` | Tab, option, grid cell |
| `aria-checked` | `true`/`false`/`mixed` | Checkbox, switch, radio |
| `aria-pressed` | `true`/`false`/`mixed` | Toggle button |
| `aria-disabled` | `true`/`false` | Non-interactive state (still focusable) |
| `aria-hidden` | `true`/`false` | Remove from accessibility tree |
| `aria-invalid` | `true`/`false`/`grammar`/`spelling` | Form validation |
| `aria-required` | `true`/`false` | Required field indicator |
| `aria-current` | `page`/`step`/`location`/`date`/`time`/`true` | Current item in a set |
| `aria-busy` | `true`/`false` | Region is updating |

### Relationship Attributes

| Attribute | Purpose |
|-----------|---------|
| `aria-controls` | This element controls that element |
| `aria-owns` | This element owns that element (virtual parent/child) |
| `aria-flowto` | Next element in reading order |
| `aria-activedescendant` | Virtual focus within a composite widget |
| `aria-errormessage` | Points to error message element for this input |

### Live Region Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `aria-live` | `off`/`polite`/`assertive` | Announce content changes |
| `aria-atomic` | `true`/`false` | Re-read entire region or just changes |
| `aria-relevant` | `additions`/`removals`/`text`/`all` | Which changes to announce |

**Rules:**
1. Use `aria-live="polite"` for non-urgent updates (search results, status).
2. Use `aria-live="assertive"` sparingly -- only for errors, alerts, urgent info.
3. Set live regions in the DOM before content changes. Adding `aria-live` and
   content simultaneously may not be announced.
4. Use `role="status"` (implicit `aria-live="polite"`) for status messages.
5. Use `role="alert"` (implicit `aria-live="assertive"`) for error messages.

## Common ARIA Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| `<div role="button">` without keyboard handler | Not keyboard accessible | Use `<button>` or add keydown for Enter/Space |
| `aria-hidden="true"` on focusable element | Hidden from AT but still focusable | Remove from tab order or remove aria-hidden |
| `<nav role="navigation">` | Redundant | Remove the role attribute |
| `aria-label` on `<div>` without a role | Ignored by most AT | Add an appropriate role or use a semantic element |
| `aria-expanded` on the panel | Should be on the trigger | Move to the button/trigger element |
| Missing `aria-controls` on tab | Tab/panel relationship unclear | Add `aria-controls` pointing to panel ID |
