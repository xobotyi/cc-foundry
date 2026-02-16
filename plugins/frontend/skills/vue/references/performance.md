# Performance

Vue is fast by default. Optimize only when profiling reveals a bottleneck.
Premature optimization creates complexity without measurable benefit.

## Page Load

### Code Splitting

Use dynamic imports for route-level code splitting:

```ts
// router.ts
const UserProfile = () => import('./views/UserProfile.vue')

const routes = [
  { path: '/user/:id', component: UserProfile }
]
```

Use `defineAsyncComponent` for component-level splitting:

```ts
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(
  () => import('./components/HeavyChart.vue')
)
```

### Bundle Size

- Prefer tree-shakable dependencies (`lodash-es` over `lodash`).
- Vue APIs are tree-shakable — unused features like `<Transition>` are
  excluded from production builds.
- Use `<script setup>` — it compiles to more minification-friendly code
  than Options API.

## Update Performance

### Props Stability

Avoid passing values that change for every item:

```vue
<!-- BAD: every ListItem re-renders when activeId changes -->
<ListItem
  v-for="item in list"
  :key="item.id"
  :id="item.id"
  :active-id="activeId"
/>

<!-- GOOD: only items whose active status changed re-render -->
<ListItem
  v-for="item in list"
  :key="item.id"
  :id="item.id"
  :active="item.id === activeId"
/>
```

### `v-once`

Render once, skip all future updates:

```vue
<span v-once>{{ expensiveComputation }}</span>
```

Use for truly static content that depends on initial data.

### `v-memo`

Conditionally skip sub-tree updates:

```vue
<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
  <p>ID: {{ item.id }} - selected: {{ item.id === selected }}</p>
  <!-- expensive sub-tree -->
</div>
```

`v-memo` accepts a dependency array. The sub-tree only re-renders when
a dependency changes. Use on `v-for` lists where most items don't change.

### Computed Stability (3.4+)

Computed properties only trigger effects when the returned value actually
changes:

```ts
const isEven = computed(() => count.value % 2 === 0)

// Changing count from 2 to 4 does NOT re-trigger watchers
// because isEven stays true
```

Avoid returning new objects from computed — each new object is "different":

```ts
// BAD: new object every time, always triggers
const result = computed(() => ({
  isEven: count.value % 2 === 0
}))

// GOOD: return old value when nothing changed
const result = computed((oldValue) => {
  const newValue = { isEven: count.value % 2 === 0 }
  if (oldValue && oldValue.isEven === newValue.isEven) {
    return oldValue
  }
  return newValue
})
```

## Large Lists

### Virtual Scrolling

For lists with 1000+ items, use virtual scrolling — render only visible
items:

```ts
// Community libraries:
// - vue-virtual-scroller
// - vueuc/VVirtualList
```

### `shallowRef` for Large Data

Opt out of deep reactivity for large, immutable datasets:

```ts
import { shallowRef } from 'vue'

const largeList = shallowRef(fetchedData)

// Mutations must replace the whole value
largeList.value = [...largeList.value, newItem]
```

## Component Abstractions

Every component instance has overhead (state, lifecycle, rendering).
In large lists, avoid unnecessary wrapper components:

```vue
<!-- BAD: 100 wrapper components in a list -->
<ItemWrapper v-for="item in items" :key="item.id">
  <ItemContent :item="item" />
</ItemWrapper>

<!-- GOOD: flatten when wrapper adds no value -->
<ItemContent v-for="item in items" :key="item.id" :item="item" />
```

## Watch Performance

### Avoid Deep Watching Large Objects

```ts
// BAD: watches every nested property change
watch(largeObject, callback, { deep: true })

// GOOD: watch specific properties
watch(() => largeObject.value.specificProp, callback)
```

### Throttle/Debounce Watchers

```ts
import { watchEffect } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn((query: string) => {
  fetchResults(query)
}, 300)

watch(searchQuery, (query) => {
  debouncedSearch(query)
})
```

## Profiling

1. Enable Vue-specific performance markers:
   ```ts
   app.config.performance = true
   ```
2. Use Chrome DevTools Performance panel.
3. Use Vue DevTools performance profiler.
4. Measure before and after — don't optimize without data.
