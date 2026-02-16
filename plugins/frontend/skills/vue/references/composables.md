# Composables

Composables are functions that encapsulate and reuse stateful logic using
the Composition API. They replace mixins entirely.

## Naming

- **Always prefix with `use`:** `useMouse`, `useFetch`, `useAuth`.
- **camelCase:** `useEventListener`, not `use-event-listener`.
- The `use` prefix signals that the function uses Vue reactivity and
  must be called within `setup()` or `<script setup>`.

## Structure

```ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  // 1. Reactive state
  const x = ref(0)
  const y = ref(0)

  // 2. Logic that modifies state
  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }

  // 3. Lifecycle hooks for side effects
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  // 4. Return refs (not reactive object)
  return { x, y }
}
```

## Return Values

**Always return a plain object containing refs.** This allows destructuring
with retained reactivity:

```ts
// GOOD: plain object with refs
return { x, y, isLoading, error }

// BAD: reactive object (loses reactivity on destructure)
return reactive({ x, y, isLoading, error })
```

If the consumer wants an object, they can wrap:

```ts
const mouse = reactive(useMouse()) // mouse.x auto-unwraps
```

## Input Arguments

Accept refs, getters, and raw values. Use `toValue()` to normalize:

```ts
import { ref, watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export function useFetch(url: MaybeRefOrGetter<string>) {
  const data = ref<unknown>(null)
  const error = ref<Error | null>(null)

  watchEffect(() => {
    data.value = null
    error.value = null

    fetch(toValue(url))
      .then(res => res.json())
      .then(json => { data.value = json })
      .catch(err => { error.value = err })
  })

  return { data, error }
}
```

Calling `toValue()` inside `watchEffect` ensures the reactive source is
tracked.

Usage:

```ts
// All three work:
useFetch('/api/users')                 // raw string
useFetch(urlRef)                       // ref
useFetch(() => `/api/users/${id}`)     // getter
```

## Side Effects

### Cleanup

Always clean up side effects in `onUnmounted()`:

```ts
export function useEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener
) {
  onMounted(() => target.addEventListener(event, handler))
  onUnmounted(() => target.removeEventListener(event, handler))
}
```

### SSR Safety

DOM-specific side effects go in post-mount hooks:

```ts
export function useWindowSize() {
  const width = ref(0)
  const height = ref(0)

  function update() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  // Only runs in browser, not during SSR
  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { width, height }
}
```

## Composable Composition

Composables can call other composables:

```ts
import { ref } from 'vue'
import { useEventListener } from './useEventListener'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  useEventListener(window, 'mousemove', (event: MouseEvent) => {
    x.value = event.pageX
    y.value = event.pageY
  })

  return { x, y }
}
```

## Usage Restrictions

Composables must be called:
- Inside `<script setup>` (most common)
- Inside the `setup()` function
- Synchronously (not inside async callbacks or promises)
- Inside lifecycle hooks like `onMounted()` is acceptable

**Exception:** `<script setup>` restores the active instance after `await`,
so composables work after `await` in `<script setup>`.

## Composables vs Alternatives

| Technique | Drawback |
|-----------|----------|
| Mixins | Unclear property sources, namespace collisions, implicit coupling |
| Renderless components | Extra component instance overhead |
| Utility functions | No reactive state or lifecycle hooks |

Composables solve all three — they're explicit, namespaced through
destructuring, and integrate with Vue's reactivity and lifecycle.
