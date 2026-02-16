# Components

Vue components encapsulate template, logic, and styles. This reference
covers props, emits, slots, provide/inject, and naming conventions.

## Props

### Declaration

Always use detailed prop definitions. Array syntax is for prototyping only.

```vue
<script setup lang="ts">
// Type-based (preferred in TS projects)
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// With defaults
const { title, count = 0 } = defineProps<{
  title: string
  count?: number
}>()
</script>
```

For JS projects, use object syntax:

```vue
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
})
</script>
```

### Reactive Props Destructure (3.5+)

Destructured props are reactive in 3.5+:

```ts
const { title, count = 0 } = defineProps<{
  title: string
  count?: number
}>()

// `title` is reactive — usable in watch/computed
watch(() => title, (newTitle) => { /* ... */ })
```

Pass destructured props to composables via getter:

```ts
const { id } = defineProps<{ id: number }>()

// Wrap in getter to retain reactivity
useComposable(() => id)
```

### One-Way Data Flow

Props flow down, events flow up. Never mutate props directly.

```ts
// WRONG
props.count++

// RIGHT: local copy for initial value
const localCount = ref(props.count)

// RIGHT: computed for transformations
const normalizedTitle = computed(() => props.title.trim().toLowerCase())
```

### Prop Naming

- Declare in `camelCase`: `greetingText`
- Use in templates as `kebab-case`: `:greeting-text="value"`
- This is Vue's automatic case conversion

## Emits

### Declaration

```vue
<script setup lang="ts">
// Type-based (preferred)
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()

// Runtime validation
const emit = defineEmits({
  submit: (payload: { email: string }) => {
    return !!payload.email // validation
  }
})
</script>
```

### Usage

```ts
function handleClick() {
  emit('change', item.id)
}
```

In templates, use `$emit`:

```vue
<template>
  <button @click="$emit('change', item.id)">Update</button>
</template>
```

### Event Naming

- Emit in `camelCase`: `emit('someEvent')`
- Listen in `kebab-case`: `@some-event="handler"`
- Vue handles the conversion automatically

## v-model

### Basic

```vue
<!-- Parent -->
<CustomInput v-model="searchText" />

<!-- CustomInput.vue -->
<script setup lang="ts">
const model = defineModel<string>()
</script>

<template>
  <input :value="model" @input="model = $event.target.value" />
</template>
```

### Named v-model

```vue
<!-- Parent -->
<UserForm v-model:first-name="first" v-model:last-name="last" />

<!-- UserForm.vue -->
<script setup lang="ts">
const firstName = defineModel<string>('firstName')
const lastName = defineModel<string>('lastName')
</script>
```

## Slots

### Default Slot

```vue
<!-- Parent -->
<AlertBox>Something happened.</AlertBox>

<!-- AlertBox.vue -->
<template>
  <div class="alert">
    <slot />
  </div>
</template>
```

### Named Slots

```vue
<!-- Parent -->
<BaseLayout>
  <template #header>
    <h1>Page Title</h1>
  </template>

  <template #default>
    <p>Main content</p>
  </template>

  <template #footer>
    <p>Footer</p>
  </template>
</BaseLayout>

<!-- BaseLayout.vue -->
<template>
  <header><slot name="header" /></header>
  <main><slot /></main>
  <footer><slot name="footer" /></footer>
</template>
```

### Scoped Slots

```vue
<!-- ItemList.vue -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot name="item" :item="item" :index="index" />
    </li>
  </ul>
</template>

<!-- Parent -->
<ItemList :items="items">
  <template #item="{ item, index }">
    <span>{{ index }}: {{ item.name }}</span>
  </template>
</ItemList>
```

## Provide / Inject

Dependency injection for deep component trees. Avoids prop drilling.

### Providing

```vue
<script setup lang="ts">
import { provide, ref, readonly } from 'vue'
import type { InjectionKey } from 'vue'

// Use Symbol keys for type safety
export const ThemeKey: InjectionKey<Ref<string>> = Symbol('theme')

const theme = ref('dark')
provide(ThemeKey, readonly(theme))

// Provide updater functions instead of mutable state
function updateTheme(newTheme: string) {
  theme.value = newTheme
}
provide('updateTheme', updateTheme)
</script>
```

### Injecting

```vue
<script setup lang="ts">
import { inject } from 'vue'
import { ThemeKey } from './keys'

const theme = inject(ThemeKey) // Ref<string> | undefined
const theme = inject(ThemeKey, ref('light')) // with default
</script>
```

### Rules

1. **Use `Symbol` keys** for non-trivial apps to avoid collisions.
2. **Export keys from a shared `keys.ts`** file.
3. **Provide `readonly()` refs** to prevent consumers from mutating state.
4. **Provide updater functions** when consumers need to change state.
5. **Always provide a default** or handle `undefined` in the consumer.

## Component Naming

### File Names

- **PascalCase preferred:** `TodoItem.vue`, `BaseButton.vue`
- **kebab-case acceptable:** `todo-item.vue`, `base-button.vue`
- **Choose one convention** for the project and be consistent.

### In Templates

```vue
<!-- PascalCase in SFC templates (preferred) -->
<TodoItem />

<!-- kebab-case in in-DOM templates (required) -->
<todo-item></todo-item>
```

### Naming Patterns

| Pattern | Example | When |
|---------|---------|------|
| Multi-word | `TodoItem` | Always (except root `App`) |
| Base prefix | `BaseButton`, `BaseIcon` | Presentational components |
| Parent prefix | `TodoListItem`, `TodoListItemButton` | Tightly coupled children |
| Highest-level first | `SearchButtonClear`, `SearchInputQuery` | Groups related components |
| Full words | `StudentDashboardSettings` | Always — no abbreviations |

### In JS/TS

```ts
// Always PascalCase when importing
import TodoItem from './TodoItem.vue'
```
