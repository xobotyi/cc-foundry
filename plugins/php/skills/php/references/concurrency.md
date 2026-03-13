# PHP Concurrency

PHP is fundamentally single-threaded. Concurrency primitives provide cooperative multitasking within a single request,
not parallelism.

## Fibers (8.1+)

Full-stack, interruptible functions. Unlike generators, fibers can suspend from anywhere in the call stack — not just at
`yield` points.

### Core API

```php
$fiber = new Fiber(function (): void {
    $value = Fiber::suspend('paused');
    echo "Resumed with: {$value}\n";
});

$result = $fiber->start();         // "paused"
$fiber->resume('continue');        // "Resumed with: continue"
```

**Fiber class methods:**

- `new Fiber(callable $callback)` — create fiber
- `$fiber->start(mixed ...$args): mixed` — start execution, returns first suspend value
- `$fiber->resume(mixed $value = null): mixed` — resume suspended fiber
- `$fiber->throw(Throwable $exception): mixed` — throw into suspended fiber
- `Fiber::suspend(mixed $value = null): mixed` — suspend current fiber (static)
- `$fiber->isStarted()`, `$fiber->isSuspended()`, `$fiber->isRunning()`, `$fiber->isTerminated()` — state checks
- `$fiber->getReturn(): mixed` — get return value after termination

**Exceptions:**

- `FiberError` — invalid operation (e.g., resuming a running fiber)
- Fibers can be suspended inside `array_map()`, `foreach` on iterators, and other callbacks (as of 8.4, also during
  object destructors)

### When to Use Fibers

- **I/O-bound concurrency** — suspend while waiting for network, filesystem, database
- **Building async libraries** — event loops (ReactPHP, Revolt, AMPHP)
- **Batch processing** — interleave multiple long-running operations

### When NOT to Use Fibers

- **CPU-bound work** — no parallelism, only one fiber runs at a time
- **Simple sequential code** — fibers add complexity with no benefit
- **Direct application code** — prefer async libraries built on fibers over raw Fiber API

### Practical Pattern: Event Loop

```php
$scheduler = [];

function async(Fiber $fiber): void
{
    global $scheduler;
    $scheduler[] = $fiber;
}

function run(): void
{
    global $scheduler;
    while ($scheduler) {
        $fiber = array_shift($scheduler);
        if (!$fiber->isStarted()) {
            $fiber->start();
        } elseif ($fiber->isSuspended()) {
            $fiber->resume();
        }
        if (!$fiber->isTerminated()) {
            $scheduler[] = $fiber;
        }
    }
}
```

## Generators as Coroutines

Generators provide lightweight cooperative multitasking via `yield`, but are stack-less — suspension only at `yield`
points, not in nested calls.

```php
function fibonacci(): Generator
{
    [$a, $b] = [0, 1];
    while (true) {
        yield $a;
        [$a, $b] = [$b, $a + $b];
    }
}

// Bidirectional communication
function accumulator(): Generator
{
    $total = 0;
    while (true) {
        $value = yield $total;
        $total += $value;
    }
}

$acc = accumulator();
$acc->current();        // 0
$acc->send(10);         // 10
$acc->send(20);         // 30
```

**Generator methods:**

- `current()`, `key()`, `next()`, `rewind()` — Iterator interface
- `send(mixed $value)` — send value into generator, resume execution
- `throw(Throwable)` — throw exception at current yield
- `getReturn()` — get return value after generator completes
- `yield from $iterable` — delegate to sub-generator/iterable

### Fibers vs Generators

| Aspect             | Generators                        | Fibers                     |
| ------------------ | --------------------------------- | -------------------------- |
| Suspension point   | Only at `yield`                   | Anywhere in call stack     |
| Return type change | Must return `Generator`           | No signature change        |
| Bidirectional data | Via `send()`/`yield`              | Via `suspend()`/`resume()` |
| Use case           | Lazy sequences, simple coroutines | Async I/O, event loops     |
| Overhead           | Very low                          | Low (own call stack)       |

## Async Libraries

For real async PHP, use libraries built on Fibers:

- **Revolt** — event loop standard for PHP
- **AMPHP** — async framework using Revolt
- **ReactPHP** — event-driven non-blocking I/O

These libraries handle the scheduling complexity so application code uses `async`/`await` style patterns without
managing fibers directly.
