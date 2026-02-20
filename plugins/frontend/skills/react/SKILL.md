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

1. One component per file. Small helpers co-located in the same file are acceptable but
   extract when reused.
2. Always prefer function declarations for components.
3. Do not use `React.FC` — it adds implicit `children` typing and complicates generics.
   Use `function Component(props: Props)`.

### Composition

1. Props flow down, events flow up. One-way data flow. Children never mutate parent
   state directly — they call callbacks.
2. Composition over configuration. Pass JSX as `children` or render props instead of
   building components with dozens of boolean flags.
3. When a wrapper component updates its own state, React knows its `children` props
   haven't changed, so children skip re-rendering.
4. Use compound components (shared context between related sub-components) for complex
   UI patterns like flyout menus, tabs, accordions.
5. Prefer controlled components when parent needs to coordinate state across siblings.
   Prefer uncontrolled for isolated, self-contained UI.

### Refs

1. `ref` is a prop. Pass `ref` directly as a prop to function components.
   Never use `forwardRef` — it is deprecated.
2. Ref callbacks can return a cleanup function, called when the element unmounts.
3. Avoid implicit returns in ref callbacks — use block body `{}` not parentheses to
   prevent TypeScript confusion.

### Document Metadata

Render `<title>`, `<meta>`, `<link>` directly in components. React hoists them to
`<head>` automatically. Works with client-only apps, streaming SSR, and Server Components.

### Custom Elements

React provides full custom element support. Server rendering: primitive props render as
attributes, non-primitive props are omitted. Client rendering: props matching element
instance properties are assigned as properties, others as attributes.

## JSX Conventions

1. Self-closing tags for components without children: `<Input />`.
2. Boolean attributes without value: `<Input disabled />` not `disabled={true}`.
3. Fragments to avoid wrapper divs: `<>...</>` or `<Fragment key={id}>`.
4. Avoid `&&` with numbers — `count && <List />` renders `0`. Use `count > 0 && <List />`
   or a ternary.
5. Inline event handlers are fine for simple one-liners. Extract to named functions when
   logic is complex.
6. Spread props sparingly — `{...props}` makes it unclear what a component accepts.
   Prefer explicit props.
7. `key` on every list item. Stable, unique identifiers. Never use array index as key
   when items can reorder.
8. No side effects during render. Event handlers for user actions, Effects for
   synchronization, render for pure computation.

## Hooks

### `use()` — Context and Promises

1. Prefer `use(MyContext)` over `useContext(MyContext)`. `use()` can be called inside
   conditionals and loops — `useContext()` cannot.
2. `use()` always looks for the closest provider **above** the calling component.
3. `use(promise)` integrates with Suspense and Error Boundaries to read promise values.
4. Do not create promises inside Client Components during render — they recreate every
   render. Pass promises from Server Components or use a Suspense-compatible library.
5. In Server Components, prefer `async`/`await` over `use()`.
6. `use()` cannot be called in a try-catch block. Use Error Boundaries or
   `promise.catch()` instead.

### Hook Rules

1. Top level only. Never call hooks inside conditions, loops, or nested functions.
   React relies on call order. Exception: `use()` can be called conditionally.
2. React functions only. Call hooks from function components or custom hooks — never
   from regular JavaScript functions.
3. Exhaustive deps. Include all reactive values used inside the Effect in the dependency
   array. The linter enforces this — don't suppress it. If a dependency causes unwanted
   re-runs, restructure the code.
4. One Effect per concern. Don't merge unrelated sync logic into a single Effect.
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

1. Custom hooks share stateful logic, not state itself. Each call creates independent state.
2. Must start with `use` followed by a capital letter. Functions that don't call hooks
   should NOT start with `use`.
3. Name after the **use case**, not the lifecycle — `useOnlineStatus` not `useMount`.
4. Extract when: repetitive Effect logic across components, complex state + Effect combos,
   or synchronization with external systems.
5. Don't extract a single `useState` into a hook — that's unnecessary abstraction.

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

1. Minimal state. If it can be computed from existing props or state, compute it during
   render — don't store it.
2. Colocate state. Keep state as close to where it's used as possible. Lift up only when
   multiple components need it.
3. Use updater functions when next state depends on previous state:
   `setCount(prev => prev + 1)` not `setCount(count + 1)`.
4. Lazy initialization for expensive initial values — pass a function:
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
1. Reducers must be pure — same inputs = same output, no side effects.
2. Each action describes a single user interaction — dispatch `reset_form` not five
   separate `set_field` actions.
3. Actions describe what happened, not what to do — `'added_task'` not `'set_tasks'`.
4. Always have a `default` case that throws to catch typos early.
5. Use `as const` for action types in TypeScript.

### `key` for Identity Reset

Use `key` to reset a component's state when the conceptual entity changes:
`<Profile key={userId} />`. This is cleaner than using an Effect to reset state on
prop change.

### Context

1. Use `<Context value={...}>` directly — not `<Context.Provider value={...}>`.
2. Always wrap context consumption in a custom hook with a null check that throws if
   used outside the provider.
3. Try props and composition first. Context is not the first solution to prop drilling.
4. Keep context close to where it's used — not every context belongs at the app root.
5. Split logically — user settings separate from notifications. Don't put all state
   in one giant context.
6. Different `createContext()` calls are independent — they don't override each other.
7. For complex shared state, combine `useReducer` with context. Split into two contexts
   (data + dispatch) so components that only dispatch don't re-render on data changes.

### Actions

1. Use `useActionState` for form submissions and data mutations. It manages pending state,
   errors, and sequential action queuing automatically.
2. When passed to `<form action>`, React wraps submission in a transition automatically.
   When calling dispatch manually, wrap in `startTransition`.
3. Return error states instead of throwing to prevent skipping queued actions.
4. Use `useOptimistic` for instant UI feedback while async Actions complete. The optimistic
   state reverts to real value when the Action completes or fails.
5. Use a reducer form of `useOptimistic` for complex updates (e.g., adding to a list).
6. `useFormStatus` reads submission status of the nearest parent `<form>` — must be
   called from a component rendered **inside** a `<form>`, not in the same component.

## TypeScript

1. Type props with interfaces. `function Button(props: ButtonProps)` or destructure:
   `function Button({ label }: ButtonProps)`.
2. Don't use `React.FC`. Use plain function declarations.
3. Type events explicitly when needed:
   `(e: React.ChangeEvent<HTMLInputElement>) => void`.
4. Use `as const` for action types in reducers.

## Performance

### React Compiler

React Compiler is a build-time tool that automatically applies `memo`, `useMemo`, and
`useCallback` equivalents. When using the compiler:

1. Do not manually wrap components in `memo`, use `useMemo`, or `useCallback` in new code.
2. Leave existing memoization in place — removing it can change compilation output.
3. Use manual memoization only as an escape hatch (e.g., stabilizing an Effect dependency).
4. The compiler works with plain JavaScript and the Rules of React — no code changes needed.

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

1. Server Components render on the server, send only output to client. No client JS.
2. Can read databases, filesystems, APIs directly. Can be `async` functions.
3. Cannot use `useState`, `useEffect`, or any client-side React APIs.
4. Default (no directive needed). Client Components require `"use client"` at file top.
5. Server Components can render Client Components as children. Client Components cannot
   import Server Components directly.
6. `"use server"` marks Server Functions (Actions callable from client), not Server
   Components.
7. Automatic code-splitting: Client Component imports from Server Components are
   code-split automatically.

### Streaming with Suspense

Start rendering immediately, stream slower parts as they resolve. Create promises in
Server Components, pass to Client Components, read with `use()` inside `<Suspense>`.

### Bundle Optimization

1. Avoid barrel file imports — `import { Button } from '@/components/Button'` not
   `from '@/components'`.
2. Use `lazy(() => import('./Chart'))` with `<Suspense>` for heavy components.
3. Parallelize independent data fetches with `Promise.all`, never sequential awaits.

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

1. Use `waitFor` for assertions that need to wait for async operations.
2. One assertion per `waitFor` callback — multiple assertions cause slower failure detection.
3. Never put side-effects in `waitFor` — the callback may run multiple times.
4. Never pass an empty callback to `waitFor`.
5. Prefer `findBy` over `waitFor` + `getBy`.

### Testing Actions and Forms

Render the component and interact as a user would. For `useFormStatus` components,
ensure the component is rendered inside a `<form>` with an action prop.

### Rules

1. Don't wrap in `act` unnecessarily — `render()` and `fireEvent` already handle it.
   If you see `act` warnings, fix the root cause (state update after test finishes).
2. Don't add `role` attributes to native elements — `<button>` already has `role="button"`.
3. Make inputs accessible with `type` and `<label>` — this makes them queryable by role.
4. If you can't query by role, the element is probably not accessible to screen readers.
5. Don't call `cleanup` manually — it's automatic.
6. Use `@testing-library/jest-dom` matchers: `toBeInTheDocument()`, `toBeVisible()`,
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
