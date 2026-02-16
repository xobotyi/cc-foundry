# Runes

Runes are compiler instructions prefixed with `$` that control Svelte's reactivity.
They are language keywords, not importable functions.

## $state

Declares reactive state. The variable is a plain value, not a wrapper.

```svelte
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>clicks: {count}</button>
```

### Deep Reactivity

Arrays and plain objects become deeply reactive proxies. Mutations trigger
granular updates:

```js
let todos = $state([{ done: false, text: 'add more todos' }]);

// triggers update on anything depending on todos[0].done
todos[0].done = !todos[0].done;

// pushed objects are also proxified
todos.push({ done: false, text: 'eat lunch' });
```

**Destructuring breaks reactivity.** Destructured values are snapshots:

```js
let { done, text } = todos[0];
// `done` will NOT update when todos[0].done changes
```

### $state in Classes

Use `$state` on class fields or as first assignment in constructor. The compiler
transforms these into getter/setter pairs on the prototype.

```js
class Todo {
  done = $state(false);
  text = $state('');

  constructor(text) {
    this.text = $state(text);
  }

  // use arrow functions to preserve `this` in event handlers
  reset = () => {
    this.text = '';
    this.done = false;
  };
}
```

### $state.raw

Opt out of deep reactivity. State can only be reassigned, not mutated:

```js
let person = $state.raw({ name: 'Heraclitus', age: 49 });

// NO effect -- mutations are ignored
person.age += 1;

// works -- full reassignment
person = { name: 'Heraclitus', age: 50 };
```

Use `$state.raw` for large arrays/objects you replace wholesale -- avoids proxy
overhead.

### $state.snapshot

Take a static copy of a reactive proxy for external APIs:

```js
console.log($state.snapshot(counter)); // plain object, not Proxy
```

Use when passing state to libraries that don't expect proxies (e.g.,
`structuredClone`, logging).

### Reactive Built-ins

Import reactive `Set`, `Map`, `Date`, `URL` from `svelte/reactivity`.

### Sharing State Across Modules

Cannot directly export reassignable `$state`. Two patterns:

**Object property pattern (preferred):**
```js
// state.svelte.js
export const counter = $state({ count: 0 });
export function increment() { counter.count += 1; }
```

**Getter function pattern:**
```js
// state.svelte.js
let count = $state(0);
export function getCount() { return count; }
export function increment() { count += 1; }
```

## $derived

Declares computed state that recalculates when dependencies change:

```js
let count = $state(0);
let doubled = $derived(count * 2);
```

### $derived.by

For complex derivations that need a function body:

```js
let total = $derived.by(() => {
  let sum = 0;
  for (const n of numbers) sum += n;
  return sum;
});
```

### Dependencies

Anything read synchronously inside `$derived` is tracked. Use `untrack` to
exempt specific reads.

### Overriding Derived Values

Derived values can be temporarily reassigned (useful for optimistic UI):

```js
let likes = $derived(post.likes);

async function onclick() {
  likes += 1; // optimistic update
  try {
    await like();
  } catch {
    likes -= 1; // rollback
  }
}
```

The value reverts to the derived computation on the next dependency update.

### Destructuring Derived

Destructured `$derived` values are individually reactive:

```js
let { a, b, c } = $derived(stuff());
// equivalent to:
// let a = $derived(_stuff.a); etc.
```

### Update Propagation

Push-pull reactivity: dependents are notified immediately (push) but only
recalculated on read (pull). If the new value is referentially identical to the
previous value, downstream updates are skipped.

## $effect

Side-effect that runs when dependencies change. Runs only in the browser, after
DOM updates.

```js
$effect(() => {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
});
```

### Teardown

Return a cleanup function from the effect:

```js
$effect(() => {
  const interval = setInterval(() => count += 1, milliseconds);
  return () => clearInterval(interval);
});
```

### Dependency Tracking

- Only synchronously read values are tracked
- Values read after `await` or inside `setTimeout` are NOT tracked
- Effect reruns only when the tracked values change
- Conditional reads: only values read in the last execution are dependencies

### $effect.pre

Runs before DOM updates. Same API as `$effect`, different timing. Use for
pre-DOM manipulation like autoscrolling.

### $effect.tracking

Returns `true` if code is running inside a tracking context (effect or template).

### $effect.root

Creates a non-tracked scope for manual effect lifecycle control:

```js
const destroy = $effect.root(() => {
  $effect(() => { /* setup */ });
  return () => { /* cleanup */ };
});
// later: destroy();
```

### When NOT to Use $effect

`$effect` is an escape hatch. Prefer `$derived` for computed values:

```svelte
<!-- WRONG: effect to sync state -->
<script>
  let count = $state(0);
  let doubled = $state();
  $effect(() => { doubled = count * 2; }); // don't do this
</script>

<!-- RIGHT: derived -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

Do not use `$effect` to synchronize two pieces of state -- use `$derived` with
callback event handlers or function bindings instead.

## $props

Declares component input properties via destructuring:

```svelte
<script>
  let { adjective, count = 0 } = $props();
</script>
```

### Patterns

- **Renaming:** `let { class: klass } = $props();`
- **Rest props:** `let { a, b, ...rest } = $props();`
- **All props:** `let props = $props();`
- **Unique ID:** `const uid = $props.id();` -- consistent across SSR/hydration

### Type Safety

```svelte
<script lang="ts">
  interface Props {
    adjective: string;
    count?: number;
  }
  let { adjective, count = 0 }: Props = $props();
</script>
```

### Updating Props

Props can be temporarily overridden by the child. Do NOT mutate prop objects
unless they are `$bindable`. Use callback props to communicate changes upward.

## $bindable

Marks a prop as two-way bindable:

```svelte
<!-- FancyInput.svelte -->
<script>
  let { value = $bindable(), ...props } = $props();
</script>
<input bind:value={value} {...props} />
```

Parent can optionally use `bind:`:

```svelte
<FancyInput bind:value={message} />
```

Use sparingly -- overuse makes data flow unpredictable. Prefer callback props
for most parent-child communication.

## $inspect

Development-only debugging rune. Equivalent to `console.log` but re-runs
whenever its arguments change. Tracks reactive state deeply. Becomes a noop
in production builds.

```svelte
<script>
  let count = $state(0);
  let message = $state('hello');

  $inspect(count, message); // logs when count or message change
</script>
```

### $inspect(...).with

Replace the default `console.log` with a custom callback:

```svelte
<script>
  let count = $state(0);

  $inspect(count).with((type, count) => {
    if (type === 'update') {
      debugger; // or console.trace, or whatever you want
    }
  });
</script>
```

The first argument is either `"init"` or `"update"`.

### $inspect.trace

Traces the surrounding function in development. When an effect or derived
re-runs, the console shows which reactive state caused the re-execution.
Must be the first statement in a function body.

```js
$effect(() => {
  $inspect.trace();
  doSomeWork();
});
```

Accepts an optional label argument for identification.

## $host

Only available inside custom elements. Provides access to the host element for
dispatching custom events:

```svelte
<svelte:options customElement="my-stepper" />

<script>
  function dispatch(type) {
    $host().dispatchEvent(new CustomEvent(type));
  }
</script>

<button onclick={() => dispatch('decrement')}>decrement</button>
<button onclick={() => dispatch('increment')}>increment</button>
```
