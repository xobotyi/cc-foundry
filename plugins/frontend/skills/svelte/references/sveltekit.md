# SvelteKit

SvelteKit conventions: routing, load functions, form actions, hooks, and
state management.

## Filesystem Routing

Routes are directories under `src/routes/`. Files with `+` prefix are route
files.

```
src/routes/
├── +page.svelte              -> /
├── +layout.svelte            -> wraps all pages
├── about/
│   └── +page.svelte          -> /about
├── blog/
│   ├── +page.svelte          -> /blog
│   └── [slug]/
│       ├── +page.svelte      -> /blog/:slug
│       ├── +page.server.js   -> server load + actions
│       └── +error.svelte     -> error boundary
└── api/
    └── items/
        └── +server.js        -> API endpoint
```

### Key Rules

- All files can run on the server
- All files run on the client except `+server` files
- `+layout` and `+error` apply to subdirectories too

## Page Files

### +page.svelte

Renders the page. Receives `data` from load functions:

```svelte
<script>
  /** @type {import('./$types').PageProps} */
  let { data } = $props();
</script>
<h1>{data.title}</h1>
```

### +page.js (Universal Load)

Runs on server during SSR and in browser during navigation:

```js
/** @type {import('./$types').PageLoad} */
export function load({ params }) {
  return {
    post: { title: `Post ${params.slug}` }
  };
}
```

Export page options: `prerender`, `ssr`, `csr`.

### +page.server.js (Server Load)

Runs only on the server. Use for database access, private env vars:

```js
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  return { post: await db.getPost(params.slug) };
}
```

Also exports `actions` for form handling.

## Layout Files

### +layout.svelte

Wraps pages. Must render children:

```svelte
<script>
  let { children } = $props();
</script>
<nav><!-- navigation --></nav>
{@render children()}
```

### +layout.js / +layout.server.js

Layout load data is available to all child pages.

## Load Functions

### Universal vs Server

| Aspect | +page.js / +layout.js | +page.server.js / +layout.server.js |
|--------|----------------------|--------------------------------------|
| Runs on | Server (SSR) + Browser | Server only |
| Access | `params`, `url`, `fetch` | + `cookies`, `locals`, `request` |
| Returns | Any value (classes, components) | Serializable data (devalue) |
| Use for | External APIs, non-secret data | Database, private keys |

### Load Function Input

Both types receive: `params`, `route`, `url`, `fetch`, `setHeaders`, `parent`,
`depends`, `untrack`.

Server loads additionally receive: `cookies`, `locals`, `platform`, `request`.

### Using fetch in Load

Use the provided `fetch`, not global `fetch`:
- Inherits cookies for same-origin requests
- Makes relative requests work on server
- Internal requests bypass HTTP overhead
- Responses are inlined during SSR

### Streaming with Promises

Return un-awaited promises for non-essential data:

```js
export async function load({ params }) {
  return {
    post: await loadPost(params.slug),     // awaited -- blocks render
    comments: loadComments(params.slug)     // NOT awaited -- streams
  };
}
```

```svelte
{#await data.comments}
  Loading comments...
{:then comments}
  {#each comments as c}<p>{c.content}</p>{/each}
{/await}
```

Streaming requires platform support (works with Node.js servers and
edge runtimes; does not work with AWS Lambda).

### Rerunning Load Functions

SvelteKit tracks dependencies and only reruns when:
- `params` values change
- `url` properties change
- `parent()` was called and parent reran
- `invalidate(url)` or `invalidateAll()` called

### Errors and Redirects

```js
import { error, redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (!locals.user) redirect(307, '/login');
  if (!locals.user.isAdmin) error(403, 'not an admin');
}
```

## Form Actions

Server-only POST handlers in `+page.server.js`. Work without JavaScript.

### Default Action

```js
/** @satisfies {import('./$types').Actions} */
export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    // process...
  }
};
```

```svelte
<form method="POST">
  <input name="email" type="email">
  <button>Submit</button>
</form>
```

### Named Actions

```js
export const actions = {
  login: async ({ cookies, request }) => {
    const data = await request.formData();
    // ...
    return { success: true };
  },
  register: async (event) => { /* ... */ }
};
```

```svelte
<form method="POST" action="?/login">
  <!-- fields -->
  <button>Log in</button>
  <button formaction="?/register">Register</button>
</form>
```

### Validation Errors

```js
import { fail } from '@sveltejs/kit';

export const actions = {
  login: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    if (!email) return fail(400, { email, missing: true });
    // ...
  }
};
```

Access via `form` prop:

```svelte
<script>
  let { form } = $props();
</script>
{#if form?.missing}<p class="error">Email required</p>{/if}
```

### Progressive Enhancement

Add `use:enhance` for JavaScript-enhanced form submission:

```svelte
<script>
  import { enhance } from '$app/forms';
</script>
<form method="POST" use:enhance>
```

## API Routes (+server.js)

Export HTTP verb handlers:

```js
import { json, error } from '@sveltejs/kit';

export async function GET({ url }) {
  return json({ data: 'value' });
}

export async function POST({ request }) {
  const body = await request.json();
  return json(body);
}
```

## Hooks

### Server Hooks (src/hooks.server.js)

**handle** -- intercept every request:

```js
export async function handle({ event, resolve }) {
  event.locals.user = await getUser(event.cookies.get('sessionid'));
  const response = await resolve(event);
  response.headers.set('x-custom', 'value');
  return response;
}
```

**handleFetch** -- modify server-side fetch calls.

**handleError** -- log and sanitize unexpected errors.

**init** -- run once at server startup.

### Client Hooks (src/hooks.client.js)

**handleError** -- client-side error handling.

### Universal Hooks (src/hooks.js)

**reroute** -- rewrite URLs before routing.

**transport** -- serialize/deserialize custom types across server/client boundary.

## State Management

### Rules

- **No shared state on server.** Module-level variables are shared across
  requests. Use `event.locals` or context instead.
- **No side effects in load.** Return data, don't write to global state.
- **Use context for SSR-safe shared state.** Context is per-component-tree,
  not global.
- **Components are reused on navigation.** Use `$derived` for values that
  depend on `data` props -- plain assignments run only once.
- **Store state in URL** for filter/sort that should survive reload.
- **Use snapshots** for ephemeral UI state that should survive back/forward.

### Context Pattern for Shared State

```svelte
<!-- +layout.svelte -->
<script>
  import { setContext } from 'svelte';
  let { data } = $props();
  setContext('user', () => data.user);
</script>

<!-- any child -->
<script>
  import { getContext } from 'svelte';
  const user = getContext('user');
</script>
<p>{user().name}</p>
```

## Key Imports

| Module | Exports |
|--------|---------|
| `$app/navigation` | `goto`, `invalidate`, `invalidateAll`, `beforeNavigate`, `afterNavigate` |
| `$app/state` | `page` (reactive page info), `navigating`, `updated` |
| `$app/forms` | `enhance`, `applyAction`, `deserialize` |
| `$app/paths` | `base`, `assets`, `resolveRoute` |
| `$app/server` | `getRequestEvent`, `read` |
| `$env/static/private` | Compile-time private env vars |
| `$env/static/public` | Compile-time public env vars (`PUBLIC_*`) |
| `$env/dynamic/private` | Runtime private env vars |
| `$env/dynamic/public` | Runtime public env vars (`PUBLIC_*`) |
| `$lib` | Alias for `src/lib` |

## Performance

- Use server `load` functions to avoid browser-to-API waterfalls
- Stream non-essential data with promises
- Use `$derived` instead of `$effect` for computed values
- Use link preloading (default on `<body>`)
- Minimize third-party scripts
- Use `@sveltejs/enhanced-img` for image optimization
- Use dynamic `import()` for conditional code
- Deploy frontend near backend to minimize latency
