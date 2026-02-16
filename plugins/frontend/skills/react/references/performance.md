# Performance

React Compiler, manual memoization, Server Components, and bundle optimization.

## React Compiler

React Compiler is a build-time tool that automatically applies the equivalent
of `memo`, `useMemo`, and `useCallback` to all components and hooks. When
using the compiler, manual memoization is largely unnecessary.

### What It Does

1. **Skips cascading re-renders.** When a parent re-renders, only genuinely
   affected children re-render — without manual `memo()` wrapping.
2. **Memoizes expensive calculations.** Function calls inside components
   and hooks are automatically cached.
3. **Handles subtle bugs.** The compiler correctly optimizes patterns that
   break manual memoization (e.g., inline arrow functions as props).

### What to Do About useMemo, useCallback, and memo

- **New code:** Rely on the compiler. Use `useMemo`/`useCallback` only
  as an escape hatch when you need precise control (e.g., stabilizing
  an Effect dependency).
- **Existing code:** Leave existing memoization in place (removing it can
  change compilation output) or test carefully before removing.
- The compiler works with plain JavaScript and the Rules of React — no
  code changes needed.

### When Compiler Is Not Available

If your project does not use React Compiler, follow the manual memoization
strategies below. But prefer enabling the compiler first.

## Before You Optimize

**Fix the slow render before you fix the re-render.** Most performance
problems come from slow rendering logic, not unnecessary re-renders.

### Optimization Decision Tree

1. Is there a perceptible lag? If no — don't optimize.
2. Is the render itself slow? Profile it. Fix the computation.
3. Are components re-rendering unnecessarily? Try restructuring first.
4. Still slow after restructuring? Apply `memo`, `useMemo`, `useCallback`.

**Restructuring beats memoization.** Pushing state down or lifting content
up often eliminates re-renders without any memoization API.

## Manual Memoization (Escape Hatch)

Use these only when React Compiler is not available or when you need
precise control over a specific memoization boundary.

### memo

Wraps a component to skip re-rendering when props are unchanged:

```tsx
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});
```

**When memo helps:**
- Component re-renders often with the same exact props
- Re-rendering is visibly expensive
- Parent re-renders frequently for unrelated reasons

**When memo is useless:**
- Props are always different (new object/array/function each render)
- Component is cheap to render
- Component always re-renders anyway (its own state or context changes)

### useMemo

Caches a computed value between renders:

```tsx
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

Only use for genuinely expensive work or for preserving references
passed to memoized children.

### useCallback

Caches a function reference between renders:

```tsx
const handleClick = useCallback(() => { doSomething(id); }, [id]);
```

Use when passing callbacks to memoized children, in custom hooks that
return functions, or as Effect dependencies.

## Server Components

Server Components render on the server and send only the output to the
client. The component code and its dependencies are never included in the
client bundle.

### Key Properties

- **No client-side JavaScript.** Server Component code stays on the server.
- **Direct data access.** Can read databases, filesystems, APIs directly.
- **Async/await in components.** Server Components can be `async` functions.
- **No hooks, no state, no effects.** They cannot use `useState`, `useEffect`,
  or any client-side React APIs.
- **Automatic code-splitting.** Client Component imports from Server
  Components are automatically code-split.

### Server vs Client Components

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| Render environment | Server (build or request time) | Browser |
| Bundle impact | Zero — not shipped | Included in JS bundle |
| Data access | Direct (DB, filesystem, APIs) | Via fetch/API calls |
| Interactivity | None — no state, no events | Full — hooks, events, DOM |
| Directive | Default (no directive needed) | `"use client"` at top of file |

### Composition Pattern

Server Components can render Client Components as children.
Client Components cannot import Server Components directly.

```tsx
// Server Component — fetches data, no client JS
async function NotesPage() {
  const notes = await db.notes.getAll();
  return (
    <div>
      {notes.map(note => (
        <Expandable key={note.id}>
          <p>{note.content}</p>
        </Expandable>
      ))}
    </div>
  );
}

// Client Component — handles interactivity
"use client";
function Expandable({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}>Toggle</button>
      {expanded && children}
    </div>
  );
}
```

### Server Functions (Server Actions)

Server Functions allow Client Components to call async functions executed
on the server. Defined with the `"use server"` directive:

```tsx
// actions.ts
'use server';

export async function addTodo(text: string) {
  await db.todos.create({ text });
}
```

**`"use server"` marks Server Functions, not Server Components.** Server
Components need no directive — they are the default.

### Streaming with Suspense

Start rendering immediately, stream slower parts as they resolve:

```tsx
async function Page({ id }: { id: string }) {
  const note = await db.notes.get(id);
  const commentsPromise = db.comments.get(note.id);

  return (
    <div>
      <NoteContent note={note} />
      <Suspense fallback={<p>Loading comments...</p>}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </div>
  );
}
```

## Bundle Optimization

### Avoid Barrel File Imports

```tsx
// BAD — may pull in entire library
import { Button } from '@/components';

// GOOD — direct import
import { Button } from '@/components/Button';
```

### Dynamic Imports for Heavy Components

```tsx
const Chart = lazy(() => import('./Chart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart data={data} />
    </Suspense>
  );
}
```

### Parallelize Independent Data Fetches

```tsx
// BAD — sequential waterfall
const user = await getUser(id);
const posts = await getPosts(id);

// GOOD — parallel
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
```

## Error Handling

Use `onCaughtError` and `onUncaughtError` root options for fine-grained
error reporting:

```tsx
const root = createRoot(document.getElementById('root'), {
  onCaughtError(error, errorInfo) {
    // Errors caught by Error Boundaries
    logToService('caught', error, errorInfo);
  },
  onUncaughtError(error, errorInfo) {
    // Errors not caught by any Error Boundary
    logToService('uncaught', error, errorInfo);
  },
});
```

## Anti-Patterns

| Don't | Do |
|-------|------|
| Wrap every component in `memo` | Let React Compiler handle it; profile first |
| `useMemo` for cheap computations | Just compute inline |
| `useCallback` on every function | Only when needed as escape hatch |
| Fetch in `useEffect` without cleanup | Use a data library or `use()` with Suspense |
| `"use client"` on everything | Default to Server Components; add `"use client"` only for interactivity |
| Sequential awaits for independent data | `Promise.all` for parallel fetches |
| Barrel file imports | Direct imports to specific modules |
