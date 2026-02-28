# Concurrency Patterns

Extended patterns for asyncio structured concurrency, task management, and timeout
handling in Python 3.14+. Complements the rules in SKILL.md with TaskGroup details,
cancellation semantics, and threading interop.

## TaskGroup (Structured Concurrency)

`asyncio.TaskGroup` (3.11+) is the preferred way to run concurrent tasks. It guarantees
that all tasks complete (or are cancelled) before the `async with` block exits.

```python
import asyncio

async def fetch_all(urls: list[str]) -> list[bytes]:
    results: list[bytes] = []

    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tg.create_task(fetch(url))

    # All tasks are done here — if any raised, an ExceptionGroup is raised
    return results
```

### Error Handling

When a task in the group raises an unhandled exception:

1. All remaining tasks in the group are **cancelled**
2. Tasks that haven't started yet are prevented from starting
3. The TaskGroup context manager waits for all tasks to finish
4. An `ExceptionGroup` containing all task exceptions is raised

```python
async def resilient_fetch(urls: list[str]) -> list[bytes | None]:
    results: dict[str, bytes | None] = {}

    try:
        async with asyncio.TaskGroup() as tg:
            for url in urls:
                tg.create_task(fetch_one(url, results))
    except* httpx.HTTPError as eg:
        # Handle HTTP errors — other exceptions re-raise
        for exc in eg.exceptions:
            logger.warning("fetch failed: %s", exc)
    except* TimeoutError:
        logger.warning("some fetches timed out")

    return list(results.values())
```

Use `except*` (3.11+) to selectively handle exception types within the group. Unhandled
exception types are re-raised in a new ExceptionGroup.

### TaskGroup vs gather

| | TaskGroup | gather |
|---|-----------|--------|
| Error behavior | Cancels all tasks on first error | Inconsistent — depends on `return_exceptions` |
| Structured | Yes — all tasks bound to the `async with` scope | No — tasks can outlive the call |
| Exception type | `ExceptionGroup` | Single exception or mixed results |
| Use in new code | Always | Never |

## Timeouts

### asyncio.timeout (3.11+)

```python
async def fetch_with_timeout(url: str) -> bytes:
    async with asyncio.timeout(10):
        return await fetch(url)
    # Raises TimeoutError if 10 seconds elapse
```

### asyncio.timeout_at (absolute deadline)

```python
async def fetch_batch(urls: list[str]) -> list[bytes]:
    deadline = asyncio.get_event_loop().time() + 30.0

    async with asyncio.timeout_at(deadline):
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch(url)) for url in urls]
        return [t.result() for t in tasks]
```

`timeout` and `timeout_at` raise `TimeoutError` (not `asyncio.TimeoutError`). They
cancel the current task's scope — nested timeouts work correctly because each creates
its own cancellation scope.

### wait_for (legacy)

```python
# Prefer asyncio.timeout over wait_for in new code
result = await asyncio.wait_for(coro, timeout=5.0)
```

`wait_for` cancels the awaitable and raises `TimeoutError`. It doesn't support structured
scoping — `asyncio.timeout` is cleaner.

## Task Cancellation

Cancellation in asyncio is cooperative — a cancelled task receives `CancelledError` at
the next `await` point.

```python
async def worker(queue: asyncio.Queue[str]) -> None:
    try:
        while True:
            item = await queue.get()
            await process(item)
    except asyncio.CancelledError:
        # Clean up resources
        logger.info("worker cancelled, cleaning up")
        raise  # Always re-raise CancelledError

task = asyncio.create_task(worker(queue))
# Later...
task.cancel()
await task  # Raises CancelledError
```

**Rules:**
- Always re-raise `CancelledError` after cleanup — swallowing it breaks structured
  concurrency and TaskGroup semantics
- Use `try/finally` for cleanup that must happen regardless of cancellation
- `asyncio.shield()` protects a coroutine from cancellation of its outer scope — use
  sparingly, as it breaks structured concurrency guarantees

### Shielding

```python
async def critical_save(data: bytes) -> None:
    # Even if the parent task is cancelled, this completes
    await asyncio.shield(database.save(data))
```

`shield` prevents the inner coroutine from being cancelled when the outer task is
cancelled. The outer task still gets `CancelledError`. Use only for operations that
must not be interrupted (database commits, payment processing).

## Running Sync Code in Threads

### asyncio.to_thread (3.9+)

```python
async def process_image(path: str) -> bytes:
    # Run CPU-bound PIL code in a thread to avoid blocking the event loop
    return await asyncio.to_thread(PIL.Image.open(path).tobytes)
```

`to_thread` runs a sync function in a thread pool and returns an awaitable. Use for:
- Blocking I/O that doesn't have an async API
- CPU-light processing that would block the event loop
- Legacy sync code that can't be easily rewritten

### loop.run_in_executor (lower-level)

```python
import concurrent.futures

async def compute_hash(data: bytes) -> str:
    loop = asyncio.get_running_loop()
    with concurrent.futures.ProcessPoolExecutor() as pool:
        return await loop.run_in_executor(pool, hashlib.sha256(data).hexdigest)
```

Use `ProcessPoolExecutor` for CPU-bound work that needs true parallelism.

## Scheduling From Other Threads

```python
# From a non-async thread, schedule work on the event loop
future = asyncio.run_coroutine_threadsafe(
    some_coroutine(),
    loop,
)
result = future.result(timeout=5.0)  # Blocks the calling thread
```

This is the only safe way to interact with a running event loop from another thread.
Direct calls to `loop.create_task()` from another thread are not thread-safe.

## Eager Task Factory (3.12+)

By default, `create_task()` schedules the coroutine for later execution. The eager task
factory starts executing the coroutine synchronously up to the first `await`:

```python
async def main() -> None:
    loop = asyncio.get_running_loop()
    loop.set_task_factory(asyncio.eager_task_factory)

    # Tasks now start executing immediately upon creation
    task = asyncio.create_task(fast_coroutine())
    # If fast_coroutine() completes before its first await,
    # the task is already done here
```

Benefits: reduces scheduling overhead for coroutines that complete quickly (cache hits,
already-available data). The task factory can be restored with
`loop.set_task_factory(None)`.

## Common Async Patterns

### Semaphore for Rate Limiting

```python
async def fetch_all(urls: list[str], max_concurrent: int = 10) -> list[bytes]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def bounded_fetch(url: str) -> bytes:
        async with semaphore:
            return await fetch(url)

    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(bounded_fetch(url)) for url in urls]
    return [t.result() for t in tasks]
```

### Event for Coordination

```python
async def producer(event: asyncio.Event, queue: asyncio.Queue[int]) -> None:
    for i in range(10):
        await queue.put(i)
    event.set()  # Signal completion

async def consumer(event: asyncio.Event, queue: asyncio.Queue[int]) -> None:
    while not event.is_set() or not queue.empty():
        try:
            item = await asyncio.wait_for(queue.get(), timeout=1.0)
            await process(item)
        except TimeoutError:
            continue
```
