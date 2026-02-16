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
identify where it lives, and wire data flow from parent to child.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| Component design, purity, composition, JSX patterns, refs, metadata | [components.md](references/components.md) |
| Hooks, `use()`, Effects, custom hooks, hook rules | [hooks.md](references/hooks.md) |
| useState, useReducer, context, state placement, Actions | [state.md](references/state.md) |
| React Compiler, manual memoization, Server Components, bundle size | [performance.md](references/performance.md) |
| React Testing Library, query priority, userEvent, waitFor | [testing.md](references/testing.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL React code. No exceptions.

### Component Design

1. **Components are pure functions.** Same props + same state = same JSX.
   Never mutate props, state, or variables declared before rendering.
2. **One component per file.** Small helpers co-located in the same file
   are acceptable but should be extracted when reused.
3. **Think in React.** Break UI into component hierarchy, find minimal
   state, identify which component owns it, add inverse data flow.
4. **Props flow down, events flow up.** One-way data flow. Children
   never mutate parent state directly — they call callbacks.
5. **Composition over configuration.** Pass JSX as `children` or render
   props instead of building components with dozens of boolean flags.
6. **ref is a prop.** Pass `ref` directly as a prop to function
   components. Do not use `forwardRef`.

### State Management

1. **Minimal state.** If it can be computed from existing props or state,
   compute it during render — don't store it in state.
2. **Colocate state.** Keep state as close to where it's used as possible.
   Lift up only when multiple components need it.
3. **`key` for identity.** Use `key` to reset component state when the
   conceptual entity changes (e.g., `<Profile key={userId} />`).
4. **Derive, don't sync.** Never use an Effect to sync one piece of state
   with another. Compute derived values during render.
5. **Server cache is not UI state.** Use a data-fetching library
   (react-query, SWR, framework loaders) for server data — not raw
   useState + useEffect.
6. **Actions for mutations.** Use `useActionState` for form submissions
   and data mutations. Combine with `useOptimistic` for instant feedback.

### Hooks

1. **Only call hooks at the top level.** Never in loops, conditions,
   or nested functions — except `use()`, which can be called conditionally.
2. **`use()` for context and promises.** Prefer `use(MyContext)` over
   `useContext(MyContext)`. Use `use(promise)` with Suspense for data.
3. **Custom hooks start with `use`.** Functions that don't call hooks
   should NOT be named `useX` — use a regular name like `getX`.
4. **Effects are escape hatches.** Use them only to synchronize with
   external systems (DOM APIs, network, browser events). Not for
   transforming data, handling user events, or state derivation.
5. **Every Effect needs cleanup if it subscribes.** Return a cleanup
   function for subscriptions, timers, and event listeners.

### JSX and Rendering

1. **`key` on every list item.** Stable, unique identifiers. Never
   use array index as key when items can reorder.
2. **No side effects during render.** Event handlers for user actions,
   Effects for synchronization, render for pure computation.
3. **Conditional rendering with early returns or ternaries.** Not
   `&&` with numbers (0 renders as text).
4. **Document metadata in components.** Render `<title>`, `<meta>`,
   `<link>` directly — React hoists them to `<head>` automatically.

### TypeScript

1. **Type props with interfaces.** `function Button(props: ButtonProps)`
   or destructure: `function Button({ label }: ButtonProps)`.
2. **Don't use `React.FC`.** It adds implicit `children` typing and
   complicates generics. Use plain function declarations.
3. **Type events explicitly when needed.**
   `(e: React.ChangeEvent<HTMLInputElement>) => void`.
4. **Use `as const` for action types** in reducers.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `forwardRef(function MyInput(...))` | `function MyInput({ ref, ...props })` |
| `useContext(MyContext)` | `use(MyContext)` |
| `<MyContext.Provider value={...}>` | `<MyContext value={...}>` |
| `useEffect(() => setFullName(first + last), [first, last])` | `const fullName = first + ' ' + last` |
| `useEffect(() => setFilteredList(filter(items)), [items])` | `const filtered = useMemo(() => filter(items), [items])` |
| `useEffect(() => onChange(value), [value])` | Call `onChange` in the event handler |
| `useEffect(() => fetch(...).then(setData), [])` without cleanup | Data library, or `use(promise)` with Suspense |
| `useState` + manual pending/error for mutations | `useActionState` with `useOptimistic` |
| `useMemo`/`useCallback`/`memo` everywhere | React Compiler handles it; use manually only as escape hatch |
| `useState` for computed values | Compute during render or `useMemo` |
| `key={index}` on reorderable lists | `key={item.id}` |
| Prop drilling 5+ levels deep | Context, composition, or component restructuring |
| `React.FC<Props>` | `function Component(props: Props)` |
| Global state for form input values | Local `useState` |
| `fireEvent.change(input, ...)` in tests | `userEvent.type(input, ...)` |

## Application

When **writing** React code:
- Apply all conventions silently — don't narrate each rule.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.
- Always prefer function declarations for components.

When **reviewing** React code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

```
Bad review comment:
  "According to React best practices, you should avoid using
   useEffect to derive state from other state."

Good review comment:
  "Remove the Effect — compute `fullName` during render:
   `const fullName = first + ' ' + last`"
```

## Integration

This skill provides React-specific conventions alongside other skills:

1. **Coding** — Discovery, planning, verification discipline
2. **JavaScript/TypeScript** — Language-level idioms
3. **React** — Framework-specific patterns (this skill)
4. **CSS** — Styling conventions for component styles

The coding skill governs workflow; language skills govern JS/TS choices;
this skill governs React component architecture, hooks patterns, state
management, and rendering discipline.
