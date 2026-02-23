# Node.js Security

Input validation, dependency supply chain, DoS prevention, and secure defaults.

## Input Validation

### Validate Everything from Outside

Never trust user input — request bodies, query params, headers, file uploads,
environment variables from untrusted sources.

```js
// Use a schema validation library (zod, ajv, typebox)
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

function createUser(input) {
  const user = UserSchema.parse(input); // Throws on invalid input
  return db.insert(user);
}
```

### Request Size Limits

Always limit request body size. Unbounded payloads exhaust memory:

```js
// Express
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Fastify (built-in)
const app = fastify({ bodyLimit: 1_048_576 }); // 1 MB
```

Set different limits per content type. JSON parsing is more expensive than multipart.

### JSON Parsing DoS

`JSON.parse()` is O(n) but blocks the event loop for large inputs. A 50MB JSON string
takes ~2 seconds to parse.

Mitigations:
- Limit payload size at the HTTP layer (before parsing)
- For very large JSON, use streaming parsers (`stream-json`, `@streamparser/json`)
- Validate `Content-Length` header before reading the body

## Regex Denial of Service (ReDoS)

Vulnerable regex patterns can take exponential time on crafted input, blocking the
event loop.

### Dangerous Patterns

- Nested quantifiers: `(a+)*`, `(a+)+`, `(a*)*`
- Overlapping alternations: `(a|a)*`, `(a|ab)*`
- Backreferences with repetition: `(a.*)\1`

### Mitigations

- **Use `indexOf`/`includes`** for simple string matching — always O(n)
- **Validate regex** with tools like `safe-regex2` or `recheck`
- **Use RE2** via `re2` npm package for untrusted patterns (linear time guarantee)
- **Bound input length** before regex matching

```js
// BAD — exponential on crafted input
const VULNERABLE = /(\/.+)+$/;
filePath.match(VULNERABLE);

// GOOD — bounded, no nested quantifiers
const SAFE = /^(\/[^/]+)+$/;
if (filePath.length < 1000) filePath.match(SAFE);
```

## Dependency Supply Chain

### Threats

| Attack | Description |
|--------|-------------|
| Typosquatting | Package with similar name to popular one (`lodsah` vs `lodash`) |
| Compromised maintainer | Attacker gains publish access to legitimate package |
| Lockfile poisoning | Modified lockfile points to malicious version |
| Dependency confusion | Private package name claimed on public registry |
| Malicious postinstall | Package runs arbitrary code on `npm install` |

### Mitigations

- **Use `npm ci`** in CI and production — enforces lockfile exactly, fails on mismatch
- **Lock dependencies** — commit `package-lock.json` or `yarn.lock`
- **Pin exact versions** for critical dependencies (no `^` or `~`)
- **Audit regularly** — `npm audit` in CI pipeline
- **Disable postinstall scripts** for untrusted packages:
  ```bash
  npm install --ignore-scripts
  ```
- **Review before install** — check package size, maintainers, dependencies
- **Use `npm publish --dry-run`** to verify what gets published
- **Configure `.npmignore`** or `"files"` in `package.json` to prevent secret leaks
- **Enable 2FA** on npm accounts

## HTTP Security

### Server Timeouts

Always configure timeouts on HTTP servers. Defaults are too permissive:

```js
import { createServer } from 'node:http';

const server = createServer(handler);
server.headersTimeout = 60_000;      // Max time to receive headers
server.requestTimeout = 60_000;      // Max time for entire request
server.timeout = 120_000;            // Socket inactivity timeout
server.keepAliveTimeout = 5_000;     // Keep-alive socket timeout
server.maxRequestsPerSocket = 100;   // Limit requests per connection
```

### Security Headers

Use `helmet` (Express) or equivalent for security headers:

- `Strict-Transport-Security` — enforce HTTPS
- `X-Content-Type-Options: nosniff` — prevent MIME sniffing
- `X-Frame-Options: DENY` — prevent clickjacking
- `Content-Security-Policy` — control resource loading

### Delegate TLS/gzip to Reverse Proxy

Node.js should not terminate TLS or compress responses in production. Let nginx,
HAProxy, or a cloud load balancer handle:

- **TLS termination** — CPU-intensive, optimized in native code
- **gzip/brotli compression** — blocks event loop for large responses
- **Rate limiting** — better at infrastructure layer
- **Request filtering** — WAF rules

## Secrets Management

- **Never hardcode secrets** in source code
- **Use environment variables** loaded from secure vaults (not `.env` in production)
- **Never commit `.env` files** — add to `.gitignore`
- **Use `crypto.timingSafeEqual()`** for secret comparison (prevents timing attacks):

  ```js
  import { timingSafeEqual } from 'node:crypto';

  function verifyToken(provided, expected) {
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  }
  ```

- **Use `crypto.scrypt()` or `crypto.pbkdf2()`** for password hashing (async versions)

## Child Processes

### Avoid Shell Injection

```js
import { execFile, spawn } from 'node:child_process';

// BAD — shell injection via user input
exec(`ls ${userInput}`);

// GOOD — arguments passed as array, no shell interpretation
execFile('ls', [userInput]);
spawn('ls', [userInput]);
```

Never use `exec()` with user-controlled strings. Use `execFile()` or `spawn()` with
argument arrays.

### Avoid `eval` and Dynamic `require`

```js
// BAD — arbitrary code execution
eval(userInput);
new Function(userInput);
require(userInput);   // Module loading as code execution

// These are security vulnerabilities, not patterns
```

## Process Hardening

- **Run as non-root** — use a dedicated user in Docker:
  ```dockerfile
  RUN addgroup --system app && adduser --system --ingroup app app
  USER app
  ```

- **Set `NODE_ENV=production`** — disables debug output, enables optimizations

- **Use `--secure-heap`** for sensitive crypto operations (Linux only):
  ```bash
  node --secure-heap=4096 server.js
  ```

- **Limit V8 heap** to prevent memory exhaustion:
  ```bash
  node --max-old-space-size=512 server.js
  ```

## Security Checklist

For every HTTP endpoint:
- [ ] Input validated against schema (reject unknown fields)
- [ ] Request body size limited
- [ ] No user input in `exec()`, `eval()`, or dynamic `require()`
- [ ] Error responses don't leak stack traces or internals
- [ ] Authentication/authorization checked before processing

For every deployment:
- [ ] Dependencies audited (`npm audit`)
- [ ] Lockfile committed and enforced (`npm ci`)
- [ ] Secrets in environment variables, not code
- [ ] Running as non-root
- [ ] TLS terminated at reverse proxy
- [ ] Server timeouts configured
- [ ] `NODE_ENV=production`
