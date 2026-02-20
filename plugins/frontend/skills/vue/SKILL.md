---
name: vue
description: >-
  Vue 3 Composition API discipline: reactivity-aware, type-safe, composable.
  Invoke whenever task involves any interaction with Vue code — writing,
  reviewing, refactoring, debugging, or understanding .vue files, composables,
  and Vue component architecture.
---

# Vue

**Composition API is the default. `<script setup>` is the default syntax.
If you reach for Options API, you need a reason.**

Vue 3 rewards explicit, composable code. Prefer `ref()` over `reactive()`,
composables over mixins, and typed props over runtime-only validation.
References contain extended examples, rationale, and edge cases for each topic.

## References

| Topic | Reference | Contents |
|-------|-----------|----------|
| Reactivity | `references/reactivity.md` | Ref unwrapping, watchers, computed edge cases |
| SFC | `references/sfc.md` | Full compiler macros catalog, scoped styles, template refs |
| Components | `references/components.md` | Props, emits, slots, provide/inject |
| Composables | `references/composables.md` | Design patterns, composition, restrictions |
| TypeScript | `references/typescript.md` | Full utility types table, generic components, event typing |
| Performance | `references/performance.md` | Update optimization, large lists, profiling |

## Reactivity

### Choosing a Reactive Primitive

| Primitive | Use when |
|-----------|----------|
| `ref()` | **Default choice.** Works with any value type. |
| `reactive()` | Grouping related state when destructure is not needed. |
| `shallowRef()` | Large immutable structures, external state integration. |
| `shallowReactive()` | Root-level-only reactivity on objects. |
| `computed()` | Derived state. Caches until dependencies change. |

### `ref()` Is the Primary API

- Works with primitives (`string`, `number`, `boolean`).
- Can be destructured from composable returns without losing reactivity.
- Can be reassigned (`count.value = newValue`).
- Consistent `.value` access pattern everywhere in script.
- Access `.value` in script, omit in template — templates auto-unwrap top-level refs.

### `reactive()` Limitations

- Cannot hold primitives.
- Reassignment loses reactivity — `state = reactive({...})` breaks tracking.
- Destructuring primitives loses reactivity — use `toRefs()` if you must destructure.
- Do not use `reactive()` as the primary primitive. Use `ref()`.

### Ref Unwrapping Rules

- Top-level refs in templates are auto-unwrapped: `{{ count }}` works.
- Non-top-level refs in plain objects are NOT unwrapped: `{{ obj.id + 1 }}` breaks
  if `obj.id` is a ref. Destructure to top level to fix.
- Refs nested inside `reactive()` objects are unwrapped automatically.
- Refs inside reactive arrays/collections are NOT unwrapped — need `.value`.

### Computed Properties

- Keep computed getters pure — no side effects.
- Split complex computed into smaller ones.
- Computed caches its value; only recalculates when dependencies change.
- Computed stability (3.4+): only triggers effects when the returned value actually
  changes. Avoid returning new objects from computed — each new object is "different".
- Writable computed is rare — use sparingly. Requires `get`/`set` form.

### Watchers

**`watch()` vs `watchEffect()`:**

| Use `watch()` when | Use `watchEffect()` when |
|--------------------|--------------------------|
| Need old and new values | Don't need old value |
| Want lazy execution | Want immediate execution |
| Watching specific sources | Dependencies are implicit |
| Need conditional watching | Effect tracks all accessed refs |

**`watch()` options:**
- `{ immediate: true }` — run callback on creation (like watchEffect).
- `{ deep: true }` — watch all nested properties (expensive, use sparingly).
- Watch a getter for specific property: `watch(() => obj.specificProp, callback)`.
- Watch multiple sources: `watch([a, b], ([newA, newB]) => {...})`.

**Cleanup:** Both `watch` and `watchEffect` support cleanup via the `onCleanup` parameter.
Use it for aborting fetch requests, clearing timers, removing listeners.

### DOM Update Timing

Reactive state changes batch DOM updates to the next tick. Use `nextTick()` for
post-DOM-update logic.

## Single-File Components

### Block Order

Always: `<script setup>` first, `<template>` second, `<style>` last.

### Organization Within `<script setup>`

Order declarations logically:

1. Imports — Vue APIs, components, composables, types
2. Props and emits — `defineProps`, `defineEmits`
3. Composable calls — `useRouter()`, custom composables
4. Reactive state — `ref()`, `reactive()`, `computed()`
5. Functions — event handlers, helpers
6. Watchers — `watch()`, `watchEffect()`
7. Lifecycle hooks — `onMounted()`, `onUnmounted()`
8. Expose — `defineExpose()` (rare)

### Compiler Macros

Key macros available without import in `<script setup>`: `defineProps()`,
`defineEmits()`, `defineModel()`. Use `defineOptions()` for options that
`<script setup>` doesn't natively support (`name`, `inheritAttrs: false`).
Full macro catalog in `references/sfc.md`.

### Template Syntax

**Directive shorthands** — use consistently, don't mix:

| Shorthand | Full | Purpose |
|-----------|------|---------|
| `:prop` | `v-bind:prop` | Bind attribute/prop |
| `@event` | `v-on:event` | Listen to event |
| `#slot` | `v-slot:slot` | Named slot |

**Conditional rendering:**
- `v-if` / `v-else-if` / `v-else` for conditional blocks.
- `v-show` for frequent toggles (CSS `display: none`, avoids mount/unmount cost).
- Use `v-if` for conditions that rarely change, `v-show` for frequent toggles.

**Template refs:**
- 3.5+: `useTemplateRef<HTMLInputElement>('input')` with matching `ref` attribute.
- Pre-3.5: `ref<HTMLInputElement | null>(null)` with matching ref name.

### Scoped Styles

- Use `<style scoped>` by default. Global styles only in `App.vue` or layouts.
- Child component root elements are affected by both parent and child scoped styles.
- Deep selectors: `.parent :deep(.child-class)` to style child internals (use sparingly).
- CSS modules: `<style module>` generates unique class names, accessed via `$style`.
- `v-bind(color)` in `<style>` uses reactive values in CSS.

## Components

### Naming

- Multi-word names always — `TodoItem` not `Item`. Avoids HTML element conflicts.
- PascalCase in SFC templates: `<TodoItem />`. Kebab-case only in in-DOM templates.
- PascalCase filenames: `TodoItem.vue`.
- Base component prefix for presentational components: `BaseButton`, `BaseIcon`.
- Parent prefix for tightly coupled children: `TodoListItem`, `TodoListItemButton`.
- Highest-level word first to group related: `SearchButtonClear`, `SearchInputQuery`.
- Full words always — no abbreviations.
- One component per file. No inline registration.
- Self-closing tags for components without children: `<MyComponent />`.
- PascalCase when importing in JS/TS.

### Props

- Use `defineProps<T>()` (type-based) in TypeScript projects. Object syntax in JS
  projects. Never array syntax in committed code.
- Declare in `camelCase`, use in templates as `kebab-case` — Vue converts automatically.
- Never mutate props. Use `computed()` for transformations, `ref()` + initial value
  for local copies.
- One-way data flow — props down, events up.
- Reactive props destructure (3.5+): destructured props are reactive, usable in
  watch/computed directly.
- Pass destructured props to composables via getter: `useComposable(() => id)`.

### Emits

- Declare all emits with `defineEmits()` — preferably type-based.
- Emit in `camelCase`: `emit('someEvent')`. Listen in `kebab-case`:
  `@some-event="handler"`. Vue converts automatically.
- Use named tuple syntax (3.3+) for type-based emits:
  `defineEmits<{ change: [id: number] }>()`.

### v-model

- Use `defineModel<T>()` for two-way binding shorthand.
- Named v-model: `defineModel<string>('firstName')` with
  `v-model:first-name="first"` on parent.

### Slots

- Default slot: `<slot />` in child, content between tags in parent.
- Named slots: `<slot name="header" />` in child, `<template #header>` in parent.
- Scoped slots: pass data via slot props — `<slot :item="item" />`, consume with
  `<template #default="{ item }">`.

### Provide / Inject

- Use `Symbol` keys (`InjectionKey<T>`) for type safety — avoid string collisions.
- Export keys from a shared `keys.ts` file.
- Provide `readonly()` refs to prevent consumers from mutating state.
- Provide updater functions when consumers need to change provided state.
- Always provide a default or handle `undefined` in the consumer.

## Template Rules

- `v-for` always has `:key` — stable, unique identifiers.
- Never `v-if` on same element as `v-for`. Use `computed` to filter, or wrap with
  `<template v-for>`.
- Simple expressions only in templates. Move logic to `computed` or functions.
- Multi-attribute elements span multiple lines — one attribute per line.

## Composables

### Design

- Always prefix with `use`: `useMouse`, `useFetch`, `useAuth`.
- `camelCase` naming: `useEventListener` not `use-event-listener`.
- The `use` prefix signals the function uses Vue reactivity and must be called
  within `setup()` or `<script setup>`.

### Structure

Follow this order: (1) reactive state, (2) logic that modifies state, (3) lifecycle
hooks for side effects, (4) return refs.

### Return Values

Always return a plain object containing refs. Never return a `reactive()` object —
it loses reactivity on destructure. If the consumer wants an object, they can wrap:
`const mouse = reactive(useMouse())`.

### Input Arguments

Accept refs, getters, and raw values. Use `toValue()` (with `MaybeRefOrGetter<T>` type)
to normalize inputs inside `watchEffect` so reactive sources are tracked.

### Side Effects and Cleanup

- Always clean up side effects in `onUnmounted()` — event listeners, timers,
  subscriptions.
- SSR safety: DOM-specific effects go in `onMounted()` / `onUnmounted()`, not at
  top level.

### Composition

Composables can call other composables — build complex logic by composing simple hooks.

### Usage Restrictions

- Must be called inside `<script setup>` or `setup()` function.
- Must be called synchronously — not inside async callbacks or promises.
- Exception: `<script setup>` restores the active instance after `await`, so composables
  work after `await` in `<script setup>`.
- Inside lifecycle hooks like `onMounted()` is acceptable.

### Composables vs Alternatives

| Technique | Drawback |
|-----------|----------|
| Mixins | Unclear property sources, namespace collisions, implicit coupling |
| Renderless components | Extra component instance overhead |
| Utility functions | No reactive state or lifecycle hooks |

Composables are explicit, namespaced through destructuring, and integrate with Vue's
reactivity and lifecycle.

## TypeScript

### Props

- Use `defineProps<T>()` with an interface.
- Defaults with 3.5+ destructure: `const { title, count = 0 } = defineProps<Props>()`.
- Defaults with 3.4 and below: `withDefaults(defineProps<Props>(), { count: 0 })`.
  Mutable reference defaults (arrays, objects) must use factory functions with
  `withDefaults`.
- Imported types work since Vue 3.3.

### Emits

Use named tuple syntax (3.3+): `defineEmits<{ change: [id: number] }>()`.

### Refs

- Refs infer types from initial values — `ref(0)` is `Ref<number>`.
- Use explicit type for union types: `ref<string | number>('2024')`.
- Nullable: `ref<User | null>(null)`.
- Without initial value: `ref<ResponseData>()` yields `Ref<ResponseData | undefined>`.

### Computed

Types are inferred. Use explicit generic only when inference falls short:
`computed<string>(() => ...)`.

### Reactive

Annotate with interface, do not use `reactive<T>()` generic — the returned type handles
ref unwrapping differently from the generic parameter.

### Template Refs

- 3.5+: `useTemplateRef<HTMLInputElement>('input')`.
- Component refs: `useTemplateRef<InstanceType<typeof MyComponent>>('comp')`.
- Pre-3.5: `ref<HTMLInputElement | null>(null)`.

### Provide / Inject

Use `InjectionKey<T>` for type-safe keys. String keys require generic annotation:
`inject<string>('key')`.

### Generic Components

Use `generic` attribute on `<script setup>`:
`<script setup lang="ts" generic="T extends string | number">`.

### Event Handlers

Type DOM events explicitly: `(event: Event)` then cast target:
`event.target as HTMLInputElement`.

### Utility Types

Use Vue's typed helpers: `Ref<T>`, `ComputedRef<T>`, `MaybeRefOrGetter<T>`,
`InjectionKey<T>`, `PropType<T>`, `ComponentPublicInstance`. Full utility types
table in `references/typescript.md`.

## Performance

### Page Load

- Use dynamic imports for route-level code splitting.
- Use `defineAsyncComponent()` for component-level splitting.
- Prefer tree-shakable dependencies (`lodash-es` over `lodash`).
- `<script setup>` compiles to more minification-friendly code than Options API.

### Update Performance

- **Props stability** — pass derived booleans (`active="item.id === activeId"`) instead
  of raw IDs to prevent unnecessary child re-renders.
- **`v-once`** — render once, skip all future updates. For truly static content.
- **`v-memo`** — conditionally skip sub-tree updates. Accepts a dependency array; only
  re-renders when a dependency changes. Use on `v-for` lists where most items don't
  change.
- **Computed stability (3.4+)** — computed only triggers effects when value actually
  changes. Avoid returning new objects from computed (each new object is "different").

### Large Lists

- Virtual scrolling for 1000+ items — render only visible items
  (`vue-virtual-scroller`, `vueuc/VVirtualList`).
- `shallowRef()` for large immutable datasets — mutations must replace the whole value.
- Avoid unnecessary wrapper components in large lists — every component instance has
  overhead.

### Watch Performance

- Avoid `{ deep: true }` on large objects — watch specific properties instead.
- Throttle/debounce watchers for expensive callbacks (e.g., `useDebounceFn` from
  VueUse).

### Profiling

- Enable `app.config.performance = true` for Vue-specific performance markers.
- Use Chrome DevTools Performance panel and Vue DevTools profiler.
- Measure before and after — don't optimize without data.

## Application

When **writing** Vue code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.
- Always use `<script setup>` unless there is a documented reason not to.

When **reviewing** Vue code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

## Integration

This skill provides Vue-specific conventions. The coding skill governs workflow;
language skills govern JS/TS choices; this skill governs component architecture,
reactivity patterns, and framework API usage.
