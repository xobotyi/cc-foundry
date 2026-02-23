# Accessible Forms

Forms are among the most critical accessibility touchpoints. Every form control
must be labeled, every error must be announced, and every interaction must work
without a mouse.

## Labels

Every form control must have a programmatically associated label.

### Labeling Methods (in priority order)

1. **`<label>` with `for`/`id`** -- preferred for all visible labels.
2. **Wrapping `<label>`** -- wraps the control inside the label element.
3. **`aria-labelledby`** -- references another element's ID as the label.
4. **`aria-label`** -- string label when no visible label exists.

```html
<!-- Method 1: explicit for/id (preferred) -->
<label for="username">Username</label>
<input id="username" name="username" type="text" />

<!-- Method 2: wrapping label -->
<label>
  Username
  <input name="username" type="text" />
</label>

<!-- Method 3: aria-labelledby (for complex layouts) -->
<span id="qty-label">Quantity</span>
<input aria-labelledby="qty-label" type="number" />

<!-- Method 4: aria-label (no visible label) -->
<input aria-label="Search" type="search" />
```

**Rules:**
- Every `<input>`, `<select>`, and `<textarea>` must have a label.
- `placeholder` is not a substitute for a label -- it disappears when
  the user types and is not reliably read by all screen readers.
- The visible label text must be contained in the accessible name
  (WCAG 2.5.3 Label in Name) -- if the visible text says "Email", the
  `aria-label` must include "Email", not "Enter your electronic mail".

## Grouping

### Fieldset and Legend

Group related controls with `<fieldset>` and `<legend>`. The legend text
becomes part of the accessible name for each control in the group.

```html
<fieldset>
  <legend>Shipping address</legend>
  <label for="street">Street</label>
  <input id="street" name="street" type="text" />
  <label for="city">City</label>
  <input id="city" name="city" type="text" />
</fieldset>
```

**Required for:**
- Radio button groups
- Checkbox groups with a shared label
- Sets of related inputs (address fields, date parts)

### Group Role

Use `role="group"` with `aria-labelledby` when `<fieldset>` is impractical
(e.g., inside a flex or grid layout where fieldset styling causes issues).

## Required Fields

- Mark required fields with `required` attribute (native validation) or
  `aria-required="true"` (custom validation).
- Indicate required fields visually -- asterisk with a legend explaining
  "* Required" is the standard pattern.
- Do not rely on color alone to indicate required status.

```html
<p><span aria-hidden="true">*</span> indicates a required field</p>

<label for="name">Full name <span aria-hidden="true">*</span></label>
<input id="name" name="name" type="text" required />
```

## Validation and Error Messages

### Client-Side Validation

- Display errors adjacent to the invalid field.
- Associate each error with its field using `aria-describedby` or
  `aria-errormessage`.
- Set `aria-invalid="true"` on invalid fields.
- Use `role="alert"` or `aria-live="assertive"` on the error container
  for dynamic error messages so they are announced immediately.

```html
<label for="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid="true"
/>
<span id="email-error" role="alert">
  Please enter a valid email address.
</span>
```

### Error Summary

For forms with multiple errors, provide an error summary at the top:

```html
<div role="alert" aria-labelledby="error-heading">
  <h2 id="error-heading">2 errors found</h2>
  <ul>
    <li><a href="#email">Email: Please enter a valid email</a></li>
    <li><a href="#phone">Phone: Required field</a></li>
  </ul>
</div>
```

Move focus to the error summary when validation fails. The links inside
allow users to jump directly to each invalid field.

### Submission Feedback

- On success, announce the result with `role="status"` or
  `aria-live="polite"`.
- On failure, move focus to the error summary or first invalid field.
- Do not clear the form on failure -- preserve user input.

## Input Types and Autocomplete

Use appropriate `type` attributes for semantic input behavior:
- `type="email"` -- email keyboard on mobile, basic validation
- `type="tel"` -- numeric keyboard on mobile
- `type="url"` -- URL keyboard on mobile
- `type="number"` -- numeric input with spinner
- `type="password"` -- masked input with potential password manager

Use `autocomplete` attributes to help browsers and assistive technology
identify input purpose (WCAG 1.3.5):

```html
<input type="text" autocomplete="given-name" />
<input type="text" autocomplete="family-name" />
<input type="email" autocomplete="email" />
<input type="tel" autocomplete="tel" />
<input type="text" autocomplete="street-address" />
```

## Disabling Controls

- Use the native `disabled` attribute on form elements -- it removes
  them from the tab sequence and announces the disabled state.
- When using `aria-disabled="true"` instead, the element remains
  focusable and announced but you must prevent activation in JavaScript.
- When a control's disabled state changes dynamically, announce the
  change via a live region so screen reader users are informed.
