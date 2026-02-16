# Accessible Component Patterns

Patterns for building accessible interactive widgets following the WAI-ARIA
Authoring Practices Guide (APG). Each pattern defines the required ARIA roles,
states, properties, and keyboard interactions.

## Dialog (Modal)

A window overlaid on the primary content. Users cannot interact with content
outside the dialog while it is open.

### Structure

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Confirm deletion</h2>
  <p id="dialog-desc">This action cannot be undone.</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

### Requirements

| Aspect | Requirement |
|--------|-------------|
| Role | `role="dialog"` on container |
| Modal | `aria-modal="true"` |
| Label | `aria-labelledby` pointing to visible title |
| Description | `aria-describedby` for simple dialog messages |
| Focus on open | Move to first focusable element (or dialog title for complex content) |
| Focus trap | Tab/Shift+Tab cycles within dialog only |
| Escape | Closes the dialog |
| Focus on close | Returns to the element that triggered the dialog |
| Inert background | Prevent interaction with content behind the dialog |
| Close button | Include a visible close/cancel button |

### Native `<dialog>`

The HTML `<dialog>` element with `.showModal()` provides focus trapping, Escape
handling, and inert background natively. Prefer it over custom implementations.

```html
<dialog id="confirm-dialog">
  <h2>Confirm deletion</h2>
  <p>This action cannot be undone.</p>
  <form method="dialog">
    <button value="cancel">Cancel</button>
    <button value="confirm">Delete</button>
  </form>
</dialog>
```

## Tabs

A set of layered panels where one panel is visible at a time.

### Structure

```html
<div role="tablist" aria-label="Account settings">
  <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">
    Profile
  </button>
  <button role="tab" aria-selected="false" aria-controls="panel-2" id="tab-2"
    tabindex="-1">
    Security
  </button>
</div>

<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
  <!-- Profile content -->
</div>

<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
  <!-- Security content -->
</div>
```

### Requirements

| Aspect | Requirement |
|--------|-------------|
| Container | `role="tablist"` with `aria-label` |
| Tabs | `role="tab"` on each tab, inside/owned by tablist |
| Panels | `role="tabpanel"` linked via `aria-controls`/`aria-labelledby` |
| Selected | `aria-selected="true"` on active tab |
| Arrow keys | Left/Right (horizontal) or Up/Down (vertical) to switch tabs |
| Tab key | Moves focus into the active panel, not to the next tab |
| Home/End | Move to first/last tab |
| Roving tabindex | Active tab: `tabindex="0"`, others: `tabindex="-1"` |
| Orientation | Add `aria-orientation="vertical"` if tabs are stacked vertically |

## Accordion

Vertically stacked headings that expand/collapse associated content panels.

### Structure

```html
<div>
  <h3>
    <button
      aria-expanded="true"
      aria-controls="section-1"
      id="header-1"
    >
      Section Title
    </button>
  </h3>
  <div id="section-1" role="region" aria-labelledby="header-1">
    <!-- Content -->
  </div>
</div>
```

### Requirements

| Aspect | Requirement |
|--------|-------------|
| Trigger | `<button>` inside a heading element |
| State | `aria-expanded="true"/"false"` on the button |
| Association | `aria-controls` pointing to the panel ID |
| Panel role | `role="region"` with `aria-labelledby` referencing the header |
| Enter/Space | Toggle expanded/collapsed |
| Optional | Arrow keys between accordion headers, Home/End for first/last |

## Disclosure (Show/Hide)

A button that toggles visibility of a related content section. Simpler than
accordion -- no heading requirement, no multi-panel coordination.

```html
<button aria-expanded="false" aria-controls="details-1">
  More details
</button>
<div id="details-1" hidden>
  <!-- Hidden content -->
</div>
```

Toggle `aria-expanded` and the `hidden` attribute together.

## Menu and Menu Button

Action menus (not navigation menus). Use for lists of commands/actions.

### Menu Button

```html
<button
  aria-haspopup="true"
  aria-expanded="false"
  aria-controls="action-menu"
>
  Actions
</button>

<ul role="menu" id="action-menu" hidden>
  <li role="menuitem">Edit</li>
  <li role="menuitem">Duplicate</li>
  <li role="separator"></li>
  <li role="menuitem">Delete</li>
</ul>
```

### Requirements

| Aspect | Requirement |
|--------|-------------|
| Trigger | Button with `aria-haspopup="true"` and `aria-expanded` |
| Menu | `role="menu"` on the container |
| Items | `role="menuitem"` on each item |
| Enter/Space on trigger | Opens menu, focuses first item |
| Arrow Down on trigger | Opens menu, focuses first item |
| Arrow Up/Down | Navigate menu items |
| Enter | Activate focused item and close |
| Escape | Close menu, return focus to trigger |
| Tab | Close menu, move focus to next element after trigger |
| Home/End | First/last menu item |

**Do not use `role="menu"` for navigation menus.** Use `<nav>` with a list
of links instead.

## Combobox (Autocomplete)

A text input with an associated popup list of suggestions.

### Structure

```html
<label for="city-input">City</label>
<div>
  <input
    id="city-input"
    role="combobox"
    aria-expanded="false"
    aria-autocomplete="list"
    aria-controls="city-listbox"
    aria-activedescendant=""
  />
  <ul role="listbox" id="city-listbox" hidden>
    <li role="option" id="opt-1">New York</li>
    <li role="option" id="opt-2">Los Angeles</li>
  </ul>
</div>
```

### Requirements

| Aspect | Requirement |
|--------|-------------|
| Input | `role="combobox"`, `aria-expanded`, `aria-autocomplete` |
| List | `role="listbox"` with `role="option"` children |
| Association | `aria-controls` on input pointing to listbox |
| Active option | `aria-activedescendant` on input pointing to highlighted option |
| Arrow Down | Open list if closed; navigate down in list |
| Arrow Up | Navigate up in list |
| Enter | Select highlighted option, close list |
| Escape | Close list, clear selection highlight |
| Typing | Filter options and update list |

## Tooltip

A popup that displays information when an element receives keyboard focus or
mouse hover.

```html
<button aria-describedby="tip-1">Save</button>
<div role="tooltip" id="tip-1">Save your changes (Ctrl+S)</div>
```

### Requirements

1. Show on focus and hover; hide on blur, mouse leave, and Escape.
2. Use `aria-describedby` to associate the tooltip with its trigger.
3. Tooltip content must be hoverable (user can move pointer to tooltip).
4. Tooltip must persist until dismissed by user action.
5. Do not put interactive content inside tooltips.

## Alert

A brief, important message that does not require user action.

```html
<div role="alert">Your changes have been saved.</div>
```

- `role="alert"` implies `aria-live="assertive"` and `aria-atomic="true"`.
- Inject the alert element into the DOM (or update its content) to trigger
  announcement. Having `role="alert"` in the DOM before content is added
  is the most reliable pattern.
- Use sparingly -- assertive announcements interrupt the current screen
  reader output.

## Status Message

A non-urgent update that does not move focus.

```html
<div role="status">3 results found.</div>
```

- `role="status"` implies `aria-live="polite"` and `aria-atomic="true"`.
- Use for search result counts, form submission success, progress updates.
