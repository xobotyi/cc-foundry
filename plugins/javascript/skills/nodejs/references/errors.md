# Node.js Error Handling

Error classes, `error.cause`, process-level error events, and error handling patterns.

## Error Categories

| Category | Description | Response |
|----------|-------------|----------|
| **Operational** | Bad input, network timeout, file not found | Handle gracefully, respond to caller |
| **Programmer** | Null deref, assertion failure, type error | Crash and restart — state is unreliable |

This distinction drives your error handling strategy. Operational errors are handled
in-place. Programmer errors mean corrupted state — the safest response is to exit
and let the process manager restart.

## Custom Error Classes

Always extend `Error`. Set a `code` property for programmatic matching (not message
strings, which change).

```js
class AppError extends Error {
  constructor(message, code, options) {
    super(message, options); // options.cause for chaining
    this.name = 'AppError';
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(resource, options) {
    super(`${resource} not found`, 'ERR_NOT_FOUND', options);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

class ValidationError extends AppError {
  constructor(message, fields, options) {
    super(message, 'ERR_VALIDATION', options);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}
```

### Usage

```js
// Throwing with cause chain
try {
  const data = await fetchFromDB(id);
} catch (err) {
  throw new NotFoundError('user', { cause: err });
}

// Matching by code (stable across versions)
catch (err) {
  if (err.code === 'ERR_NOT_FOUND') {
    res.status(404).json({ error: err.message });
  } else {
    throw err; // Re-throw unknown errors
  }
}

// Matching by class
catch (err) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, fields: err.fields });
  } else {
    throw err;
  }
}
```

## Error Cause Chaining

Use `error.cause` (ES2022) to preserve the original error while adding context:

```js
async function getUser(id) {
  try {
    return await db.query('SELECT * FROM users WHERE id = $1', [id]);
  } catch (err) {
    throw new Error(`failed to fetch user ${id}`, { cause: err });
  }
}
```

The full chain is visible via `util.inspect()` and structured loggers. Node.js error
codes use `error.code` (not `error.cause`) for identification.

## Async Error Patterns

### Always `return await`

```js
// BAD — intermediate function disappears from stack trace
async function getUser(id) {
  try {
    return fetchUser(id); // Missing await!
  } catch (err) {
    // This catch NEVER fires for fetchUser rejections
    throw new AppError('user fetch failed', 'ERR_FETCH', { cause: err });
  }
}

// GOOD — full stack trace, catch block works
async function getUser(id) {
  try {
    return await fetchUser(id);
  } catch (err) {
    throw new AppError('user fetch failed', 'ERR_FETCH', { cause: err });
  }
}
```

### Centralized Error Handler

Don't scatter error handling across every middleware. Use a centralized error handler:

```js
// Express-style centralized error handler
function errorHandler(err, req, res, next) {
  logger.error({ err, reqId: req.id }, err.message);

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  // Unknown error — don't leak internals
  res.status(500).json({ error: 'Internal server error' });
}
```

## Process-Level Error Events

### `unhandledRejection`

Fires when a Promise rejects and no handler is attached. **Always register this.**

```js
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  // In production: log, clean up, exit
  process.exit(1);
});
```

Since Node.js 15+, unhandled rejections throw by default (`--unhandled-rejections=throw`).
The process crashes if you don't handle them.

### `uncaughtException`

Fires when a synchronous throw escapes all try/catch blocks. **Log and exit.**

```js
process.on('uncaughtException', (err, origin) => {
  logger.fatal({ err, origin }, 'Uncaught exception — shutting down');
  // Do NOT continue running — state is unreliable
  process.exit(1);
});
```

**Never** try to resume after `uncaughtException`. The process state is unknown.

### `warning`

Non-fatal process warnings (deprecations, memory leaks, experimental features):

```js
process.on('warning', (warning) => {
  logger.warn({ warning }, warning.message);
});
```

## EventEmitter Error Events

All EventEmitters (streams, servers, sockets) emit `'error'` events. An unhandled
`'error'` event crashes the process.

```js
// BAD — crashes if connection fails
const connection = net.connect('localhost:5432');

// GOOD
const connection = net.connect('localhost:5432');
connection.on('error', (err) => {
  logger.error({ err }, 'Connection failed');
});
```

### Streams

Streams are EventEmitters. Always handle their `'error'` event unless using
`pipeline()` (which handles it automatically):

```js
// pipeline handles errors — no manual handler needed
await pipeline(readable, transform, writable);

// Manual pipe — MUST handle errors on each stream
readable.on('error', handleError);
writable.on('error', handleError);
readable.pipe(writable);
```

## Graceful Shutdown

When a fatal error occurs, clean up before exiting:

```js
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  // 1. Stop accepting new connections
  server.close();

  // 2. Wait for in-flight requests (with timeout)
  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30_000);

  try {
    // 3. Close database connections, flush logs, etc.
    await db.end();
    await logger.flush();
    clearTimeout(timeout);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Anti-Patterns

| Don't | Do |
|-------|------|
| `throw "string"` | `throw new Error("message")` |
| Catch and ignore: `catch (e) {}` | Handle, log, or re-throw with cause |
| `catch (e) { log(e); throw e }` | Handle once: log OR throw, not both |
| Resume after `uncaughtException` | Log, cleanup, exit |
| Match errors by message string | Match by `error.code` or `instanceof` |
| Nest try/catch deeply | Centralized error handler |
| Swallow errors in event handlers | Always re-emit or log |
| `return promise` in try block | `return await promise` |
