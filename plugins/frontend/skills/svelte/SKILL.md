---
name: svelte
description: >-
  Svelte runes-first reactivity and SvelteKit fullstack conventions. Invoke
  whenever task involves any interaction with Svelte code — writing, reviewing,
  refactoring, debugging, or understanding .svelte, .svelte.js, .svelte.ts
  files and SvelteKit projects.
---

# Svelte

**Reactivity is explicit, compiler-driven, and minimal-runtime.** Every reactive
declaration uses a `$` rune. The compiler transforms declarative code into
surgical DOM updates -- no virtual DOM, no diffing, no hidden magic. References
contain extended examples, rationale, and edge cases for each topic.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Runes | `references/runes.md` | `$state`, `$derived`, `$effect`, `$props`, `$bindable` details |
| Components | `references/components.md` | Snippets, events, context, special elements |
| SvelteKit | `references/sveltekit.md` | Route files, load functions, form actions, hooks, full key imports table |

## Runes

### `$state`

1. Every mutable reactive value must use `$state` or `$state.raw`. Plain `let`
   declarations are not reactive.
2. Arrays and plain objects become deeply reactive proxies. Mutations trigger
   granular updates.
3. Destructuring `$state` objects breaks reactivity -- destructured values are
   snapshots, not live references.
4. Use `$state` on class fields or as first assignment in constructor. The compiler
   transforms these into getter/setter pairs. Use arrow functions to preserve `this`
   in event handlers on classes.
5. `$state.raw` opts out of deep reactivity -- state can only be reassigned, not
   mutated. Use for large arrays/objects you replace wholesale to avoid proxy overhead.
6. `$state.snapshot(value)` takes a static copy of a reactive proxy for external APIs
   that don't expect proxies (e.g., `structuredClone`, logging).
7. Import reactive `Set`, `Map`, `Date`, `URL` from `svelte/reactivity` when you need
   reactive built-in types.

### Sharing State Across Modules

Cannot directly export reassignable `$state`. Two patterns:

- **Object property (preferred):** export `$state({ count: 0 })` as a const, mutate
  properties, export modifier functions.
- **Getter function:** keep `$state` private, export `getCount()` and `increment()`.

Runes only work in `.svelte` and `.svelte.js`/`.svelte.ts` files.

### `$derived`

1. Use `$derived` for all computed values -- never synchronize state with `$effect`.
2. `$derived.by(() => { ... })` for complex derivations needing a function body.
3. Only synchronously read values are tracked. Use `untrack` to exempt specific reads.
4. Derived values can be temporarily overridden (useful for optimistic UI) -- reverts
   to derived computation on next dependency update.
5. Destructured `$derived` values are individually reactive.
6. Push-pull reactivity: dependents are notified immediately (push) but only
   recalculated on read (pull). If new value is referentially identical, downstream
   updates are skipped.

### `$effect`

1. `$effect` is an escape hatch. Use only for side effects: DOM manipulation,
   analytics, third-party library calls, timers.
2. Return a cleanup function when acquiring resources (intervals, listeners).
3. Only synchronously read values are tracked -- values read after `await` or inside
   `setTimeout` are NOT tracked.
4. Conditional reads: only values read in the last execution are dependencies.
5. Runs only in the browser, after DOM updates.
6. `$effect.pre` runs before DOM updates -- use for pre-DOM manipulation like
   autoscrolling.
7. `$effect.tracking()` returns `true` if code is running inside a tracking context.
8. `$effect.root(() => { ... })` creates a non-tracked scope for manual effect
   lifecycle control. Returns a destroy function.

**Never use `$effect` to synchronize state** -- use `$derived` with callback event
handlers or function bindings instead.

### `$props`

1. Always destructure props: `let { name, count = 0 } = $props()`.
2. Type with an interface in TypeScript: `let { name }: Props = $props()`.
3. Renaming: `let { class: klass } = $props()`.
4. Rest props: `let { a, b, ...rest } = $props()`.
5. All props: `let props = $props()`.
6. Unique ID: `$props.id()` -- consistent across SSR/hydration.
7. Props can be temporarily overridden by child. Do NOT mutate prop objects unless
   `$bindable`. Use callback props to communicate changes upward.

### `$bindable`

1. Marks a prop as two-way bindable: `let { value = $bindable() } = $props()`.
2. Parent optionally uses `bind:value={variable}`.
3. Use sparingly -- overuse makes data flow unpredictable. Prefer callback props for
   most parent-child communication.

### `$inspect`

1. Development-only debugging rune. Re-runs when arguments change. Noop in production.
2. `$inspect(count, message)` logs when tracked values change.
3. `$inspect(value).with((type, ...args) => { ... })` replaces default `console.log`
   with custom callback. Type is `"init"` or `"update"`.
4. `$inspect.trace()` traces which reactive state caused a re-execution. Must be first
   statement in a function body.

### `$host`

Only available inside custom elements. Provides access to the host element for
dispatching custom events.

## Components

### Structure Order

1. Imports
2. Props (`$props()`)
3. State (`$state`)
4. Derived values (`$derived`)
5. Effects (`$effect`, sparingly)
6. Functions
7. Markup (template)
8. Styles (`<style>`)

### Naming

1. Capitalize component names: `<MyComponent />`. Required for dynamic rendering.
2. Component names must be capitalized or use dot notation (`item.component`).
3. Components are dynamic by default -- `<svelte:component>` is unnecessary. Just
   use `<Thing />` where `Thing` is a reactive variable.

### Events

1. Use standard event attributes: `onclick={handler}`, never `on:click={handler}`.
2. Event attributes are case sensitive -- `onclick` listens to `click`, `onClick`
   listens to `Click`.
3. No event modifiers -- call `event.preventDefault()` / `event.stopPropagation()`
   in the handler. For capture, append to event name: `onclickcapture={...}`.
4. Callback props for component events -- pass functions as props:
   `let { onEvent } = $props()`. Never use `createEventDispatcher`.
5. Event forwarding: accept callback props and spread them onto elements.
6. Multiple handlers: combine in a single function (no duplicate attributes).
7. Svelte uses event delegation for common events (`click`, `input`, `keydown`) --
   single listener at app root. When manually dispatching events, set
   `{ bubbles: true }`. Prefer `on` from `svelte/events` over raw `addEventListener`.

### Snippets

1. Use `{@render children?.()}` for default content. Never use `<slot />`.
2. Named snippets: declare with `{#snippet header()}...{/snippet}` in parent, accept
   as props, render with `{@render header()}`.
3. Snippets with parameters pass data from child to parent:
   `{@render item(entry)}` in child, `{#snippet item(text)}` in parent.
4. Optional snippets: use `{@render children?.()}` or `{#if children}` with fallback.
5. Snippets follow lexical scoping -- visible within their declaring block and children.
6. Top-level snippets can be exported from `<script module>` for cross-component use.
7. Type snippets with `Snippet` and `Snippet<[ParamType]>` from `svelte`.

### Template Syntax

**Control flow:**
- `{#if}` / `{:else if}` / `{:else}` / `{/if}` for conditional blocks.
- `{#each items as item, index (item.id)}` with key expression for lists. Always
  provide a key for lists that can change. `:else` renders when array is empty.
- `{#key value}` destroys and recreates contents when value changes -- triggers entry
  transitions or resets component state.
- `{#await promise}` / `{:then value}` / `{:catch error}` for async. Short forms:
  `{#await promise then value}` skips loading state.

**Special tags:**
- `{@html rawHtml}` -- render raw HTML (escape user input to prevent XSS).
- `{@const x = expr}` -- declare local constant inside a block scope.
- `{@debug var1, var2}` -- trigger debugger when values change.
- `{@render snippet()}` -- render a snippet.
- `{@attach action}` -- attach an action to an element.

**Text expressions:** `{expression}` outputs stringified, escaped value. `null` and
`undefined` are omitted.

**Conditional classes:** object syntax like `clsx`: `class={{ cool, lame: !cool }}`.

### Context

1. `setContext(key, value)` / `getContext(key)` passes data through the component tree
   without prop drilling.
2. Type-safe context: use `createContext<T>()` from `svelte` which returns
   `[getContext, setContext]` pair.
3. Do NOT reassign the context object -- mutate its properties instead.
4. For SSR safety, prefer context over global module state.
5. Pass functions into `setContext` to maintain reactivity across boundaries.

### Special Elements

- `<svelte:boundary>` -- error boundary. Use `{#snippet failed(error, reset)}` for
  error UI and `{#snippet pending()}` for loading state with `await` expressions.
- `<svelte:window>` -- bind to window events and properties (`bind:scrollY`).
- `<svelte:head>` -- insert elements into `document.head` (SEO meta tags, title).
- `<svelte:element this={tag}>` -- render a dynamic HTML element.
- `<svelte:options>` -- set compiler options (`customElement`, `namespace`).

### Component Instantiation

Components are functions, not classes:
- `mount(Component, { target })` for client-side mounting.
- `unmount(app)` to destroy.
- `hydrate` instead of `mount` for server-rendered HTML.

## State Management

1. No shared module state on the server -- module-level `$state` is shared across
   requests during SSR. Use context or `event.locals` instead.
2. Return data from `load`, don't write to globals. No side effects in load functions.
3. Context for SSR-safe shared state -- `setContext`/`getContext` for data that must
   not leak between requests.
4. Use `$derived` for reactive computed values in components -- plain assignments in
   `<script>` run once, not reactively.
5. Store filter/sort state in URL for survival across reload.
6. Use snapshots for ephemeral UI state that should survive back/forward navigation.

## File Conventions

1. `.svelte.js` / `.svelte.ts` for reactive modules -- runes only work in `.svelte`
   and `.svelte.js`/`.svelte.ts` files.
2. `$lib` for shared code -- import from `$lib/` instead of relative paths climbing
   multiple levels.

## SvelteKit

### Route Files

| File | Purpose |
|------|---------|
| `+page.svelte` | Page component (receives `data` from load) |
| `+page.js` | Universal load (server + browser) |
| `+page.server.js` | Server-only load + form actions |
| `+layout.svelte` | Layout wrapper (must render `{@render children()}`) |
| `+layout.js` | Layout universal load |
| `+layout.server.js` | Layout server load |
| `+error.svelte` | Error boundary |
| `+server.js` | API endpoint (GET, POST, etc.) |

Key rules: all files can run on the server. All run on the client except `+server`
files. `+layout` and `+error` apply to subdirectories too.

### Load Functions

**Decision tree:**

| Need | Use |
|------|-----|
| Database, private keys | `+page.server.js` (PageServerLoad) |
| Non-serializable return values | `+page.js` (PageLoad) |
| External API, no secrets | `+page.js` (PageLoad) |
| Both | Both (server data flows to universal) |

**Universal vs server:**

| Aspect | Universal (+page.js) | Server (+page.server.js) |
|--------|---------------------|--------------------------|
| Runs on | Server (SSR) + Browser | Server only |
| Access | `params`, `url`, `fetch` | + `cookies`, `locals`, `request` |
| Returns | Any value (classes, components) | Serializable data only |

1. Use the provided `fetch`, not global `fetch` -- inherits cookies, makes relative
   requests work on server, bypasses HTTP overhead for internal requests.
2. Export page options from `+page.js`: `prerender`, `ssr`, `csr`.
3. Layout load data is available to all child pages.
4. Stream non-essential data by returning un-awaited promises.
5. SvelteKit tracks load dependencies and only reruns when: `params` change, `url`
   properties change, `parent()` was called and parent reran, or
   `invalidate()`/`invalidateAll()` called.
6. Use `error()` and `redirect()` from `@sveltejs/kit` for error and redirect responses.

### Form Actions

Server-only POST handlers in `+page.server.js`. Work without JavaScript.

1. Default action: `export const actions = { default: async ({ request }) => { ... } }`.
2. Named actions: `action="?/login"` on form, multiple actions in the `actions` object.
3. Validation: return `fail(400, { field, missing: true })` from action. Access via
   `form` prop in the page component.
4. Progressive enhancement: add `use:enhance` from `$app/forms` for JS-enhanced
   submission without full page reload.

### API Routes

Export HTTP verb handlers from `+server.js`: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
Return `json()` or `new Response()`.

### Hooks

**Server hooks** (`src/hooks.server.js`):
- `handle({ event, resolve })` -- intercept every request. Set `event.locals`, modify
  response headers.
- `handleFetch` -- modify server-side fetch calls.
- `handleError` -- log and sanitize unexpected errors.
- `init` -- run once at server startup.

**Client hooks** (`src/hooks.client.js`):
- `handleError` -- client-side error handling.

**Universal hooks** (`src/hooks.js`):
- `reroute` -- rewrite URLs before routing.
- `transport` -- serialize/deserialize custom types across server/client boundary.

### Key Imports

Most-used modules: `$app/navigation` (`goto`, `invalidate`), `$app/state` (`page`,
`navigating`), `$app/forms` (`enhance`), `$env/static/private` and
`$env/static/public` for environment variables, `$lib` for shared code. Full imports
table in `references/sveltekit.md`.

### Performance

1. Use server `load` functions to avoid browser-to-API waterfalls.
2. Stream non-essential data with un-awaited promises.
3. Use `$derived` instead of `$effect` for computed values.
4. Use link preloading (default on `<body>`).
5. Minimize third-party scripts.
6. Use `@sveltejs/enhanced-img` for image optimization.
7. Use dynamic `import()` for conditional code.
8. Deploy frontend near backend to minimize latency.

## Application

When **writing** Svelte code:
- Apply all conventions silently -- don't narrate each rule.
- Always use runes, event attributes, and snippets.
- If an existing codebase uses outdated patterns, follow the codebase
  and flag the divergence once.
- Type props with interfaces in TypeScript projects.

When **reviewing** Svelte code:
- Cite the specific violation and show the fix inline.
- Don't lecture -- state what's wrong and how to fix it.

## Integration

This skill provides Svelte-specific conventions. The coding skill governs workflow;
for TypeScript projects, the typescript skill handles language-level choices; for CSS
concerns, the css skill handles styling conventions.
