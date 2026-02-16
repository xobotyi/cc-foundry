# Component Patterns

Svelte component conventions, events, snippets, template syntax, context,
and special elements.

## Component Structure

```svelte
<script lang="ts">
  // 1. Imports
  import { setContext } from 'svelte';
  import Button from './Button.svelte';

  // 2. Props
  interface Props {
    title: string;
    children: import('svelte').Snippet;
  }
  let { title, children }: Props = $props();

  // 3. State
  let count = $state(0);

  // 4. Derived values
  let doubled = $derived(count * 2);

  // 5. Effects (sparingly)
  $effect(() => {
    document.title = title;
  });

  // 6. Functions
  function increment() {
    count++;
  }
</script>

<!-- 7. Markup -->
<h1>{title}</h1>
<button onclick={increment}>{count} (doubled: {doubled})</button>
{@render children()}

<!-- 8. Styles -->
<style>
  h1 { color: var(--heading-color); }
</style>
```

## Events

Use standard event attributes on elements:

```svelte
<button onclick={() => count++}>click</button>
```

Event attributes are case sensitive. `onclick` listens to the `click` event,
`onClick` listens to the `Click` event.

### Component Events as Callback Props

Pass functions as props for component-level events:

```svelte
<!-- Parent -->
<Pump
  inflate={(power) => { size += power; }}
  deflate={(power) => { size -= power; }}
/>

<!-- Pump.svelte -->
<script>
  let { inflate, deflate } = $props();
</script>
<button onclick={() => inflate(5)}>inflate</button>
<button onclick={() => deflate(5)}>deflate</button>
```

### Event Forwarding

Accept callback props and spread them:

```svelte
<script>
  let { onclick, ...rest } = $props();
</script>
<button {onclick} {...rest}>click me</button>
```

### No Event Modifiers

Handle in the function body:

```svelte
<script>
  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    // actual logic
  }
</script>
<button onclick={handleClick}>click</button>
```

For `capture`, append to event name: `onclickcapture={...}`.

### Multiple Handlers

Combine in a single function (no duplicate attributes):

```svelte
<button onclick={(e) => { one(e); two(e); }}>click</button>
```

### Event Delegation

Svelte uses event delegation for common events (`click`, `input`, `keydown`,
etc.) -- a single listener at the application root handles events that bubble
up. When manually dispatching events with delegated listeners, set
`{ bubbles: true }`. Prefer the `on` function from `svelte/events` over raw
`addEventListener` to ensure correct ordering and `stopPropagation` behavior.

## Template Syntax

### Control Flow

**If blocks:**

```svelte
{#if condition}
  <p>condition is true</p>
{:else if otherCondition}
  <p>other condition is true</p>
{:else}
  <p>neither is true</p>
{/if}
```

**Each blocks:**

```svelte
{#each items as item, index (item.id)}
  <li>{index}: {item.name}</li>
{:else}
  <li>No items</li>
{/each}
```

Always provide a key expression `(item.id)` for lists that can change -- it
enables efficient DOM reconciliation. The `:else` clause renders when the
array is empty.

**Key blocks:**

```svelte
{#key value}
  <Component />
{/key}
```

Destroys and recreates contents when `value` changes. Useful for triggering
entry transitions or resetting component state.

**Await blocks:**

```svelte
{#await promise}
  <p>loading...</p>
{:then value}
  <p>The value is {value}</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

Short forms: `{#await promise then value}` skips the loading state.
`{#await promise catch error}` skips both loading and success.

### Special Tags

- `{@html rawHtml}` -- Render raw HTML (escape user input to prevent XSS)
- `{@const x = expr}` -- Declare a local constant inside a block scope
- `{@debug var1, var2}` -- Trigger debugger when values change
- `{@render snippet()}` -- Render a snippet (see below)
- `{@attach action}` -- Attach an action to an element

### Text Expressions

`{expression}` outputs a stringified, escaped value. `null` and `undefined`
are omitted.

## Snippets

Snippets are reusable chunks of markup defined inside components.

### Default Content (children)

```svelte
<!-- Card.svelte -->
<script>
  let { children } = $props();
</script>
<div class="card">
  {@render children?.()}
</div>

<!-- Usage -->
<Card>
  <p>Card content here</p>
</Card>
```

### Named Snippets

```svelte
<!-- Layout.svelte -->
<script>
  let { header, main, footer } = $props();
</script>
<header>{@render header()}</header>
<main>{@render main()}</main>
<footer>{@render footer()}</footer>

<!-- Usage -->
<Layout>
  {#snippet header()}
    <h1>Title</h1>
  {/snippet}
  {#snippet main()}
    <p>Content</p>
  {/snippet}
  {#snippet footer()}
    <p>Footer</p>
  {/snippet}
</Layout>
```

### Snippets with Parameters

Pass data from child back to parent:

```svelte
<!-- List.svelte -->
<script>
  let { items, item, empty } = $props();
</script>
{#if items.length}
  <ul>
    {#each items as entry}
      <li>{@render item(entry)}</li>
    {/each}
  </ul>
{:else}
  {@render empty?.()}
{/if}

<!-- Usage -->
<List items={['one', 'two']}>
  {#snippet item(text)}
    <span>{text}</span>
  {/snippet}
  {#snippet empty()}
    <span>No items</span>
  {/snippet}
</List>
```

### Optional Snippets

Use optional chaining or an `{#if}` block for fallback content:

```svelte
{@render children?.()}

{#if children}
  {@render children()}
{:else}
  <p>Fallback content</p>
{/if}
```

### Snippet Scope

Snippets follow lexical scoping -- they can reference variables from their
surrounding scope but are only visible within their declaring block and its
children.

### Exporting Snippets

Top-level snippets can be exported from a `<script module>` block for use
in other components, provided they don't reference non-module declarations.

### Typing Snippets

```ts
import type { Snippet } from 'svelte';

interface Props {
  children: Snippet;
  header: Snippet;
  row: Snippet<[item: Item]>;
}
```

## Dynamic Components

Components are dynamic by default -- `<svelte:component>` is unnecessary:

```svelte
<script>
  let Thing = $state(ComponentA);
</script>

<!-- just use it directly -->
<Thing />
```

Component names must be capitalized or use dot notation (`item.component`).

## Component Instantiation

Components are functions:

```js
import { mount, unmount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app') });
// later:
unmount(app);
```

Use `hydrate` instead of `mount` for server-rendered HTML.

## Context

Pass data through the component tree without prop drilling:

```svelte
<!-- Parent -->
<script>
  import { setContext } from 'svelte';
  let counter = $state({ count: 0 });
  setContext('counter', counter);
</script>

<!-- Deep child -->
<script>
  import { getContext } from 'svelte';
  const counter = getContext('counter');
</script>
<p>{counter.count}</p>
```

### Type-safe Context

```ts
// context.ts
import { createContext } from 'svelte';
export const [getUserContext, setUserContext] = createContext<User>();
```

### Rules

1. Do NOT reassign the context object -- mutate its properties instead
2. For SSR safety, prefer context over global module state
3. Pass functions into `setContext` to maintain reactivity across boundaries

## Special Elements

### `<svelte:boundary>`

Error boundary and async loading wrapper. Prevents rendering errors from
crashing the entire app.

```svelte
<svelte:boundary>
  <FlakyComponent />

  {#snippet failed(error, reset)}
    <button onclick={reset}>oops! try again</button>
  {/snippet}
</svelte:boundary>
```

The `pending` snippet provides a loading state for `await` expressions:

```svelte
<svelte:boundary>
  <p>{await delayed('hello!')}</p>

  {#snippet pending()}
    <p>loading...</p>
  {/snippet}
</svelte:boundary>
```

### `<svelte:window>`

Bind to window events and properties:

```svelte
<svelte:window onkeydown={handleKeydown} />
<svelte:window bind:scrollY={y} />
```

### `<svelte:head>`

Insert elements into `document.head` (useful for SEO meta tags):

```svelte
<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={description} />
</svelte:head>
```

### `<svelte:element>`

Render a dynamic HTML element:

```svelte
<svelte:element this={tag}>content</svelte:element>
```

### `<svelte:options>`

Set compiler options for the component:

```svelte
<svelte:options customElement="my-component" />
<svelte:options namespace="svg" />
```

## Conditional Class Syntax

Objects for conditional class assignment (follows `clsx` syntax):

```svelte
<script>
  let { cool } = $props();
</script>
<div class={{ cool, lame: !cool }}>Content</div>
```
