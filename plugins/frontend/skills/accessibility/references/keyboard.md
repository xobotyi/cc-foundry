# Keyboard Navigation and Focus Management

All interactive functionality must be operable with a keyboard alone. This is
non-negotiable -- it enables access for screen reader users, switch device users,
voice control users, and anyone without a pointing device.

## Fundamental Conventions

- **Tab** moves focus between interactive components (links, buttons, inputs).
- **Shift+Tab** moves focus backward.
- **Arrow keys** move focus within composite widgets (tabs, menus, grids).
- **Enter** activates links, buttons, and menu items.
- **Space** activates buttons, checkboxes, and toggles.
- **Escape** closes overlays, menus, and dialogs.

## Focus Order

Focus order must match visual reading order. The DOM order determines the
default tab sequence.

**Rules:**
- Never use `tabindex` values greater than 0. Rearrange DOM order instead.
- Use `tabindex="0"` to make non-interactive elements focusable (sparingly).
- Use `tabindex="-1"` for elements that should be programmatically focusable
  but not in the tab sequence (e.g., dialog containers, skip link targets).
- Source order = visual order = focus order. CSS layout changes
  (`flex-direction: row-reverse`, `order`, `grid` reordering) must not
  break this alignment.

## Focus Visibility

Every focusable element must have a visible focus indicator.

**Rules:**
- Never use `outline: none` or `outline: 0` without providing a custom
  focus style.
- Use `:focus-visible` for keyboard-only focus styles (avoids showing
  outlines on mouse click).
- Focus indicator must have at least 3:1 contrast against the adjacent
  background.
- The focus indicator area must be at least as large as a 2px border
  around the element (WCAG 2.2 AAA 2.4.13).

```css
/* Good: custom focus indicator with :focus-visible */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Good: high-contrast focus for dark backgrounds */
.dark-section :focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

/* Bad: removed focus with no replacement */
*:focus {
  outline: none; /* NEVER DO THIS */
}
```

## Skip Links

Provide a skip link as the first focusable element on the page to bypass
repeated navigation.

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header><!-- navigation --></header>
  <main id="main-content"><!-- content --></main>
</body>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Focus Management Patterns

### Roving Tabindex

For composite widgets (tabs, toolbars, menus) where only one child should be
in the tab sequence at a time:

1. Set `tabindex="0"` on the active/current element.
2. Set `tabindex="-1"` on all other focusable children.
3. On arrow key press: move `tabindex="0"` to the target, set previous to
   `tabindex="-1"`, and call `.focus()` on the new element.

```js
function handleArrowKey(items, currentIndex, direction) {
  const nextIndex = direction === "next"
    ? (currentIndex + 1) % items.length
    : (currentIndex - 1 + items.length) % items.length;

  items[currentIndex].setAttribute("tabindex", "-1");
  items[nextIndex].setAttribute("tabindex", "0");
  items[nextIndex].focus();
}
```

### aria-activedescendant

Alternative to roving tabindex for composite widgets. The container keeps
DOM focus, and `aria-activedescendant` tells assistive technology which child
is "virtually" focused.

1. Container element has `tabindex="0"` and keeps DOM focus.
2. Set `aria-activedescendant` to the ID of the visually focused child.
3. Update on arrow key navigation.

**When to use which:**
- Roving tabindex: scrolls focused element into view automatically.
- `aria-activedescendant`: better when the container must maintain focus
  (e.g., combobox text input).

### Dialog Focus Trap

When a modal dialog opens:

1. Move focus to the first focusable element inside the dialog (or the
   dialog element itself if content is complex).
2. Trap Tab/Shift+Tab within the dialog -- wrap from last to first and
   vice versa.
3. Close on Escape key.
4. On close, return focus to the element that opened the dialog.
5. Set `aria-modal="true"` on the dialog container.

```js
function trapFocus(dialogElement) {
  const focusable = dialogElement.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  dialogElement.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === "Escape") {
      closeDialog();
    }
  });

  first.focus();
}
```

### Focus Restoration

When dynamic content is removed (deleted list item, closed dialog, dismissed
notification), focus must move to a logical target:

- **Deleted item** -- focus the next item, or previous if last was deleted.
- **Closed overlay** -- focus the trigger element that opened it.
- **Removed section** -- focus the nearest logical container or heading.

Never let focus fall to `document.body` -- this causes a complete loss of
keyboard context.

## Keyboard Patterns by Widget

| Widget | Keys | Behavior |
|--------|------|----------|
| Button | Enter, Space | Activate |
| Link | Enter | Navigate |
| Checkbox | Space | Toggle checked state |
| Radio group | Arrow keys | Move selection between options |
| Tabs | Arrow keys | Switch active tab |
| Menu | Arrow keys, Enter | Navigate items, activate |
| Dialog | Tab (trapped), Escape | Navigate within, close |
| Accordion | Enter/Space | Toggle expanded section |
| Combobox | Arrow keys, Enter, Escape | Navigate list, select, close |
| Slider | Arrow keys | Adjust value |
| Tree view | Arrow keys | Navigate, expand/collapse |

## Disabled Elements

- Remove disabled standalone controls from the tab sequence (`disabled`
  attribute on native elements, or `tabindex="-1"` for custom).
- Keep disabled items focusable inside composite widgets (menu items, tabs,
  tree items, listbox options) so screen reader users can discover them.
- Use `aria-disabled="true"` when you want the element to remain focusable
  and announced as disabled, but not operable.
