---
name: accessibility
description: >-
  Web accessibility discipline: semantic HTML first, ARIA only when needed,
  keyboard access always. Invoke whenever task involves any interaction with
  accessible web content -- writing, reviewing, refactoring, or debugging
  HTML/CSS/JS for WCAG compliance, ARIA usage, keyboard navigation, focus
  management, screen reader support, or accessible component patterns.
---

# Accessibility

**Semantic HTML is the foundation. ARIA is the patch. Keyboard access is
non-negotiable. If an element looks interactive, it must be interactive
for everyone.**

Target **WCAG 2.2 AA conformance** unless the project explicitly specifies
otherwise. AA includes all A criteria.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Semantic HTML | `references/semantic-html.md` | Landmarks, headings, images, tables, lists, language markup |
| ARIA | `references/aria.md` | Roles, states, properties, naming, live regions, common mistakes |
| Keyboard | `references/keyboard.md` | Focus order, visibility, roving tabindex, focus traps, restoration |
| Forms | `references/forms.md` | Labels, grouping, required fields, validation, autocomplete |
| Component patterns | `references/component-patterns.md` | Dialog, tabs, accordion, disclosure, menu, combobox, tooltip |
| WCAG | `references/wcag.md` | Full WCAG 2.2 AA criteria tables and compliance checklist |

---

## 1. Semantic HTML

Use the right element for the right job. Native elements provide built-in
keyboard support, screen reader announcements, and focus management that
ARIA can only approximate.

### Landmarks

- Every page must have exactly one `<main>`.
- `<header>`/`<footer>` map to `banner`/`contentinfo` only as direct children
  of `<body>` -- nested inside `<article>`, `<section>`, etc. they lose their
  landmark role.
- Label multiple `<nav>` elements with `aria-label` or `aria-labelledby`.
- Never duplicate implicit roles (`<main role="main">`, `<nav role="navigation">`).
- Include all perceivable content within a landmark region.

For the full landmark-to-role mapping table, see `references/semantic-html.md`.

### Headings

- One `<h1>` per page identifying the primary content.
- Never skip heading levels -- `<h1>` then `<h3>` breaks the outline.
- Use headings for structure, not visual styling.
- Every `<section>` and major content area should begin with a heading.

### Interactive Elements

Use `<button>` for actions (submit, toggle, open dialog) -- activates via
Enter and Space. Use `<a href>` for navigation -- activates via Enter.
Never `<a href="#" onclick="...">` for actions. Never `<button>` for navigation.

### Tables

- Use `<th>` with `scope="col"` or `scope="row"` for headers.
- Add `<caption>` to describe the table's purpose.
- Never use tables for layout.

### Lists

Use `<ul>` for unordered, `<ol>` for ordered, `<dl>`/`<dt>`/`<dd>` for
term/description pairs. Screen readers announce list type and item count.

### Images

- Every `<img>` must have an `alt` attribute -- even if empty.
- Do not start alt text with "Image of" or "Picture of".
- Keep alt text under ~125 characters.
- For decorative images, prefer CSS `background-image` over `<img alt="">`.
- Use real text, not images of text (WCAG 1.4.5).

For alt treatment by image type, see `references/semantic-html.md`.

### Language and Page Metadata

- Set `<html lang="...">` on every page (WCAG 3.1.1).
- Mark inline language changes: `<span lang="fr">bonjour</span>` (WCAG 3.1.2).
- Expand abbreviations on first use with `<abbr>`.
- Provide a descriptive `<title>` on every page (WCAG 2.4.2).
- Provide a skip link as the first focusable element (WCAG 2.4.1).

---

## 2. ARIA

**No ARIA is better than bad ARIA.** ARIA modifies only the accessibility
tree -- it does not change behavior, keyboard interaction, or appearance.

### The Five Rules of ARIA

1. **Use native HTML first.** If a semantic HTML element exists, use it.
2. **Do not change native semantics** unless absolutely necessary. Never
   `<h2 role="tab">` -- use `<div role="tab"><h2>...</h2></div>`.
3. **All interactive ARIA controls must be keyboard operable.** A `role="button"`
   must respond to Enter and Space.
4. **Never `role="presentation"` or `aria-hidden="true"` on focusable elements.**
5. **All interactive elements must have an accessible name.**

### Naming and Describing

**Priority:** `aria-labelledby` > `aria-label` > `<label>` > element content
> `title`.

- Prefer visible labels over `aria-label`.
- Use `aria-labelledby` to compose names from multiple elements.
- `aria-label` and `aria-labelledby` replace native label text, not supplement.
- Never `aria-label` on elements with `role="presentation"` or `role="none"`.
- Never `aria-label` on `<div>` without a role -- ignored by most AT.
- Use `aria-describedby` or `aria-description` for supplementary info after
  the name is established.

### Live Regions

- Use `aria-live="polite"` for non-urgent updates.
- Use `aria-live="assertive"` sparingly -- only errors, alerts, urgent info.
- Set live regions in the DOM before content changes. Adding `aria-live` and
  content simultaneously may not be announced.
- Inject alert content into an existing `role="alert"` container for reliable
  announcement.

Place `aria-expanded` on the trigger element, not the panel.

For widget roles, state/relationship attribute tables, and common ARIA mistakes,
see `references/aria.md`.

---

## 3. Keyboard Navigation

All interactive functionality must be operable with a keyboard alone.

### Fundamental Keys

Tab/Shift+Tab between components. Arrow keys within composite widgets.
Enter activates links, buttons, menu items. Space activates buttons,
checkboxes, toggles. Escape closes overlays.

### Focus Order

- Never `tabindex` > 0. Rearrange DOM order instead.
- `tabindex="0"` makes non-interactive elements focusable (use sparingly).
- `tabindex="-1"` for programmatic focus only (dialog containers, skip targets).
- Source order = visual order = focus order. CSS reordering
  (`flex-direction: row-reverse`, `order`, grid) must not break this.

### Focus Visibility

- Never `outline: none` without a custom focus style replacement.
- Use `:focus-visible` for keyboard-only focus styles.
- Focus indicator: at least 3:1 contrast against adjacent background.
- Focus indicator area: at least 2px border equivalent (WCAG 2.4.13).
- Focused element must not be entirely obscured (WCAG 2.4.11).

### Focus Management

Use roving tabindex for composite widgets (tabs, toolbars, menus): active
child gets `tabindex="0"`, others get `tabindex="-1"`. Use
`aria-activedescendant` when the container must maintain focus (combobox).

### Focus Trap (Dialogs)

1. On open: focus first focusable element inside dialog.
2. Trap Tab/Shift+Tab -- wrap last-to-first and first-to-last.
3. Escape closes dialog.
4. On close: return focus to the trigger element.
5. Set `aria-modal="true"`.

### Focus Restoration

- **Deleted item** -- focus next item, or previous if last was deleted.
- **Closed overlay** -- focus the trigger that opened it.
- **Removed section** -- focus nearest logical container or heading.
- Never let focus fall to `document.body`.

### Disabled Elements

- Remove disabled standalone controls from tab sequence (`disabled` attribute
  or `tabindex="-1"`).
- Keep disabled items focusable inside composite widgets (menus, tabs, trees,
  listboxes) so screen reader users can discover them.
- Use `aria-disabled="true"` to keep element focusable but not operable.

---

## 4. Accessible Forms

### Labels

Every `<input>`, `<select>`, `<textarea>` must have a programmatic label.

**Priority:** `<label for/id>` > wrapping `<label>` > `aria-labelledby` >
`aria-label`.

- `placeholder` is not a label substitute -- disappears on input, unreliable
  in screen readers.
- Visible label text must be contained in the accessible name (WCAG 2.5.3).

### Grouping

- Group related controls with `<fieldset>` + `<legend>`. Required for: radio
  groups, checkbox groups, related input sets (address, date parts).
- Use `role="group"` with `aria-labelledby` when `<fieldset>` is impractical.

### Required Fields

- Use `required` attribute or `aria-required="true"`.
- Indicate visually with asterisk + "* Required" legend.
- Never color alone for required status.

### Validation and Errors

- Display errors adjacent to the invalid field.
- Associate errors via `aria-describedby` or `aria-errormessage`.
- Set `aria-invalid="true"` on invalid fields.
- Use `role="alert"` on error container for immediate announcement.
- For multiple errors: error summary at top with links to fields; move focus
  to summary on validation failure.
- On success: announce via `role="status"`.
- On failure: do not clear the form -- preserve user input.

### Input Types and Autocomplete

Use semantic `type` attributes (`email`, `tel`, `url`, `number`, `password`).
Use `autocomplete` for user data inputs (WCAG 1.3.5): `given-name`,
`family-name`, `email`, `tel`, `street-address`, etc.

### Disabling Controls

- Native `disabled` attribute removes from tab sequence and announces state.
- `aria-disabled="true"` keeps element focusable -- prevent activation in JS.
- Announce dynamic disabled state changes via a live region.

---

## 5. Visual Requirements

- **Text contrast:** 4.5:1 minimum (3:1 for large text 18pt+ or 14pt bold+).
- **UI component contrast:** 3:1 minimum for borders, icons, focus indicators.
- **Never color alone** to convey information -- add icons, text, or patterns.
- Content must reflow at 320px width without horizontal scroll (WCAG 1.4.10).
- No content loss when user adjusts line-height/spacing (WCAG 1.4.12).
- Content on hover/focus must be dismissible, hoverable, persistent (1.4.13).
- No content flashes more than 3 times/second (2.3.1).
- Time limits adjustable; moving content pausable (2.2.1, 2.2.2).

---

## 6. Component Patterns

For full ARIA structure, keyboard contracts, and code examples for each
pattern, see `references/component-patterns.md`. Key rules:

- **Dialog** -- use native `<dialog>` with `.showModal()` when possible.
  Focus trap, Escape to close, return focus to trigger on close.
- **Tabs** -- `role="tablist/tab/tabpanel"`, roving tabindex, arrow keys
  switch tabs, Tab enters active panel.
- **Accordion** -- trigger is `<button>` inside a heading, `aria-expanded`
  on button, `aria-controls` to panel.
- **Disclosure** -- `<button>` with `aria-expanded` and `aria-controls`.
- **Menu button** -- `aria-haspopup="true"`, arrows navigate, Enter activates.
  Never `role="menu"` for navigation -- use `<nav>` with links.
- **Combobox** -- `aria-activedescendant` tracks highlighted option, arrows
  navigate, Enter selects, Escape closes.
- **Tooltip** -- show on focus + hover, `aria-describedby`, must be hoverable
  and persistent. No interactive content inside.
- **Alert/Status** -- `role="alert"` for urgent (assertive), `role="status"`
  for non-urgent (polite). Inject into pre-existing container.

For WCAG 2.2 AA compliance checklist with criterion numbers,
see `references/wcag.md`.

---

## Application

When **writing** accessible code:
- Apply all conventions silently -- do not narrate each ARIA attribute or
  WCAG criterion being followed.
- Use native HTML elements before reaching for ARIA.
- Include keyboard interaction handlers for every custom interactive widget.
- If an existing codebase contradicts a convention, follow the codebase
  pattern and flag the divergence once.

When **reviewing** code for accessibility:
- Cite the specific violation and show the fix inline.
- Reference the WCAG criterion number when relevant (e.g., "1.4.3 Contrast").
- Do not lecture -- state what is wrong and how to fix it.

## Integration

The coding skill governs workflow; this skill governs accessibility choices.
For CSS-related accessibility (contrast, focus styles, motion), the css skill
complements this one.
