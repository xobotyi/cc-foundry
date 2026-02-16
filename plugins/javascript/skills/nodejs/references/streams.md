# Node.js Streams

Stream types, pipeline, backpressure, and practical patterns.

## Why Streams

Streams process data incrementally in chunks rather than loading everything into memory.
Use streams when:
- Reading/writing large files
- Processing HTTP request/response bodies
- Transforming data pipelines (compress, encrypt, parse)
- Proxying data between sources

Don't use streams when data is already fully in memory — the overhead isn't worth it.

## Stream Types

| Type | Purpose | Example |
|------|---------|---------|
| `Readable` | Source of data | `fs.createReadStream()`, `http.IncomingMessage` |
| `Writable` | Destination for data | `fs.createWriteStream()`, `http.ServerResponse` |
| `Duplex` | Both readable and writable | `net.Socket`, `zlib` streams |
| `Transform` | Duplex that modifies data | `zlib.createGzip()`, custom parsers |

## pipeline() — The Only Way to Compose Streams

Always use `pipeline()` from `node:stream/promises`. Never use `.pipe()` directly.

```js
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';

await pipeline(
  createReadStream('input.txt'),
  createGzip(),
  createWriteStream('input.txt.gz')
);
```

### Why Not `.pipe()`

`.pipe()` does not:
- Propagate errors from source to destination
- Clean up streams on error (causes resource leaks)
- Return a promise

```js
// BAD — error in gzip silently drops, readStream leaks
readStream.pipe(gzip).pipe(writeStream);

// GOOD — errors propagate, all streams cleaned up
await pipeline(readStream, gzip, writeStream);
```

## Backpressure

Backpressure occurs when a writable stream can't consume data as fast as the readable
produces it. Ignoring backpressure causes unbounded memory growth.

### How It Works

1. `writable.write(chunk)` returns `false` when the internal buffer exceeds
   `highWaterMark`
2. The producer must stop writing and wait for the `'drain'` event
3. `pipeline()` handles this automatically

### Manual Backpressure Handling

When writing to a stream without `pipeline()`:

```js
async function writeData(writable, chunks) {
  for (const chunk of chunks) {
    const canContinue = writable.write(chunk);
    if (!canContinue) {
      await new Promise((resolve) => writable.once('drain', resolve));
    }
  }
  writable.end();
}
```

### `highWaterMark`

Buffer threshold in bytes (or objects in object mode). Defaults:
- 16 KiB for byte streams
- 16 objects for object mode streams

It's a hint, not a hard limit. Streams can buffer beyond it.

## Creating Custom Streams

### Readable

```js
import { Readable } from 'node:stream';

// From async generator (preferred)
async function* generateData() {
  for (let i = 0; i < 100; i++) {
    yield `line ${i}\n`;
  }
}
const readable = Readable.from(generateData());

// Class-based (when you need more control)
class MyReadable extends Readable {
  #index = 0;
  _read(size) {
    if (this.#index >= 100) {
      this.push(null); // Signal end
      return;
    }
    this.push(`line ${this.#index++}\n`);
  }
}
```

### Writable

```js
import { Writable } from 'node:stream';

class MyWritable extends Writable {
  _write(chunk, encoding, callback) {
    // Process chunk, then signal completion
    process.stdout.write(chunk);
    callback(); // or callback(err) on failure
  }

  _final(callback) {
    // Called after all data written, before 'finish' event
    callback();
  }
}
```

### Transform

```js
import { Transform } from 'node:stream';

class UpperCase extends Transform {
  _transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  }

  _flush(callback) {
    // Called at the end — emit any remaining data
    callback();
  }
}
```

## Object Mode

Streams default to byte/string chunks. Object mode allows arbitrary JS objects:

```js
const objectStream = new Transform({
  objectMode: true,
  transform(obj, encoding, callback) {
    callback(null, { ...obj, processed: true });
  },
});
```

Object mode streams count objects (not bytes) against `highWaterMark`.

## Async Iteration

Readable streams are async iterables:

```js
import { createReadStream } from 'node:fs';

const stream = createReadStream('data.txt', { encoding: 'utf8' });
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

This is the simplest way to consume a readable stream. Backpressure is handled
automatically.

## Common Patterns

### File Copy with Progress

```js
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Transform } from 'node:stream';

const { size } = await stat('source.bin');
let transferred = 0;

const progress = new Transform({
  transform(chunk, enc, cb) {
    transferred += chunk.length;
    process.stderr.write(`\r${((transferred / size) * 100).toFixed(1)}%`);
    cb(null, chunk);
  },
});

await pipeline(
  createReadStream('source.bin'),
  progress,
  createWriteStream('dest.bin')
);
```

### HTTP Response Streaming

```js
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/octet-stream');
  await pipeline(createReadStream('large-file.zip'), res);
}
```

### Line-by-Line Processing

```js
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const rl = createInterface({
  input: createReadStream('log.txt'),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  // Process line
}
```

## Error Handling in Streams

1. **Always handle `'error'` events** on streams not managed by `pipeline()`.
   An unhandled `'error'` event on a stream crashes the process.

2. **`pipeline()` handles errors automatically** — cleans up all streams and rejects
   the promise.

3. **Destroy streams explicitly** when you need to abort:
   ```js
   stream.destroy(new Error('aborted'));
   ```

4. **Never ignore the `'error'` event** on EventEmitters:
   ```js
   // BAD — crashes process on error
   const stream = createReadStream('maybe-missing.txt');

   // GOOD
   const stream = createReadStream('maybe-missing.txt');
   stream.on('error', (err) => {
     console.error('Stream error:', err.message);
   });
   ```
