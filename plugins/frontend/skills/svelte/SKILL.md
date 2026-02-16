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
surgical DOM updates -- no virtual DOM, no diffing, no hidden magic.

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| `$state`, `$derived`, `$effect`, `$props`, `$bindable`, `$inspect` | [runes.md](references/runes.md) |
| Component structure, events, snippets, context, special elements | [components.md](references/components.md) |
| SvelteKit routing, load functions, form actions, hooks, state management | [sveltekit.md](references/sveltekit.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL Svelte code. No exceptions.

### Runes

1. **`$state` for all reactive variables.** Every mutable reactive value must
   use `$state` or `$state.raw`. Plain `let` declarations are not reactive.
2. **`$derived` over `$effect` for computed values.** If the value is a pure
   function of other state, use `$derived`. Never synchronize state with
   `$effect`.
3. **`$effect` is an escape hatch.** Use only for side effects: DOM
   manipulation, analytics, third-party library calls, timers. Return a
   teardown function when acquiring resources.
4. **`$props` with destructuring.** Always destructure props. Type them with
   an interface in TypeScript projects.
5. **`$bindable` sparingly.** Two-way binding makes data flow harder to trace.
   Prefer callback props for parent-child communication.

### Components

6. **Event attributes, not directives.** `onclick={handler}`, never
   `on:click={handler}`.
7. **Callback props for component events.** Pass functions as props.
   Never use `createEventDispatcher`.
8. **Snippets for content composition.** Use `{@render children?.()}` and
   named snippet props. Never use `<slot />`.
9. **Capitalize component names.** `<MyComponent />`, not
   `<myComponent />`. Required for dynamic rendering.
10. **`mount`/`unmount` for imperative instantiation.** Components are
    functions, not classes.

### State Management

11. **No shared module state on the server.** Module-level `$state` is shared
    across requests during SSR. Use context or `event.locals` instead.
12. **Return data from `load`, don't write to globals.** No side effects in
    load functions.
13. **Context for SSR-safe shared state.** `setContext`/`getContext` for data
    that must not leak between requests.
14. **`$derived` for reactive computed values in components.** Plain
    assignments in `<script>` run once -- use `$derived` for values that
    should update when `data` props change.

### File Conventions

15. **`.svelte.js` / `.svelte.ts` for reactive modules.** Runes only work
    in `.svelte` and `.svelte.js`/`.svelte.ts` files.
16. **`$lib` for shared code.** Import from `$lib/` instead of relative
    paths climbing multiple levels.

## Quick Anti-Pattern Reference

| Wrong | Right |
|-------|-------|
| `let count = 0` (not reactive) | `let count = $state(0)` |
| `$effect(() => { x = f(y) })` (state sync) | `const x = $derived(f(y))` |
| `export let name` | `let { name } = $props()` |
| `on:click={handler}` | `onclick={handler}` |
| `on:click\|preventDefault` | `event.preventDefault()` in handler |
| `createEventDispatcher()` | Callback props: `let { onEvent } = $props()` |
| `<slot />` | `{@render children?.()}` |
| `<slot name="x" />` | `{@render x()}` with snippet prop |
| `<svelte:component this={C} />` | `<C />` -- dynamic by default |
| `new Component({ target })` | `mount(Component, { target })` |
| `writable(0)` for local state | `$state(0)` |
| `export let value` (bindable) | `let { value = $bindable() } = $props()` |
| Module-level state for SSR | Context via `setContext`/`getContext` |
| `$$restProps` | `let { ...rest } = $props()` |
| `$$props` | `let props = $props()` |

## SvelteKit Quick Reference

### Route Files

| File | Purpose |
|------|---------|
| `+page.svelte` | Page component |
| `+page.js` | Universal load (server + browser) |
| `+page.server.js` | Server-only load + form actions |
| `+layout.svelte` | Layout wrapper (renders `{@render children()}`) |
| `+layout.js` | Layout universal load |
| `+layout.server.js` | Layout server load |
| `+error.svelte` | Error boundary |
| `+server.js` | API endpoint (GET, POST, etc.) |

### Load Function Decision

```
Need database/private keys?     -> +page.server.js (PageServerLoad)
Need to return non-serializable? -> +page.js (PageLoad)
External API, no secrets?        -> +page.js (PageLoad)
Both?                            -> Both (server data flows to universal)
```

### Form Action Pattern

```js
// +page.server.js
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    if (!email) return fail(400, { email, missing: true });
    // process...
    redirect(303, '/success');
  }
};
```

```svelte
<!-- +page.svelte -->
<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>
<form method="POST" use:enhance>
  {#if form?.missing}<p class="error">Email required</p>{/if}
  <input name="email" value={form?.email ?? ''}>
  <button>Submit</button>
</form>
```

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

```
Bad review comment:
  "According to Svelte best practices, you should use $state
   instead of plain let declarations for reactive state."

Good review comment:
  "`let count = 0` -> `let count = $state(0)` -- needs explicit reactivity."
```

## Integration

This skill provides Svelte-specific conventions alongside the **coding** skill:

1. **Coding** -- Discovery, planning, verification discipline
2. **Svelte** -- Framework-specific idioms and conventions
3. **Coding** -- Final verification

The coding skill governs workflow; this skill governs Svelte implementation
choices. For TypeScript projects, the **typescript** skill should also be
active. For CSS concerns, the **css** skill handles styling conventions.
