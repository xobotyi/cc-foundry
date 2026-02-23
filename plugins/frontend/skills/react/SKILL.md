---
name: react
description: >-
  React component discipline: pure components, minimal state, effects as escape
  hatches. Invoke whenever task involves any interaction with React code —
  writing, reviewing, refactoring, debugging, or understanding JSX, hooks,
  component architecture, state management, or performance optimization.
---

# React

**Components are pure functions. State is minimal. Effects are escape hatches.
If you reach for useEffect, verify you actually need it.**

React rewards thinking in components: break UI into pieces, find minimal state,
identify where it lives, and wire data flow from parent to child. References contain
extended examples, rationale, and edge cases for each topic area.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Components | `references/components.md` | Composition, refs, metadata, custom elements |
| Hooks | `references/hooks.md` | Hook rules, custom hooks, `useSyncExternalStore` |
| State | `references/state.md` | Placement, reducers, context, actions |
| Performance | `references/performance.md` | Compiler, memoization, server components, streaming |
| Testing | `references/testing.md` | Query priority/variants, userEvent catalog, async patterns |

## Component Design

### Thinking in React

Build UI in five steps:

1. Break UI into a component hierarchy — each component does one thing.
2. Build a static version first — props only, no state, no interactivity.
3. Find minimal state — if it doesn't change, is passed from a parent, or can be
   computed, it is not state.
4. Identify where state lives — find every component that renders based on the state,
   find their closest common parent, put state there.
5. Add inverse data flow — pass state-setter callbacks down so children update parent
   state through event handlers.

### Purity

React assumes every component is a pure function. Same props + same state = same JSX.
Never mutate props, state, or variables declared before rendering.

- **Local mutation is fine.** Creating and mutating objects/arrays within the same render
  is safe — the mutation is invisible outside that render.
- **Event handlers don't need to be pure** — they run outside of rendering.

| Side effect type | Where it belongs |
|-----------------|-----------------|
| User clicks, form submits | Event handlers |
| Sync with external system (DOM, network) | `useEffect` (last resort) |
| Data transformation | Compute during render |
| Shared logic between handlers | Extract a function, call from handlers |

### Component Structure

- One component per file. Small helpers co-located in the same file are acceptable but
  extract when reused.
- Always prefer function declarations for components.
- Do not use `React.FC` — it adds implicit `children` typing and complicates generics.
  Use `function Component(props: Props)`.

### Component Body Organization

Separate logic from rendering. The component body handles computation, state, and handler
definitions. JSX is declarative — it references results, not processes.

- **Handler object** — group all event handlers in a single `handle` object. This creates
  a clear boundary between logic and rendering:
  ```tsx
  const handle = {
    submit() { /* ... */ },
    inputChange(e: ChangeEvent<HTMLInputElement>) { setName(e.target.value); },
    keyDown(e: KeyboardEvent) { if (e.key === 'Enter') handle.submit(); },
  };
  ```
  Reference in JSX as `onChange={handle.inputChange}`. Never inline handler logic in JSX.
- **Pre-render computation** — move list rendering and derived JSX out of the return
  statement into component body variables:
  ```tsx
  const tabElements: ReactNode[] = [];
  for (const tab of allTabs) {
    tabElements.push(<Tab key={tab.id}>{tab.name}</Tab>);
  }
  return <TabList>{tabElements}</TabList>;
  ```
  JSX `.map()` inside the return statement is discouraged — compute element arrays in the
  body, reference them in JSX.
- **Conditional rendering** — simple conditions (`{isVisible && <Component />}`) are
  acceptable inline in JSX. When the condition is complex or involves multiple branches,
  compute the result in the component body and reference the variable in JSX.

### Composition

- Props flow down, events flow up. One-way data flow. Children never mutate parent
  state directly — they call callbacks.
- Composition over configuration. Pass JSX as `children` or render props instead of
  building components with dozens of boolean flags.
- When a wrapper component updates its own state, React knows its `children` props
  haven't changed, so children skip re-rendering.
- Use compound components (shared context between related sub-components) for complex
  UI patterns like flyout menus, tabs, accordions.
- Prefer controlled components when parent needs to coordinate state across siblings.
  Prefer uncontrolled for isolated, self-contained UI.

### Refs

- `ref` is a prop. Pass `ref` directly as a prop to function components.
  Never use `forwardRef` — it is deprecated.
- Ref callbacks can return a cleanup function, called when the element unmounts.
- Avoid implicit returns in ref callbacks — use block body `{}` not parentheses to
  prevent TypeScript confusion.

### Document Metadata

Render `<title>`, `<meta>`, `<link>` directly in components. React hoists them to
`<head>` automatically. Works with client-only apps, streaming SSR, and Server Components.

### Custom Elements

React provides full custom element support. Server rendering: primitive props render as
attributes, non-primitive props are omitted. Client rendering: props matching element
instance properties are assigned as properties, others as attributes.

## JSX Conventions

- Self-closing tags for components without children: `<Input />`.
- Boolean attributes without value: `<Input disabled />` not `disabled={true}`.
- Fragments to avoid wrapper divs: `<>...</>` or `<Fragment key={id}>`.
- Avoid `&&` with numbers — `count && <List />` renders `0`. Use `count > 0 && <List />`
  or a ternary.
- Never inline handler logic in JSX. Group all handlers in a `handle` object in the
  component body (see Component Body Organization).
- Spread props sparingly — `{...props}` makes it unclear what a component accepts.
  Prefer explicit props.
- `key` on every list item. Stable, unique identifiers. Never use array index as key
  when items can reorder.
- No side effects during render. Event handlers for user actions, Effects for
  synchronization, render for pure computation.

## Hooks

### `use()` — Context and Promises

- Prefer `use(MyContext)` over `useContext(MyContext)`. `use()` can be called inside
  conditionals and loops — `useContext()` cannot.
- `use()` always looks for the closest provider **above** the calling component.
- `use(promise)` integrates with Suspense and Error Boundaries to read promise values.
- Do not create promises inside Client Components during render — they recreate every
  render. Pass promises from Server Components or use a Suspense-compatible library.
- In Server Components, prefer `async`/`await` over `use()`.
- `use()` cannot be called in a try-catch block. Use Error Boundaries or
  `promise.catch()` instead.

### Hook Rules

- Top level only. Never call hooks inside conditions, loops, or nested functions.
  React relies on call order. Exception: `use()` can be called conditionally.
- React functions only. Call hooks from function components or custom hooks — never
  from regular JavaScript functions.
- Exhaustive deps. Include all reactive values used inside the Effect in the dependency
  array. The linter enforces this — don't suppress it. If a dependency causes unwanted
  re-runs, restructure the code.
- One Effect per concern. Don't merge unrelated sync logic into a single Effect.
  Separate Effects for separate external systems.

### Effects Are Escape Hatches

Use Effects **only** to synchronize with external systems (DOM APIs, network, browser
events). Not for transforming data, handling user events, or state derivation.

**You don't need an Effect for:**

| Situation | Do this instead |
|-----------|----------------|
| Transform data for rendering | Compute during render |
| Handle user events | Call in event handler |
| Reset state on prop change | Use `key={userId}` on the component |
| Adjust state on prop change | Compute: `items.find(...)` during render |
| Notify parent of state change | Call `onChange` in the event handler |
| Share logic between handlers | Extract a function, call from both handlers |
| Chain state updates | Calculate all state in one event handler |

**You DO need an Effect for:**
- Subscribing to browser events (online/offline, resize, intersection)
- Connecting to external systems (WebSocket, third-party widgets)
- Fetching data that depends on current props/state (with cleanup)
- Synchronizing with non-React DOM (imperative animations, canvas)

Every Effect that subscribes must return a cleanup function. Data fetching in Effects
must use a cleanup flag (`let ignore = false`) to prevent race conditions. Prefer a
data-fetching library or `use()` with Suspense over raw Effects for fetching.

### Custom Hooks

- Custom hooks share stateful logic, not state itself. Each call creates independent state.
- Must start with `use` followed by a capital letter. Functions that don't call hooks
  should NOT start with `use`.
- Name after the **use case**, not the lifecycle — `useOnlineStatus` not `useMount`.
- Extract when: repetitive Effect logic across components, complex state + Effect combos,
  or synchronization with external systems.
- Don't extract a single `useState` into a hook — that's unnecessary abstraction.

**Return value conventions:**
- Single value: return directly (`return isOnline`)
- Value + setter pair: return tuple (`return [value, setValue] as const`)
- Multiple related values: return object (`return { value, onChange, reset }`)

### `useSyncExternalStore`

For subscribing to external data stores, prefer `useSyncExternalStore` over manual
Effect + state. Provide a `subscribe` function, a client snapshot getter, and a server
snapshot getter for SSR.

## State Management

### State Placement Decision Tree

1. Does only one component use it? Keep it local with `useState`.
2. Do siblings need it? Lift to their closest common parent.
3. Is prop drilling painful (5+ levels)? Try composition first — restructure components
   to pass JSX as `children`.
4. Still painful after composition? Use Context with `use()`.
5. Is it server data? Use a data-fetching library — not `useState` + `useEffect`.

```
Local state → Lift state up → Composition → Context → External library
```

### Server Cache vs UI State

| Category | Examples | Tool |
|----------|----------|------|
| UI state | Modal open, form input, selected tab | `useState`, `useReducer`, Context |
| Server cache | User data, search results, API responses | react-query, SWR, framework loaders |

Never reinvent caching, deduplication, and race condition handling with raw `useState`.

### `useState`

- Minimal state. If it can be computed from existing props or state, compute it during
  render — don't store it.
- Colocate state. Keep state as close to where it's used as possible. Lift up only when
  multiple components need it.
- Use updater functions when next state depends on previous state:
  `setCount(prev => prev + 1)` not `setCount(count + 1)`.
- Lazy initialization for expensive initial values — pass a function:
  `useState(() => createInitialState())` not `useState(createInitialState())`.

### `useReducer`

Use when state updates are complex — many event handlers modifying the same state, or
when next state depends on previous state in non-trivial ways.

| Signal | Tool |
|--------|------|
| Single value, simple updates | `useState` |
| Multiple related values, complex transitions | `useReducer` |
| Many event handlers doing similar state updates | `useReducer` |
| Need to test state logic in isolation | `useReducer` |

**Reducer rules:**
- Reducers must be pure — same inputs = same output, no side effects.
- Each action describes a single user interaction — dispatch `reset_form` not five
  separate `set_field` actions.
- Actions describe what happened, not what to do — `'added_task'` not `'set_tasks'`.
- Always have a `default` case that throws to catch typos early.
- Use `as const` for action types in TypeScript.

### `key` for Identity Reset

Use `key` to reset a component's state when the conceptual entity changes:
`<Profile key={userId} />`. This is cleaner than using an Effect to reset state on
prop change.

### Context

- Use `<Context value={...}>` directly — not `<Context.Provider value={...}>`.
- Always wrap context consumption in a custom hook with a null check that throws if
  used outside the provider.
- Try props and composition first. Context is not the first solution to prop drilling.
- Keep context close to where it's used — not every context belongs at the app root.
- Split logically — user settings separate from notifications. Don't put all state
  in one giant context.
- Different `createContext()` calls are independent — they don't override each other.
- For complex shared state, combine `useReducer` with context. Split into two contexts
  (data + dispatch) so components that only dispatch don't re-render on data changes.

### Actions

- Use `useActionState` for form submissions and data mutations. It manages pending state,
  errors, and sequential action queuing automatically.
- When passed to `<form action>`, React wraps submission in a transition automatically.
  When calling dispatch manually, wrap in `startTransition`.
- Return error states instead of throwing to prevent skipping queued actions.
- Use `useOptimistic` for instant UI feedback while async Actions complete. The optimistic
  state reverts to real value when the Action completes or fails.
- Use a reducer form of `useOptimistic` for complex updates (e.g., adding to a list).
- `useFormStatus` reads submission status of the nearest parent `<form>` — must be
  called from a component rendered **inside** a `<form>`, not in the same component.

## TypeScript

- Every component with props must have a dedicated named type (e.g., `ButtonProps`).
  Never define prop types inline in the function signature. Use
  `function Button(props: ButtonProps)` or destructure:
  `function Button({ label }: ButtonProps)`.
- Don't use `React.FC`. Use plain function declarations.
- Type events explicitly when needed:
  `(e: React.ChangeEvent<HTMLInputElement>) => void`.
- Use `as const` for action types in reducers.

## Performance

### React Compiler

React Compiler is a build-time tool that automatically applies `memo`, `useMemo`, and
`useCallback` equivalents. When using the compiler:

- Do not manually wrap components in `memo`, use `useMemo`, or `useCallback` in new code.
- Leave existing memoization in place — removing it can change compilation output.
- Use manual memoization only as an escape hatch (e.g., stabilizing an Effect dependency).
- The compiler works with plain JavaScript and the Rules of React — no code changes needed.

### Optimization Decision Tree

1. Is there a perceptible lag? No — don't optimize.
2. Is the render itself slow? Profile it. Fix the computation.
3. Are components re-rendering unnecessarily? Restructure first (push state down, lift
   content up).
4. Still slow after restructuring? Apply `memo`, `useMemo`, `useCallback`.

**Fix the slow render before you fix the re-render.** Restructuring beats memoization.

### Manual Memoization (When Compiler Is Unavailable)

- `memo(Component)` — skip re-rendering when props unchanged. Useful when: component
  re-renders often with same props, re-rendering is expensive, parent re-renders for
  unrelated reasons. Useless when: props always differ, component is cheap, or it
  re-renders from its own state/context anyway.
- `useMemo(fn, deps)` — cache computed values. Only for genuinely expensive work or
  preserving references passed to memoized children.
- `useCallback(fn, deps)` — cache function references. Use when passing callbacks to
  memoized children, in custom hooks returning functions, or as Effect dependencies.

### Server Components

- Server Components render on the server, send only output to client. No client JS.
- Can read databases, filesystems, APIs directly. Can be `async` functions.
- Cannot use `useState`, `useEffect`, or any client-side React APIs.
- Default (no directive needed). Client Components require `"use client"` at file top.
- Server Components can render Client Components as children. Client Components cannot
  import Server Components directly.
- `"use server"` marks Server Functions (Actions callable from client), not Server
  Components.
- Automatic code-splitting: Client Component imports from Server Components are
  code-split automatically.

### Streaming with Suspense

Start rendering immediately, stream slower parts as they resolve. Create promises in
Server Components, pass to Client Components, read with `use()` inside `<Suspense>`.

### Bundle Optimization

- Avoid barrel file imports — `import { Button } from '@/components/Button'` not
  `from '@/components'`.
- Use `lazy(() => import('./Chart'))` with `<Suspense>` for heavy components.
- Parallelize independent data fetches with `Promise.all`, never sequential awaits.

### Error Handling

Use `onCaughtError` and `onUncaughtError` root options on `createRoot` for fine-grained
error reporting — caught errors come from Error Boundaries, uncaught from unhandled throws.

## Testing

### Philosophy

Tests resemble how users interact with the application. Query by what users see (roles,
text, labels), not by implementation details (class names, component internals, test IDs).

### Setup

Always use `screen` for queries — never destructure from `render()`. Set up
`userEvent.setup()` before rendering.

### Queries

Use the highest-priority query that works: `getByRole` > `getByLabelText` >
`getByText` > `getByTestId` (last resort). Use `getBy` for present elements, `queryBy`
for asserting absence, `findBy` for async appearance. Full query priority and variant
tables in `references/testing.md`.

### User Interactions

Always prefer `userEvent` over `fireEvent` — it simulates real user behavior (focus,
blur, keyDown/keyPress/keyUp sequence). Full method catalog in `references/testing.md`.

### Async Patterns

- Use `waitFor` for assertions that need to wait for async operations.
- One assertion per `waitFor` callback — multiple assertions cause slower failure detection.
- Never put side-effects in `waitFor` — the callback may run multiple times.
- Never pass an empty callback to `waitFor`.
- Prefer `findBy` over `waitFor` + `getBy`.

### Testing Actions and Forms

Render the component and interact as a user would. For `useFormStatus` components,
ensure the component is rendered inside a `<form>` with an action prop.

### Rules

- Don't wrap in `act` unnecessarily — `render()` and `fireEvent` already handle it.
  If you see `act` warnings, fix the root cause (state update after test finishes).
- Don't add `role` attributes to native elements — `<button>` already has `role="button"`.
- Make inputs accessible with `type` and `<label>` — this makes them queryable by role.
- If you can't query by role, the element is probably not accessible to screen readers.
- Don't call `cleanup` manually — it's automatic.
- Use `@testing-library/jest-dom` matchers: `toBeInTheDocument()`, `toBeVisible()`,
  `toBeDisabled()`, `toHaveTextContent()`, `toHaveAttribute()`, `toHaveValue()`.

## Application

When **writing** React code:
- Apply all conventions silently — don't narrate each rule.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.
- Always prefer function declarations for components.

When **reviewing** React code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

## Integration

This skill provides React-specific conventions. The coding skill governs workflow;
language skills govern JS/TS choices; this skill governs component architecture,
hooks, state management, and rendering discipline.
