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

## Route to Reference

| Situation | Reference |
|-----------|-----------|
| `ref`, `reactive`, `computed`, `watch`, `watchEffect`, shallow refs | [reactivity.md](references/reactivity.md) |
| `<script setup>`, SFC structure, `defineOptions`, block ordering | [sfc.md](references/sfc.md) |
| Props, emits, slots, provide/inject, component naming, v-model | [components.md](references/components.md) |
| Composable design, naming, return values, lifecycle coupling | [composables.md](references/composables.md) |
| `defineProps<T>()`, `defineEmits<T>()`, typed refs, `InjectionKey` | [typescript.md](references/typescript.md) |
| `v-once`, `v-memo`, `shallowRef`, lazy routes, virtualized lists | [performance.md](references/performance.md) |

Read the relevant reference before writing code in that area.

## Core Rules

These apply to ALL Vue code. No exceptions.

### API Style

1. **Composition API only.** Never use Options API in new code.
2. **`<script setup>` always.** Never use bare `setup()` in SFCs.
3. **`ref()` over `reactive()`.** `reactive()` loses reactivity on destructure
   and reassignment. Use `ref()` as the primary reactive primitive.
4. **`computed()` for derived state.** Never derive state inside templates
   with inline expressions longer than a single property access or method call.

### Component Conventions

1. **Multi-word names.** Every component name must be multi-word (`TodoItem`,
   not `Item`) to avoid conflicts with HTML elements.
2. **PascalCase in templates.** Use `<TodoItem />` in SFC templates,
   kebab-case only in in-DOM templates.
3. **Self-closing tags.** Components with no children: `<MyComponent />`.
4. **One component per file.** No inline component registration.
5. **PascalCase filenames.** `TodoItem.vue`, not `todoItem.vue` or
   `todo-item.vue`.
6. **Base component prefix.** Presentational components use `Base`, `App`,
   or `V` prefix: `BaseButton`, `BaseIcon`.

### Props and Events

1. **Type-based props.** Use `defineProps<T>()` in TypeScript projects.
   Use object syntax with types in JavaScript projects. Never array syntax
   in committed code.
2. **camelCase declaration, kebab-case in templates.**
   Declare `greetingText`, use `:greeting-text="value"`.
3. **Never mutate props.** Use `computed()` for transformations,
   `ref()` + initial value for local copies.
4. **Declare all emits.** Use `defineEmits()` — preferably type-based.
5. **One-way data flow.** Child emits events, parent handles mutations.

### Template Rules

1. **`v-for` always has `:key`.** Use stable, unique identifiers.
2. **Never `v-if` on same element as `v-for`.** Use `computed` to filter,
   or wrap with `<template v-for>`.
3. **Simple expressions only.** Move logic to `computed` or functions.
4. **Directive shorthands consistently.** Always use `:` for `v-bind`,
   `@` for `v-on`, `#` for `v-slot` — or never. Don't mix.
5. **Multi-attribute elements span multiple lines.** One attribute per line.

### Styling

1. **Scoped styles by default.** Use `<style scoped>` or CSS modules.
2. **Global styles only in `App.vue` or layout components.**

### Reactivity Safety

1. **Access `.value` in script, omit in template.** Templates auto-unwrap
   top-level refs.
2. **Don't destructure `reactive()` objects.** Loses reactivity. Use
   `toRefs()` or stick with `ref()`.
3. **Use `toValue()` in composables** to normalize ref/getter/raw inputs.
4. **`nextTick()` for post-DOM-update logic.** DOM updates are async.

## Quick Anti-Pattern Reference

| Don't | Do |
|-------|------|
| `defineProps(['title'])` | `defineProps<{ title: string }>()` |
| `reactive({ count: 0 })` for primitives | `ref(0)` |
| `let { count } = reactive(state)` | `const { count } = toRefs(state)` or use `ref()` |
| `<item />` (single-word) | `<TodoItem />` (multi-word) |
| `v-for="u in users" v-if="u.active"` | `v-for="u in activeUsers"` with `computed` |
| `{{ name.split(' ').map(...).join(' ') }}` | `{{ normalizedName }}` with `computed` |
| `props.size = 'large'` | `const localSize = ref(props.size)` |
| `<style>` (unscoped) | `<style scoped>` |
| `export default { data() {}, methods: {} }` | `<script setup>` with Composition API |
| `this.$emit('update')` | `const emit = defineEmits<{ update: [] }>()` |
| `mixins: [myMixin]` | `const { x } = useMyComposable()` |
| `watch: { deep: true }` on large objects | `watch(() => obj.specificProp, ...)` |
| `<MyComponent></MyComponent>` (no content) | `<MyComponent />` |

## Application

When **writing** Vue code:
- Apply all conventions silently — don't narrate each rule being followed.
- If an existing codebase contradicts a convention, follow the codebase and
  flag the divergence once.
- Always use `<script setup>` unless there is a documented reason not to.

When **reviewing** Vue code:
- Cite the specific violation and show the fix inline.
- Don't lecture or quote the rule — state what's wrong and how to fix it.

```
Bad review comment:
  "According to Vue best practices, you should use defineProps
   with type-based declaration instead of array syntax."

Good review comment:
  "`defineProps(['title'])` -> `defineProps<{ title: string }>()`
   -- type-based declaration enables compile-time validation."
```

## Integration

This skill provides Vue-specific conventions alongside other skills:

1. **Coding** — Discovery, planning, verification discipline
2. **JavaScript/TypeScript** — Language-level idioms
3. **Vue** — Framework-specific patterns (this skill)
4. **CSS** — Styling conventions within `<style>` blocks

The coding skill governs workflow; language skills govern JS/TS choices;
this skill governs Vue component architecture, reactivity patterns, and
framework API usage.
