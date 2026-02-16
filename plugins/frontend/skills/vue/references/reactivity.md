# Reactivity

Vue's reactivity system tracks dependencies at property-access granularity.
Understanding it prevents the most common Vue bugs.

## Choosing a Reactive Primitive

| Primitive | Use When |
|-----------|----------|
| `ref()` | **Default choice.** Works with any value type. |
| `reactive()` | Grouping related state into one object when destructure is not needed. |
| `shallowRef()` | Large immutable structures, external state integration. |
| `shallowReactive()` | Root-level-only reactivity on objects. |
| `computed()` | Derived state. Caches until dependencies change. |

### `ref()` is the Primary API

```ts
import { ref } from 'vue'

const count = ref(0)

// In script: access .value
count.value++

// In template: auto-unwrapped
// {{ count }} renders "1"
```

**Why `ref()` over `reactive()`:**
- Works with primitives (`string`, `number`, `boolean`)
- Can be destructured from composable returns without losing reactivity
- Can be reassigned (`count.value = newValue`)
- Consistent `.value` access pattern everywhere in script

### `reactive()` Limitations

```ts
import { reactive } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// Works: property access is tracked
state.count++

// BREAKS: reassignment loses reactivity
// state = reactive({ count: 1, name: 'Vue' })  // Don't do this

// BREAKS: destructuring primitives loses reactivity
// const { count } = state  // count is now a plain number
```

Use `toRefs()` if you must destructure a reactive object:

```ts
import { reactive, toRefs } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })
const { count, name } = toRefs(state) // count and name are Ref<>
```

## Computed Properties

```ts
import { ref, computed } from 'vue'

const items = ref([1, 2, 3, 4, 5])

// Read-only computed
const evenItems = computed(() => items.value.filter(n => n % 2 === 0))

// Writable computed (rare — use sparingly)
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (val) => {
    const [first, last] = val.split(' ')
    firstName.value = first
    lastName.value = last
  }
})
```

**Rules:**
- Keep computed getters pure — no side effects.
- Split complex computed into smaller ones.
- Computed caches its value; only recalculates when dependencies change.
- Computed stability (3.4+): only triggers effects when the returned value
  actually changes.

## Watchers

### `watch()`

Watches specific sources. Lazy by default (doesn't run on mount).

```ts
import { ref, watch } from 'vue'

const query = ref('')

// Watch a single ref
watch(query, (newVal, oldVal) => {
  fetchResults(newVal)
})

// Watch a getter
watch(
  () => props.id,
  (newId) => { fetchData(newId) }
)

// Watch multiple sources
watch([firstName, lastName], ([newFirst, newLast]) => {
  updateFullName(newFirst, newLast)
})

// Immediate execution
watch(source, callback, { immediate: true })

// Deep watching (use sparingly — expensive)
watch(source, callback, { deep: true })
```

### `watchEffect()`

Runs immediately, auto-tracks all reactive dependencies accessed during
execution.

```ts
import { ref, watchEffect } from 'vue'

const url = ref('/api/data')

watchEffect(() => {
  // Automatically tracks `url`
  fetch(url.value).then(/* ... */)
})
```

**When to use which:**

| Use `watch()` when | Use `watchEffect()` when |
|--------------------|--------------------------|
| Need old and new values | Don't need old value |
| Want lazy execution | Want immediate execution |
| Watching specific sources | Dependencies are implicit |
| Need conditional watching | Effect tracks all accessed refs |

### Cleanup

Both `watch` and `watchEffect` support cleanup via the `onCleanup` parameter:

```ts
watchEffect((onCleanup) => {
  const controller = new AbortController()

  fetch(url.value, { signal: controller.signal })

  onCleanup(() => controller.abort())
})
```

## Deep Reactivity

`ref()` and `reactive()` are deep by default — nested objects are also
reactive:

```ts
const obj = ref({
  nested: { count: 0 },
  arr: ['foo', 'bar']
})

// These trigger updates:
obj.value.nested.count++
obj.value.arr.push('baz')
```

Use `shallowRef()` to opt out of deep reactivity for large structures:

```ts
import { shallowRef, triggerRef } from 'vue'

const data = shallowRef({ items: largeArray })

// This does NOT trigger updates:
data.value.items.push(newItem)

// This does:
data.value = { ...data.value, items: [...data.value.items, newItem] }

// Or manually trigger:
data.value.items.push(newItem)
triggerRef(data)
```

## Ref Unwrapping

### In Templates

Top-level refs are auto-unwrapped in templates:

```ts
const count = ref(0)
// Template: {{ count }} renders "0", not the ref object
```

Non-top-level refs in plain objects are NOT unwrapped:

```ts
const obj = { id: ref(1) }
// Template: {{ obj.id + 1 }} renders "[object Object]1"
// Fix: const { id } = obj  // destructure to top level
```

### In Reactive Objects

Refs nested in `reactive()` objects are unwrapped:

```ts
const count = ref(0)
const state = reactive({ count })
console.log(state.count) // 0, not Ref<0>
```

Refs in reactive arrays/collections are NOT unwrapped:

```ts
const books = reactive([ref('Vue Guide')])
console.log(books[0].value) // Need .value here
```

## DOM Update Timing

Reactive state changes batch DOM updates to the next tick:

```ts
import { ref, nextTick } from 'vue'

const count = ref(0)
count.value++

// DOM not yet updated here

await nextTick()
// DOM is now updated
```
