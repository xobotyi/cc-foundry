# Streams

Two stream families ship in the runtime: `node:stream` (Node's own, callback and event based) and `node:stream/web`
(WHATWG, also on the global object). Both are Stability 2.

## Composition beyond `pipeline`

- **`stream.compose(...streams)`** (Stable from 26.2.0) builds a `Duplex` out of a chain for reuse, where `pipeline`
  runs one chain to completion.
- **`stream.finished`** reports that a stream is done, errored, or prematurely closed, including for streams that
  `pipeline` does not own.
- **`stream.addAbortSignal(signal, stream)`** wires an `AbortSignal` to a stream that has no `signal` option. `pipeline`
  accepts `{ signal }` directly.
- **`stream.duplexPair()`** gives two cross-connected `Duplex` streams for testing a protocol without a socket.

## The defaults behind `highWaterMark`

- **The byte-stream default is `65536` (64 KiB) off Windows and `16384` (16 KiB) on Windows.** Measured 65536 on
  26.2.0/macOS.
- **Object mode defaults to `16` objects**, so an object stream carrying megabyte payloads buffers sixteen megabytes
  before it applies backpressure.
- **Read the current value with `stream.getDefaultHighWaterMark(objectMode)`.** Changing the process-wide default with
  `setDefaultHighWaterMark` affects every stream created afterwards, including the ones inside dependencies.
- **Leaving a `for await` loop with `break`, `return`, or `throw` destroys the stream.** That is correct for an early
  exit and wrong where the stream was meant to be read again.

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

## Creating streams

- **An async generator plus `Readable.from()`** is the shortest correct custom readable. Reach for a class with
  `_read()` only when the source needs pull-based control.
- **`Transform`** implements `_transform(chunk, encoding, callback)`, plus `_flush(callback)` for trailing output.
- **`Writable`** implements `_write(chunk, encoding, callback)`, plus `_final(callback)` for teardown before `'finish'`.
