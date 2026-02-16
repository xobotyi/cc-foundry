# JavaScript Async Patterns

Promises, async/await, error handling, and concurrency utilities.

## async/await First

Use `async`/`await` as the default for asynchronous code. It reads top-to-bottom
like synchronous code and makes error handling straightforward.

```js
// Good — clear sequential flow
async function fetchUserPosts(userId) {
  const user = await getUser(userId);
  const posts = await getPosts(user.id);
  return posts;
}

// Avoid — .then() chains for sequential operations
function fetchUserPosts(userId) {
  return getUser(userId)
    .then((user) => getPosts(user.id));
}
```

### Key Rules

1. **Always `await` promises.** A missing `await` creates a floating promise —
   the operation runs but its result and errors are silently lost.
2. **Mark the function `async`** if it uses `await`.
3. **Return values, not `return await`.** In a non-try/catch context, `return
   promise` and `return await promise` behave identically. Use `return await`
   only inside `try` blocks where you need to catch the awaited error.

```js
// Unnecessary await
async function getUser(id) {
  return await fetchUser(id); // just: return fetchUser(id);
}

// Necessary await — catch needs it
async function getUser(id) {
  try {
    return await fetchUser(id);
  } catch (err) {
    return null;
  }
}
```

## Error Handling

### try/catch with async/await

Wrap `await` calls in `try`/`catch` when you need to handle errors at that
level. Don't wrap everything — let errors propagate to a top-level handler
when possible.

```js
// Good — granular error handling where needed
async function loadConfig() {
  try {
    const data = await readFile("config.json", "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") return DEFAULT_CONFIG;
    throw err; // re-throw unexpected errors
  }
}
```

### Never Swallow Errors

Every `catch` must do something meaningful: rethrow, return a fallback, or
report. An empty `catch` hides bugs.

```js
// Bad — error silently disappears
try { await riskyOperation(); } catch (err) {}

// Bad — console.log is not handling
try { await riskyOperation(); } catch (err) { console.log(err); }

// Good — handle or propagate
try {
  await riskyOperation();
} catch (err) {
  reportError(err);
  throw err;
}
```

### Throw Error Objects, Not Strings

Always throw `Error` instances (or subclasses). String throws lose stack traces:

```js
// Bad — no stack trace
throw "Something went wrong";
throw { message: "fail" };

// Good
throw new Error("Something went wrong");
throw new TypeError(`Expected string, got ${typeof value}`);
```

### Custom Error Classes

For errors callers need to distinguish, use custom error classes:

```js
class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} ${id} not found`);
    this.name = "NotFoundError";
    this.resource = resource;
    this.id = id;
  }
}

// Usage
throw new NotFoundError("User", userId);

// Catching
try { ... } catch (err) {
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  throw err;
}
```

### Unhandled Rejections

Always attach `.catch()` to promise chains that aren't awaited. Unhandled
rejections crash Node.js and produce console errors in browsers:

```js
// Bad — floating promise, errors lost
fetchData();

// Good — fire-and-forget with error handling
fetchData().catch(reportError);

// Good — top-level await (ESM)
await fetchData();
```

## Concurrency

### Promise.all — Parallel Independent Work

When operations are independent, run them in parallel:

```js
// Bad — sequential when it doesn't need to be
const users = await getUsers();
const posts = await getPosts();
const comments = await getComments();

// Good — parallel
const [users, posts, comments] = await Promise.all([
  getUsers(),
  getPosts(),
  getComments(),
]);
```

`Promise.all` rejects as soon as any promise rejects. The other promises
continue running but their results are not available.

### Promise.allSettled — When All Results Matter

Use when you need results from all operations regardless of individual failures:

```js
const results = await Promise.allSettled([
  fetchFromPrimary(),
  fetchFromFallback(),
]);

const successes = results
  .filter((r) => r.status === "fulfilled")
  .map((r) => r.value);
```

### Promise.race and Promise.any

- **`Promise.race`**: resolves/rejects with the first settled promise. Use for
  timeouts.
- **`Promise.any`**: resolves with the first fulfilled promise. Rejects only
  when ALL promises reject. Use for fallbacks.

```js
// Timeout pattern
const result = await Promise.race([
  fetchData(),
  timeout(5000),
]);

// Fallback pattern
const data = await Promise.any([
  fetchFromCDN(),
  fetchFromOrigin(),
]);
```

### Avoid Sequential Awaits in Loops

```js
// Bad — each iteration waits for the previous one
for (const url of urls) {
  const data = await fetch(url); // sequential!
}

// Good — parallel when order doesn't matter
const results = await Promise.all(urls.map((url) => fetch(url)));

// Good — controlled concurrency for large arrays
// (use a library like p-map for concurrency limiting)
```

## Promise Construction

### Avoid the Constructor When Unnecessary

Most async code should compose existing promises with `async`/`await`. Only use
`new Promise()` to wrap callback-based APIs:

```js
// Unnecessary — already have a promise
const result = new Promise((resolve) => {
  resolve(existingPromise); // just return existingPromise directly
});

// Legitimate — wrapping a callback API
function readFileAsync(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
```

### Cancellation with AbortController

Use `AbortController` for cancellable async operations:

```js
const controller = new AbortController();
const { signal } = controller;

const response = await fetch(url, { signal });

// Cancel from elsewhere
controller.abort();
```

## for-await-of

Use `for await...of` with async iterables:

```js
async function processStream(stream) {
  for await (const chunk of stream) {
    process(chunk);
  }
}
```
