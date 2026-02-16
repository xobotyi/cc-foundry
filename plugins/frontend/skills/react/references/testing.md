# Testing

React Testing Library conventions, query priority, userEvent, and common mistakes.

## Philosophy

Tests should resemble how users interact with the application. Query by
what users see (roles, text, labels), not by implementation details
(class names, component internals, test IDs).

## Setup

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

Always use `screen` for queries — never destructure from `render()`:

```tsx
// BAD
const { getByRole } = render(<Example />);
const button = getByRole('button');

// GOOD
render(<Example />);
const button = screen.getByRole('button');
```

## Query Priority

Use queries in this order. Prefer the highest-priority query that works:

| Priority | Query | When to use |
|----------|-------|-------------|
| 1 | `getByRole` | Almost always — buttons, inputs, headings, links |
| 2 | `getByLabelText` | Form inputs with associated labels |
| 3 | `getByPlaceholderText` | When label is absent (not ideal) |
| 4 | `getByText` | Non-interactive elements (paragraphs, spans) |
| 5 | `getByDisplayValue` | Current value of filled-in inputs |
| 6 | `getByAltText` | Images |
| 7 | `getByTitle` | Rarely — title attribute |
| 8 | `getByTestId` | Last resort — when nothing else works |

### getByRole Is Your Default

`getByRole` queries by ARIA role and accessible name. It works with
implicit roles — no need to add `role="button"` to `<button>`:

```tsx
// <button>Submit</button>
screen.getByRole('button', { name: /submit/i });

// <h1>Welcome</h1>
screen.getByRole('heading', { name: /welcome/i, level: 1 });

// <input type="text" /> with <label>Email</label>
screen.getByRole('textbox', { name: /email/i });

// <a href="/about">About</a>
screen.getByRole('link', { name: /about/i });
```

## Query Variants

| Variant | No match | Multiple matches | Use for |
|---------|----------|------------------|---------|
| `getBy` | Throws | Throws | Element exists right now |
| `queryBy` | Returns `null` | Throws | Asserting element does NOT exist |
| `findBy` | Throws (after timeout) | Throws | Waiting for element to appear |

### Rules

1. **Use `getBy` by default.** It throws a helpful error with the full DOM
   if the element isn't found.
2. **Use `queryBy` ONLY to assert non-existence:**
   ```tsx
   expect(screen.queryByRole('alert')).not.toBeInTheDocument();
   ```
3. **Use `findBy` for async elements** (after data fetches, transitions):
   ```tsx
   const alert = await screen.findByRole('alert');
   ```
4. **Never use `queryBy` to assert existence** — `getBy` gives better errors.

## User Interactions

Always prefer `userEvent` over `fireEvent`. It simulates real user behavior
(keyDown, keyPress, keyUp, focus, blur) rather than dispatching a single event.

```tsx
const user = userEvent.setup();

// BAD — fires a single change event
fireEvent.change(input, { target: { value: 'hello' } });

// GOOD — fires keyDown, keyPress, keyUp for each character
await user.type(input, 'hello');

// BAD — fires a single click event
fireEvent.click(button);

// GOOD — fires pointerDown, mouseDown, pointerUp, mouseUp, click
await user.click(button);
```

### Common userEvent Methods

```tsx
const user = userEvent.setup();

await user.click(element);           // Click
await user.dblClick(element);        // Double click
await user.type(input, 'text');      // Type text character by character
await user.clear(input);             // Clear input
await user.selectOptions(select, 'value'); // Select option
await user.tab();                    // Tab to next focusable element
await user.keyboard('{Enter}');      // Press specific key
```

## Testing Actions and Forms

When testing components that use `useActionState` or form Actions, render
the component and interact with the form as a user would:

```tsx
const user = userEvent.setup();
render(<MyForm />);

await user.type(screen.getByRole('textbox', { name: /name/i }), 'Alice');
await user.click(screen.getByRole('button', { name: /submit/i }));

// Assert on the result
await screen.findByText('Submitted successfully');
```

For components using `useFormStatus`, ensure the component is rendered
inside a `<form>` with an action prop in your test setup.

## Async Patterns

### waitFor

Use for assertions that need to wait for async operations:

```tsx
await waitFor(() => {
  expect(screen.getByRole('alert')).toHaveTextContent('Error');
});
```

### waitFor Rules

1. **Put one assertion per `waitFor` callback.** Multiple assertions
   cause slower failure detection.
2. **Never put side-effects in `waitFor`.** The callback may run multiple
   times. Fire events outside, assert inside.
3. **Prefer `findBy` over `waitFor` + `getBy`:**
   ```tsx
   // BAD
   const button = await waitFor(() =>
     screen.getByRole('button', { name: /submit/i })
   );

   // GOOD
   const button = await screen.findByRole('button', { name: /submit/i });
   ```
4. **Never pass an empty callback** to `waitFor`. Always wait for a
   specific assertion.

## Assertions

Use `@testing-library/jest-dom` for better error messages:

```tsx
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent(/hello/i);
expect(element).toHaveAttribute('href', '/about');
expect(element).toHaveClass('active');
expect(element).toHaveFocus();
expect(element).toHaveValue('hello');
```

## Don't Wrap in act Unnecessarily

`render()` and `fireEvent` are already wrapped in `act`. Adding another
`act` wrapper does nothing. If you see `act` warnings, fix the root cause
(a state update after the test finishes) instead of wrapping in `act`.

## Accessibility in Tests

1. **Don't add `role` attributes to native elements.** `<button>` already
   has `role="button"`.
2. **Make inputs accessible with `type` and `<label>`.** This makes them
   queryable by role.
3. **Query by role to enforce accessibility.** If you can't query an element
   by role, it's probably not accessible to screen reader users either.

## Anti-Patterns

| Don't | Do |
|-------|------|
| `const { getByRole } = render(...)` | `render(...); screen.getByRole(...)` |
| `fireEvent.change(input, ...)` | `await user.type(input, ...)` |
| `screen.queryByRole('alert')` to assert existence | `screen.getByRole('alert')` |
| `container.querySelector('.btn')` | `screen.getByRole('button')` |
| `getByTestId` as first choice | `getByRole`, `getByLabelText`, `getByText` |
| `await waitFor(() => {})` (empty callback) | `await waitFor(() => expect(...))` |
| Side-effects inside `waitFor` | Fire events outside, assert inside |
| Multiple assertions in one `waitFor` | One assertion per `waitFor` |
| Wrapping everything in `act` | Let `render`/`fireEvent` handle it |
| `role="button"` on `<button>` | Native elements have implicit roles |
| Manual `afterEach(cleanup)` | Automatic — don't call `cleanup` |
