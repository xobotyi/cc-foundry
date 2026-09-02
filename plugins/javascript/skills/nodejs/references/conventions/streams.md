# Streams

Two stream families ship in the runtime: `node:stream` (Node's own, callback and event based) and `node:stream/web`
(WHATWG, also on the global object). Both are Stability 2.

## Composition

- **`pipeline` from `node:stream/promises`** is the default composition tool. It propagates errors, destroys every
  stream in the chain on failure, and awaits completion. A `.pipe()` chain does none of that: an error on any stream
  leaves the rest of the chain undestroyed and its file descriptors open.
- **`stream.compose(...streams)`** (Stable from 26.2.0) builds a `Duplex` out of a chain for reuse, where `pipeline`
  runs one to completion.
- **`stream.finished`** reports that a stream is done, errored, or prematurely closed, including for streams that
  `pipeline` does not own.
- **`stream.addAbortSignal(signal, stream)`** wires an `AbortSignal` to a stream that has no `signal` option. `pipeline`
  accepts `{ signal }` directly.
- **`stream.duplexPair()`** gives two cross-connected `Duplex` streams for testing a protocol without a socket.

## Backpressure

- **`writable.write()` returning `false` means the internal buffer is over `highWaterMark`.** Stop writing and wait for
  `'drain'`. Ignoring the return value is how a fast producer turns into unbounded memory growth — nothing throws, the
  buffer just grows.
- **`highWaterMark` is a threshold, not a cap.** A `write()` larger than it still buffers in full.
- **The byte-stream default is `65536` (64 KiB) off Windows and `16384` (16 KiB) on Windows.** Object mode defaults to
  `16` objects. Read the value with `stream.getDefaultHighWaterMark(objectMode)`; changing the process-wide default with
  `setDefaultHighWaterMark` affects every stream created afterwards, including the ones inside dependencies.
- **Object mode counts objects, not bytes**, so `highWaterMark: 16` on an object stream carrying megabyte payloads
  buffers sixteen megabytes.
- **`for await (const chunk of readable)`** applies backpressure automatically and is the simplest correct consumer.
  Leaving the loop with `break`, `return`, or `throw` destroys the stream — which is correct for early exit and wrong if
  the stream was meant to be read again.

## Consuming a whole stream

`node:stream/consumers` (`arrayBuffer`, `blob`, `buffer`, `json`, `text`) accepts a `Readable`, a `ReadableStream`, or
an async iterator and returns a promise. It replaces the manual chunk-collecting loop, and it makes the buffering
explicit: a whole-stream consumer defeats the purpose of a stream when the input is unbounded.

## Web stream interop

`Readable.toWeb`/`fromWeb`, `Writable.toWeb`/`fromWeb`, and `Duplex.toWeb`/`fromWeb` cross the boundary. Marked stable
in 22.17.0 and 24.0.0.

- **`Readable.toWeb(readable, { type: 'bytes' })`** (24.14.0 and 25.4.0) produces a byte stream that supports BYOB
  reads. Without it the result is a default stream, and a consumer expecting `ReadableStreamBYOBReader` fails.
- **`Duplex.toWeb` takes `readableType`** from 25.7.0; the earlier `type` option is deprecated (DEP0201).
- **Web streams do not carry Node's error semantics.** A `ReadableStream` cancellation is not an `'error'` event, and
  `pipeline` does not manage a web stream's lifetime.

## Iterator helpers are experimental

`readable.map`, `filter`, `forEach`, `toArray`, `some`, `find`, `every`, `flatMap`, `drop`, `take`, and `reduce` are all
Stability 1 - Experimental on Node 26. They look like array methods and read like committed API; they are not. Use them
in application code where a breaking change is a local fix, and keep them out of a published library's surface.

## Creating streams

- **An async generator plus `Readable.from()`** is the shortest correct custom readable. Reach for a class with
  `_read()` only when the source needs pull-based control.
- **`Transform`** implements `_transform(chunk, encoding, callback)`, plus `_flush(callback)` for trailing output.
- **`Writable`** implements `_write(chunk, encoding, callback)`, plus `_final(callback)` for teardown before `'finish'`.
- **Every stream must be destroyed on the error path.** `stream.destroy(err)` emits `'error'` and releases resources;
  leaving a stream undestroyed leaks the descriptor or socket behind it.
- **An unhandled `'error'` event on a stream crashes the process.** This is the `EventEmitter` rule, and it applies to
  every stream that is not inside a `pipeline`.

## When not to use a stream

Data already in memory gains nothing from a stream and pays for the machinery. Streams earn their cost when the input is
unbounded, larger than the memory budget, or arriving over time — files, HTTP bodies, protocol framing, proxying.
