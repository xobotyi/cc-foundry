# Hooks

The `use()` API, custom hooks, Effects, and hook design patterns.

## `use()` — Read Context and Promises

`use()` reads resources during render. It accepts context or promises.

### Reading Context

`use()` replaces `useContext()` and is more flexible — it can be called
inside conditionals and loops:

```tsx
import { use } from 'react';

function Button() {
  const theme = use(ThemeContext);
  return <button className={`btn-${theme}`}>Click</button>;
}

// Works after early returns — useContext cannot do this
function HorizontalRule({ show }: { show: boolean }) {
  if (!show) return null;

  const theme = use(ThemeContext);
  return <hr className={theme} />;
}
```

`use()` always looks for the closest provider **above** the calling component.
It does not consider providers in the same component.

### Reading Promises

`use()` integrates with Suspense and Error Boundaries to read promise values:

```tsx
import { use, Suspense } from 'react';

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}

function Page({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  return (
    <Suspense fallback={<p>Loading comments...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

**Rules for `use()` with promises:**
- Do not create promises inside Client Components during render — they
  recreate on every render. Pass promises from Server Components or
  use a Suspense-compatible library.
- In Server Components, prefer `async`/`await` over `use()`.
- Cannot be called in a try-catch block. Use Error Boundaries or
  `promise.catch()` instead.

### Streaming Data from Server to Client

Create the promise in a Server Component and pass it to a Client Component:

```tsx
// Server Component
async function Page() {
  const commentsPromise = fetchComments();
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Client Component
'use client';
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```

This avoids blocking Server Component rendering — the promise streams
to the client and resolves there.

## Effects Are Escape Hatches

**You don't need an Effect for:**

| Situation | Instead of Effect | Do this |
|-----------|-------------------|---------|
| Transform data for rendering | `useEffect(() => setFiltered(...))` | Compute during render |
| Handle user events | `useEffect(() => { if (submitted) post(...) })` | Call in event handler |
| Reset state on prop change | `useEffect(() => setComment(''), [userId])` | Use `key={userId}` |
| Adjust state on prop change | `useEffect(() => setSelection(null), [items])` | Compute: `items.find(...)` |
| Notify parent of state change | `useEffect(() => onChange(value), [value])` | Call `onChange` in handler |
| Share logic between handlers | `useEffect` with flags | Extract function, call from both handlers |
| Chain state updates | Multiple Effects triggering each other | Calculate all state in one event handler |

**You DO need an Effect for:**
- Subscribing to browser events (online/offline, resize, intersection)
- Connecting to external systems (WebSocket, third-party widgets)
- Fetching data that depends on current props/state (with cleanup)
- Synchronizing with non-React DOM (imperative animations, canvas)

### Data Fetching in Effects

Always add cleanup to prevent race conditions:

```tsx
useEffect(() => {
  let ignore = false;

  fetchResults(query).then(json => {
    if (!ignore) {
      setResults(json);
    }
  });

  return () => { ignore = true; };
}, [query]);
```

Better: use a data-fetching library (react-query, SWR, framework loaders)
or `use()` with Suspense. Raw Effects for fetching are a last resort.

### Effect Cleanup

Every Effect that subscribes must return a cleanup function:

```tsx
useEffect(() => {
  const handler = () => setIsOnline(navigator.onLine);
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}, []);
```

## Custom Hooks

### When to Extract

- **Repetitive Effect logic** across multiple components.
- **Complex state + Effect combinations** that obscure component intent.
- **Synchronization with external systems** — wrap in a hook to
  hide implementation details.

You don't need to extract every little piece of duplication. A single
`useState` wrapped in a hook is usually unnecessary.

### Naming and Design

Custom hooks **share stateful logic, not state itself.** Each call to
the same hook creates independent state.

**Naming rules:**
- Must start with `use` followed by a capital letter.
- Functions that don't call hooks should NOT start with `use`.
- Name after the **use case**, not the lifecycle:

```tsx
// BAD — lifecycle wrapper
function useMount(fn: () => void) { useEffect(fn, []); }
function useUpdateEffect(fn: () => void) { /* ... */ }

// GOOD — concrete use case
function useOnlineStatus() { /* ... */ }
function useChatRoom(options: ChatOptions) { /* ... */ }
function useFormInput(initialValue: string) { /* ... */ }
function useIntersectionObserver(ref: RefObject<Element>) { /* ... */ }
```

### Return Values

- **Single value:** return it directly (`return isOnline;`).
- **Value + setter pair:** return a tuple (`return [value, setValue] as const;`).
- **Multiple related values:** return an object
  (`return { value, onChange, reset };`).

### External Store Subscription

For subscribing to external data stores, prefer `useSyncExternalStore`
over manual Effect + state:

```tsx
function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,     // client
    () => true                   // server (SSR)
  );
}

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
```

## Hook Rules

- **Top level only.** Never call hooks inside conditions, loops, or
  nested functions. React relies on call order. Exception: `use()` can
  be called conditionally.
- **React functions only.** Call hooks from function components or
  custom hooks — never from regular JavaScript functions.
- **Exhaustive deps.** Include all reactive values used inside the
  Effect in the dependency array. The linter enforces this — don't
  suppress it. If a dependency causes unwanted re-runs, restructure
  the code.
- **One Effect per concern.** Don't merge unrelated sync logic into
  a single Effect. Separate Effects for separate external systems.
