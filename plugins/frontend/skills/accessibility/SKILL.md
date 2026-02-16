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

Web accessibility is not a feature -- it is a baseline quality attribute.
Every UI component must be perceivable, operable, understandable, and robust
for all users, including those using screen readers, keyboard navigation,
switch devices, and voice control.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Page structure, landmarks, headings, images, text alternatives | [semantic-html.md](references/semantic-html.md) |
| ARIA roles, states, properties, the five rules of ARIA | [aria.md](references/aria.md) |
| Keyboard navigation, focus order, focus trapping, focus restoration | [keyboard.md](references/keyboard.md) |
| Form labels, validation, error messages, required fields | [forms.md](references/forms.md) |
| WCAG 2.2 success criteria tables, compliance checklist | [wcag.md](references/wcag.md) |
| Dialog, tabs, accordion, menu, combobox, tooltip, alert patterns | [component-patterns.md](references/component-patterns.md) |

Read the relevant reference before writing or reviewing code in that area.

## Core Rules

These apply to ALL accessibility work. No exceptions.

### 1. Semantic HTML First

1. **Use native HTML elements** for their intended purpose. `<button>` not
   `<div onclick>`. `<a href>` not `<span class="link">`. `<nav>` not
   `<div class="nav">`.
2. **Do not add ARIA roles that duplicate implicit semantics.** Never
   `<nav role="navigation">` or `<main role="main">`.
3. **No ARIA is better than bad ARIA.** Incorrect ARIA causes more harm
   than missing ARIA. When unsure, use native HTML.
4. **Every `<img>` has an `alt` attribute.** Informative images get
   descriptive text. Decorative images get `alt=""`.

### 2. Keyboard Access

1. **All interactive elements must be keyboard operable.** If it responds
   to click, it must respond to Enter/Space/Arrow keys as appropriate.
2. **Never use `tabindex` > 0.** Reorder the DOM instead.
3. **Focus indicators must be visible.** Never `outline: none` without a
   custom replacement. Use `:focus-visible` for keyboard-only styles.
4. **Focus must never be lost.** When content is removed or hidden, move
   focus to a logical target.

### 3. Labels and Names

1. **Every form control has a programmatic label.** `<label for>`,
   `aria-label`, or `aria-labelledby` -- in that priority order.
2. **Every interactive component has an accessible name.** Buttons use
   text content. Icon buttons use `aria-label`.
3. **Visible label text must be contained in the accessible name**
   (WCAG 2.5.3 Label in Name).

### 4. Color and Contrast

1. **Text contrast:** 4.5:1 minimum (3:1 for large text 18pt+ or 14pt bold+).
2. **UI component contrast:** 3:1 minimum for borders, icons, focus
   indicators against adjacent colors.
3. **Color is not the sole indicator.** Never rely on color alone to convey
   information -- add icons, text, or patterns.

### 5. Dynamic Content

1. **Status messages use `role="status"`** (polite) -- search results count,
   save confirmations.
2. **Error messages use `role="alert"`** (assertive) -- validation errors,
   critical warnings.
3. **Set live regions in the DOM before updating content.** Adding
   `aria-live` and content simultaneously may not be announced.

### 6. Page Structure

1. **Set `<html lang="...">`** on every page.
2. **One `<h1>` per page.** Heading hierarchy must not skip levels.
3. **All content lives within landmark regions** (`<header>`, `<nav>`,
   `<main>`, `<aside>`, `<footer>`).
4. **Provide a skip link** as the first focusable element.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `<div onclick="...">Click me</div>` | `<button>Click me</button>` |
| `<a href="#">` for actions | `<button>` for actions, `<a href>` for navigation |
| `<nav role="navigation">` | `<nav>` -- implicit role is sufficient |
| `<img src="photo.jpg">` (no alt) | `<img src="photo.jpg" alt="Description">` |
| `outline: none` on `:focus` | `:focus-visible { outline: 2px solid #005fcc; }` |
| `tabindex="5"` | `tabindex="0"` or reorder the DOM |
| `placeholder="Email"` as sole label | `<label for="email">Email</label>` |
| `<span class="error" style="color:red">` | `<span role="alert" id="err">` + `aria-describedby` |
| `aria-label="Click here"` on a link | `<a href="/products">View all products</a>` |
| `role="button"` on `<div>` without keyboard | `<button>` or add keydown handler for Enter/Space |
| `aria-hidden="true"` on focusable element | Remove from tab order first, or do not hide |
| `<div role="alert">` always in DOM | Inject content into existing `role="alert"` container |
| Color-only error indication | Color + icon + text description |
| `<h1>` then `<h3>` (skipped level) | `<h1>` then `<h2>` then `<h3>` |

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

```
Bad review comment:
  "According to WCAG guidelines, you should ensure that all form
   inputs have properly associated labels for accessibility."

Good review comment:
  "Missing label -- add `<label for="email">Email</label>` before the
   input. (WCAG 1.3.1)"
```

## Integration

This skill provides accessibility-specific conventions alongside the
**coding** skill:

1. **Coding** -- Discovery, planning, verification discipline
2. **Accessibility** -- WCAG compliance, ARIA, keyboard, semantic HTML
3. **Coding** -- Final verification

The coding skill governs workflow; this skill governs accessibility
implementation choices. For CSS-related accessibility concerns (contrast,
focus styles, motion preferences), the **css** skill complements this one.
