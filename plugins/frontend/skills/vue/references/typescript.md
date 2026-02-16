# TypeScript

Vue 3 Composition API is designed for TypeScript. Most types are inferred
automatically — add explicit annotations only where inference falls short.

## Props

### Type-Based Declaration (Preferred)

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  items: string[]
}

const props = defineProps<Props>()
</script>
```

### With Defaults

```ts
// 3.5+ reactive destructure (preferred)
const { title, count = 0, items = [] } = defineProps<Props>()

// 3.4 and below: withDefaults
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  items: () => [] // factory for objects/arrays
})
```

**Note:** Mutable reference type defaults (arrays, objects) must use factory
functions with `withDefaults` to avoid shared references. This is NOT
needed with destructure defaults.

### Complex Prop Types

```vue
<script setup lang="ts">
interface Book {
  title: string
  author: string
  year: number
}

const props = defineProps<{
  book: Book
  onSelect?: (book: Book) => void
}>()
</script>
```

### Imported Types

Works since Vue 3.3:

```vue
<script setup lang="ts">
import type { User } from '@/types'

const props = defineProps<{
  user: User
}>()
</script>
```

## Emits

### Type-Based Declaration

```vue
<script setup lang="ts">
// Named tuple syntax (3.3+, preferred)
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()

// Call-signature syntax (also valid)
const emit = defineEmits<{
  (e: 'change', id: number): void
  (e: 'update', value: string): void
}>()
</script>
```

## Refs

Refs infer types from initial values:

```ts
const count = ref(0)       // Ref<number>
const name = ref('Vue')    // Ref<string>
```

Explicit type when inference is insufficient:

```ts
// Union type
const year = ref<string | number>('2024')

// Nullable
const user = ref<User | null>(null)

// Without initial value
const data = ref<ResponseData>() // Ref<ResponseData | undefined>
```

## Computed

```ts
const count = ref(0)
const doubled = computed(() => count.value * 2) // ComputedRef<number>

// Explicit generic (rarely needed)
const result = computed<string>(() => {
  return count.value > 0 ? 'positive' : 'zero'
})
```

## Reactive

```ts
interface State {
  count: number
  user: User | null
}

// Use interface annotation, not generic
const state: State = reactive({
  count: 0,
  user: null
})
```

Don't use `reactive<T>()` generic — the returned type handles ref
unwrapping differently from the generic parameter.

## Template Refs

```vue
<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'

// 3.5+: auto-inferred from matching ref attribute
const input = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  input.value?.focus()
})
</script>

<template>
  <input ref="input" />
</template>
```

Pre-3.5:

```ts
const input = ref<HTMLInputElement | null>(null)
```

### Component Refs

```ts
import MyComponent from './MyComponent.vue'

type MyComponentInstance = InstanceType<typeof MyComponent>
const comp = useTemplateRef<MyComponentInstance>('comp')
```

## Provide / Inject

Use `InjectionKey` for type-safe provide/inject:

```ts
// keys.ts
import type { InjectionKey, Ref } from 'vue'

export const CountKey: InjectionKey<Ref<number>> = Symbol('count')
```

```ts
// Provider
import { provide, ref } from 'vue'
import { CountKey } from './keys'

const count = ref(0)
provide(CountKey, count) // type-checked
```

```ts
// Consumer
import { inject } from 'vue'
import { CountKey } from './keys'

const count = inject(CountKey) // Ref<number> | undefined
const count = inject(CountKey, ref(0)) // Ref<number>
```

String keys require generic annotation:

```ts
const value = inject<string>('key')           // string | undefined
const value = inject<string>('key', 'default') // string
```

## Event Handlers

Type DOM events explicitly:

```ts
function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  console.log(target.value)
}
```

## Generic Components

```vue
<script setup lang="ts" generic="T extends string | number">
const props = defineProps<{
  items: T[]
  selected: T
}>()

const emit = defineEmits<{
  select: [item: T]
}>()
</script>
```

## Utility Types

| Type | Purpose |
|------|---------|
| `Ref<T>` | Ref wrapper type |
| `ComputedRef<T>` | Computed ref type |
| `MaybeRef<T>` | `T \| Ref<T>` |
| `MaybeRefOrGetter<T>` | `T \| Ref<T> \| (() => T)` |
| `InjectionKey<T>` | Typed injection key |
| `PropType<T>` | Runtime prop type casting |
| `ComponentPublicInstance` | Generic component instance |
