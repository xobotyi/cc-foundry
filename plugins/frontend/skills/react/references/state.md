# State Management

useState, useReducer, context, Actions, useActionState, useOptimistic,
useFormStatus, state placement, and data flow patterns.

## State Placement

The most important decision in React state management is **where** state lives.

### Decision Tree

1. **Does only one component use it?** Keep it local with `useState`.
2. **Do siblings need it?** Lift to their closest common parent.
3. **Is prop drilling painful (5+ levels)?** Try composition first —
   restructure components to pass JSX as `children`.
4. **Still painful after composition?** Use Context with `use()`.
5. **Is it server data (user profile, search results)?** Use a data-fetching
   library (react-query, SWR, framework loaders) — not `useState` + `useEffect`.

```
Local state (useState)
  → Lift state up (shared parent)
    → Composition (children, render props)
      → Context (use())
        → External library (react-query, jotai, zustand)
```

### Server Cache vs UI State

These are fundamentally different:

| Category | Examples | Tool |
|----------|----------|------|
| **UI state** | Modal open, form input, selected tab | `useState`, `useReducer`, Context |
| **Server cache** | User data, search results, API responses | react-query, SWR, framework loaders |

Server cache has inherently different problems — caching, deduplication, race
conditions, background refetching. Don't reinvent these with raw `useState`.

## useState

For simple, independent values:

```tsx
const [count, setCount] = useState(0);
const [name, setName] = useState('');
```

### Updater Functions

When next state depends on previous state, use the updater form:

```tsx
// BAD — stale closure if called multiple times in one event
setCount(count + 1);

// GOOD — always uses latest state
setCount(prev => prev + 1);
```

### Lazy Initialization

For expensive initial values, pass a function:

```tsx
// BAD — createInitialState() runs every render
const [state, setState] = useState(createInitialState());

// GOOD — runs only on mount
const [state, setState] = useState(() => createInitialState());
```

## useReducer

Use when state updates are complex — many event handlers modifying the same
state, or when the next state depends on the previous state in non-trivial ways.

### When to Choose useReducer over useState

| Signal | Tool |
|--------|------|
| Single value, simple updates | `useState` |
| Multiple related values, complex transitions | `useReducer` |
| Many event handlers doing similar state updates | `useReducer` |
| Need to test state logic in isolation | `useReducer` |

### Reducer Pattern

```tsx
type Action =
  | { type: 'added'; id: number; text: string }
  | { type: 'changed'; task: Task }
  | { type: 'deleted'; id: number };

function tasksReducer(tasks: Task[], action: Action): Task[] {
  switch (action.type) {
    case 'added':
      return [...tasks, { id: action.id, text: action.text, done: false }];
    case 'changed':
      return tasks.map(t => t.id === action.task.id ? action.task : t);
    case 'deleted':
      return tasks.filter(t => t.id !== action.id);
    default:
      throw new Error(`Unknown action: ${(action as Action).type}`);
  }
}

const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
```

### Reducer Rules

1. **Reducers must be pure.** Same inputs = same output. No side effects.
2. **Each action describes a single user interaction.** Dispatch `reset_form`,
   not five separate `set_field` actions.
3. **Actions describe what happened, not what to do.** `'added_task'` not
   `'set_tasks'`.
4. **Always have a `default` that throws** — catch typos early.

## Context with `use()`

Provides data to an entire subtree without prop drilling.

### Pattern: Context + Provider + Hook

```tsx
// 1. Create context
const CountContext = createContext<{
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
} | null>(null);

// 2. Provider component — use <Context> directly, not <Context.Provider>
function CountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <CountContext value={{ count, setCount }}>
      {children}
    </CountContext>
  );
}

// 3. Consumer hook with safety check — use() instead of useContext()
function useCount() {
  const context = use(CountContext);
  if (!context) {
    throw new Error('useCount must be used within a CountProvider');
  }
  return context;
}
```

### Context Rules

1. **Try props and composition first.** Context is not the first solution
   to prop drilling.
2. **Keep state close to where it's used.** Not every context belongs at
   the app root. Page-level or feature-level providers are fine.
3. **Split logically.** User settings context separate from notifications
   context. Don't put all state in one giant context.
4. **Different contexts don't override each other.** Each `createContext()`
   is independent.

## Actions

Actions are async functions in transitions that handle pending states, errors,
forms, and optimistic updates automatically.

### useActionState

Manages state for the result of an Action — like `useReducer` but with
side effects:

```tsx
const [state, dispatch, isPending] = useActionState(
  async (previousState, formData) => {
    const error = await updateName(formData.get('name'));
    if (error) return error;
    redirect('/profile');
    return null;
  },
  null,
);

return (
  <form action={dispatch}>
    <input type="text" name="name" />
    <button type="submit" disabled={isPending}>Update</button>
    {state && <p className="error">{state}</p>}
  </form>
);
```

**Key behaviors:**
- When passed to a `<form action>`, React wraps the submission in a
  transition automatically — no need for `startTransition`.
- When calling `dispatch` manually (outside a form), wrap in `startTransition`.
- Actions are queued sequentially — each receives the previous result
  as `previousState`.
- Return error states instead of throwing to prevent skipping queued actions.

### useOptimistic

Shows instant UI feedback while an async Action completes:

```tsx
const [optimisticName, setOptimisticName] = useOptimistic(currentName);

async function submitAction(formData: FormData) {
  const newName = formData.get('name') as string;
  setOptimisticName(newName);       // Instant update
  const result = await updateName(newName);  // Server call
  onUpdateName(result);             // Commit real value
}

return (
  <form action={submitAction}>
    <p>Your name is: {optimisticName}</p>
    <input type="text" name="name" />
  </form>
);
```

**Rules:**
- The setter must be called inside `startTransition` or an Action prop.
- When the Action completes (or fails), the optimistic state reverts to
  the real `value` — no extra render to "clear" it.
- Use a reducer for complex optimistic updates (e.g., adding to a list):

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (currentTodos, newTodo) => [
    ...currentTodos,
    { ...newTodo, pending: true }
  ]
);
```

### useFormStatus

Reads the submission status of the nearest parent `<form>` — useful for
design system components:

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

**Must be called from a component rendered inside a `<form>`.** It does not
track forms rendered in the same component.

## Combining Reducer + Context

For complex state shared across a subtree, combine `useReducer` with context:

```tsx
const TasksContext = createContext<Task[] | null>(null);
const TasksDispatchContext = createContext<Dispatch<TaskAction> | null>(null);

function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  return (
    <TasksContext value={tasks}>
      <TasksDispatchContext value={dispatch}>
        {children}
      </TasksDispatchContext>
    </TasksContext>
  );
}
```

Split into two contexts so components that only dispatch don't re-render
when task data changes.

## Resetting State with key

Use `key` to reset a component's state when the conceptual entity changes:

```tsx
<Profile key={userId} userId={userId} />
```

This is cleaner than using an Effect to reset state on prop change.

## Anti-Patterns

| Don't | Do |
|-------|------|
| Store computed values in state | Compute during render |
| Sync state with Effect | Derive values, or compute in event handler |
| Put all state in a global store | Keep state local, lift only when needed |
| One giant context for everything | Multiple focused contexts |
| `useState` + `useEffect` for server data | Data-fetching library |
| Reset state in Effect on prop change | Use `key` prop |
| Manual pending/error state for mutations | `useActionState` |
| Delayed UI during mutations | `useOptimistic` for instant feedback |
