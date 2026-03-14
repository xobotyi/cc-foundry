# Dockerfile Patterns

## Multi-stage Build Patterns

### Standard two-stage (build + runtime)

```dockerfile
FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /app /app
USER nonroot:nonroot
ENTRYPOINT ["/app"]
```

### Three-stage with testing

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS test
COPY . .
RUN npm test

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

### Shared base stage (DRY across images)

```dockerfile
FROM python:3.13-slim AS base
RUN groupadd -r app && useradd -r -g app -d /app app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS api
COPY api/ ./api/
USER app
CMD ["python", "-m", "api"]

FROM base AS worker
COPY worker/ ./worker/
USER app
CMD ["python", "-m", "worker"]
```

## Layer Optimization

### Package installation (Debian/Ubuntu)

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
    && rm -rf /var/lib/apt/lists/*
```

- Always combine `apt-get update` with `apt-get install` in the same `RUN`
- Use `--no-install-recommends` to skip suggested packages
- Clean apt cache in the same layer: `rm -rf /var/lib/apt/lists/*`
- Sort packages alphabetically for readable diffs

### Package installation (Alpine)

```dockerfile
RUN apk add --no-cache \
    curl \
    openssl \
    tini
```

Alpine uses `--no-cache` instead of manual cache cleanup.

### Dependency caching pattern

Copy dependency manifests before source code so dependency layers cache independently of code changes:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

Order instructions from least-frequently-changed to most-frequently-changed.

## Base Image Selection

- **Go, Rust (static binaries)** — `scratch` or `distroless/static` (~2MB): No shell, no package manager
- **General minimal** — `alpine:3.21` (~6MB): musl libc — test for glibc compatibility
- **Debian-based apps** — `debian:bookworm-slim` (~75MB): glibc, smaller than full debian
- **Python** — `python:3.13-slim` (~150MB): Debian slim variant
- **Node.js** — `node:22-alpine` (~55MB): Alpine variant saves ~900MB over full
- **Distroless (Google)** — `gcr.io/distroless/*` (varies): No shell — hardened for production

### Image pinning

```dockerfile
# Pin to digest for reproducible builds
FROM python:3.13-slim@sha256:abc123...

# Pin to minor version for security patches
FROM node:22-alpine
```

- Pin to digest (`@sha256:...`) for supply chain integrity in CI
- Pin to minor version tag (`3.13-slim`) for development convenience
- Never use `:latest` in production Dockerfiles

## .dockerignore

```
.git
.github
.env
.env.*
node_modules
__pycache__
*.pyc
dist
build
*.md
!README.md
docker-compose*.yml
Dockerfile*
.dockerignore
```

Always create a `.dockerignore` to exclude version control, local dependencies, build artifacts, and sensitive files
from the build context.

## ENTRYPOINT vs CMD

- **`ENTRYPOINT ["app"]` + `CMD ["--default-flag"]`** — App with overridable defaults
- **`CMD ["app", "--flag"]`** — Simple service, fully overridable
- **`ENTRYPOINT ["entrypoint.sh"]` + `CMD ["app"]`** — Init script pattern (Postgres-style)

- Use exec form `["binary", "arg"]` — not shell form `binary arg`
- Shell form wraps in `/bin/sh -c`, preventing signal forwarding to PID 1
- Entrypoint scripts must use `exec "$@"` to replace shell with the app process

## USER and Non-root

```dockerfile
RUN groupadd -r app --gid=1000 \
    && useradd -r -g app --uid=1000 -d /app app
USER app
```

- Use explicit UID/GID for deterministic file ownership across rebuilds
- Place `USER` after all `RUN` commands that need root (package installs)
- Never install or use `sudo` — use `gosu` if root-then-drop is needed
- For Alpine: `addgroup -S -g 1000 app && adduser -S -G app -u 1000 app`

## WORKDIR

Always use absolute paths. Use `WORKDIR` instead of `RUN cd ... && ...`.

```dockerfile
WORKDIR /app
```

## BuildKit Cache Mounts

Cache package manager downloads across builds without bloating layers:

```dockerfile
# Python — cache pip downloads
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Node.js — cache npm packages
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Go — cache module downloads and build cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /app ./cmd/server

# Apt — cache package downloads
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt/lists \
    apt-get update && apt-get install -y --no-install-recommends curl
```

- Cache mounts persist across builds but are never included in image layers
- Combine with multi-stage builds — cache in the build stage, copy only artifacts to runtime stage
- Requires BuildKit (`DOCKER_BUILDKIT=1` or Docker 23.0+ where it's default)

## Multi-platform Builds

Build images for multiple CPU architectures with `docker buildx`:

```bash
# Create a builder with multi-platform support
docker buildx create --name multiarch --use

# Build and push for multiple platforms
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t myimage:latest \
    --push .
```

- Use `--platform` in `FROM` to handle architecture-specific base images:
  ```dockerfile
  FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS build
  ARG TARGETOS TARGETARCH
  RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o /app
  ```
- `$BUILDPLATFORM` — the platform running the build (for cross-compilation)
- `$TARGETPLATFORM`, `$TARGETOS`, `$TARGETARCH` — the target platform
- Essential for ARM/x86 portability (Apple Silicon, Raspberry Pi, cloud ARM instances)

## Signal Handling and Graceful Shutdown

### The PID 1 problem

In containers, the entrypoint process becomes PID 1. PID 1 has special responsibilities in Linux:

- Must forward signals to child processes
- Must reap zombie (orphaned) processes
- Default signal handlers don't work for PID 1 — SIGTERM is ignored unless the process explicitly installs a handler

Most applications are not designed to be PID 1 and will not handle these responsibilities correctly.

### Shell form breaks signal forwarding

```dockerfile
# BAD — shell form: /bin/sh -c wraps the command
CMD npm start
# Shell becomes PID 1, npm becomes PID 2
# SIGTERM hits shell, shell ignores it, app never gets signal
# docker stop waits for timeout, then SIGKILL

# GOOD — exec form: app is PID 1 directly
CMD ["node", "index.js"]
```

### Entrypoint scripts must use exec

```bash
#!/bin/sh
# Setup work...
export DB_HOST="${DB_HOST:-localhost}"

# BAD — spawns app as child, shell stays PID 1
node index.js

# GOOD — replaces shell with app, app becomes PID 1
exec node index.js

# GOOD — with arguments passed from CMD
exec "$@"
```

### Use tini or --init for zombie reaping

```dockerfile
# Option 1: Use Docker's built-in init
# docker run --init myimage

# Option 2: Install tini in the image
RUN apk add --no-cache tini
ENTRYPOINT ["tini", "--"]
CMD ["node", "index.js"]

# Option 3: Use dumb-init (common in Python)
RUN pip install dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["python", "-m", "myapp"]
```

- `--init` uses tini bundled with Docker (available since Docker 1.13)
- Tini spawns your app, forwards all signals, reaps zombies transparently
- In Podman Quadlets: `RunInit=true`
- In Compose: `init: true` in the service definition

### Listening for the right signal

Some frameworks expect SIGINT (Ctrl+C), not SIGTERM:

```dockerfile
# Override the stop signal for the container
STOPSIGNAL SIGINT
```

- Docker sends SIGTERM by default on `docker stop`
- Python/Flask often uses SIGINT for graceful shutdown
- Node.js handles both SIGTERM and SIGINT
- Check your framework's documentation for the expected signal

## OCI Labels

Tag images with metadata for registry identification and tooling:

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="1.2.3"
LABEL org.opencontainers.image.description="API service"
LABEL org.opencontainers.image.authors="team@example.com"
LABEL org.opencontainers.image.licenses="MIT"
```

In CI, inject labels dynamically from build context:

```dockerfile
ARG BUILD_VERSION
ARG BUILD_SHA
LABEL org.opencontainers.image.version="${BUILD_VERSION}"
LABEL org.opencontainers.image.revision="${BUILD_SHA}"
```

## ENV Persistence Caveat

Each `ENV` creates a layer. Even if unset in a later layer, the value persists in intermediate layers and can be
extracted. For secrets, use build-time `--mount=type=secret` or `ARG` (which doesn't persist in the final image).

```dockerfile
# Secret available only during this RUN
RUN --mount=type=secret,id=api_key \
    API_KEY=$(cat /run/secrets/api_key) \
    && ./configure --key="$API_KEY"
```
