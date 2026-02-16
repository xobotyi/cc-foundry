# Single-File Components

SFCs (`.vue` files) colocate template, logic, and styles in one file.
They are the recommended authoring format for all non-trivial Vue code.

## Block Order

Always order blocks consistently:

```vue
<script setup lang="ts">
// logic
</script>

<template>
  <!-- markup -->
</template>

<style scoped>
/* styles */
</style>
```

**`<script setup>` first, `<template>` second, `<style>` last.**

## `<script setup>`

Everything declared at the top level is available in the template.
No need for `return` statements or `components` registration.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import TodoItem from './TodoItem.vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <TodoItem />
  <button @click="increment">{{ count }} ({{ doubled }})</button>
</template>
```

### Organization Within `<script setup>`

Order declarations logically:

1. **Imports** — Vue APIs, components, composables, types
2. **Props and emits** — `defineProps`, `defineEmits`
3. **Composable calls** — `useRouter()`, `useFetch()`, custom composables
4. **Reactive state** — `ref()`, `reactive()`, `computed()`
5. **Functions** — event handlers, helpers
6. **Watchers** — `watch()`, `watchEffect()`
7. **Lifecycle hooks** — `onMounted()`, `onUnmounted()`
8. **Expose** — `defineExpose()` (rare)

### Compiler Macros

These are available without import in `<script setup>`:

| Macro | Purpose |
|-------|---------|
| `defineProps()` | Declare component props |
| `defineEmits()` | Declare component events |
| `defineExpose()` | Expose public instance properties |
| `defineOptions()` | Set component options (`name`, `inheritAttrs`) |
| `defineSlots()` | Type-check slot props (TS only) |
| `defineModel()` | Two-way binding (v-model) shorthand |
| `withDefaults()` | Set defaults for type-based props |

### `defineOptions()`

Set options that `<script setup>` doesn't natively support:

```vue
<script setup lang="ts">
defineOptions({
  name: 'CustomName',
  inheritAttrs: false
})
</script>
```

## Template Syntax

### Directives

| Shorthand | Full | Purpose |
|-----------|------|---------|
| `:prop` | `v-bind:prop` | Bind attribute/prop |
| `@event` | `v-on:event` | Listen to event |
| `#slot` | `v-slot:slot` | Named slot |

Always use shorthands consistently — don't mix `:` and `v-bind:`.

### Multi-Attribute Formatting

```vue
<!-- Bad: everything on one line -->
<MyComponent foo="a" bar="b" baz="c" />

<!-- Good: one attribute per line -->
<MyComponent
  foo="a"
  bar="b"
  baz="c"
/>
```

### Conditional Rendering

```vue
<!-- v-if / v-else-if / v-else for conditional blocks -->
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>Other</div>

<!-- v-show for frequent toggling (CSS display: none) -->
<div v-show="isVisible">Toggled frequently</div>
```

Use `v-if` for conditions that rarely change. Use `v-show` for frequent
toggles (avoids mount/unmount cost).

### List Rendering

```vue
<!-- Always provide :key -->
<ul>
  <li
    v-for="item in items"
    :key="item.id"
  >
    {{ item.name }}
  </li>
</ul>

<!-- Filter with computed, not v-if on same element -->
<ul>
  <li
    v-for="user in activeUsers"
    :key="user.id"
  >
    {{ user.name }}
  </li>
</ul>
```

### Template Refs

```vue
<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'

const inputEl = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<template>
  <input ref="input" />
</template>
```

Pre-3.5, use `ref<HTMLInputElement | null>(null)` with matching `ref` name.

## Scoped Styles

```vue
<style scoped>
.button {
  color: red;
}
</style>
```

Scoped styles use data attributes to scope CSS to the component.
Child component root elements are affected by both parent and child scoped
styles.

### Deep Selectors

To style child component internals from a parent (use sparingly):

```vue
<style scoped>
.parent :deep(.child-class) {
  color: blue;
}
</style>
```

### CSS Modules

Alternative to scoped styles — generates unique class names:

```vue
<template>
  <button :class="$style.button">Click</button>
</template>

<style module>
.button {
  color: red;
}
</style>
```

### `v-bind()` in Styles

Use reactive values in CSS:

```vue
<script setup>
import { ref } from 'vue'

const color = ref('red')
</script>

<style scoped>
.text {
  color: v-bind(color);
}
</style>
```
