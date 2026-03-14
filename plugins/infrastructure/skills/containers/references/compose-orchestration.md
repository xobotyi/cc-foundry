# Compose Orchestration

Docker Compose v2 patterns for multi-container applications. Compose files use the Compose Specification (no `version:`
field needed).

## Service Structure

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    image: myapp:latest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8080:8080"
    secrets:
      - db_password
    environment:
      DATABASE_URL: postgres://app:${DB_PASSWORD}@db:5432/myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
        reservations:
          memory: 256M

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## depends_on with Health Checks

```yaml
depends_on:
  db:
    condition: service_healthy
  redis:
    condition: service_started
  migrations:
    condition: service_completed_successfully
```

- **`service_started`** — Container started (default)
- **`service_healthy`** — Health check passes
- **`service_completed_successfully`** — Container exits with code 0

Use `service_healthy` for databases and services that need init time. Use `service_completed_successfully` for one-shot
tasks like migrations.

## Environment Variables

```yaml
services:
  app:
    # Inline values
    environment:
      NODE_ENV: production
      LOG_LEVEL: info

    # From .env file
    env_file:
      - .env
      - .env.local

    # Interpolation from host/shell
    environment:
      API_KEY: ${API_KEY:?API_KEY must be set}
```

- `${VAR:-default}` — use default if unset
- `${VAR:?error}` — fail with error if unset
- `.env` file in project root is loaded automatically
- Never commit `.env` files with secrets — use `.env.example` as template

## Networks

```yaml
services:
  frontend:
    networks:
      - frontend
      - backend

  api:
    networks:
      - backend

  db:
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true  # No external access
```

- Services on the same network resolve each other by service name
- `internal: true` blocks outbound internet access — use for backend tiers
- Default network is created automatically if none specified
- Explicit networks provide isolation between service groups

## Volumes

```yaml
volumes:
  pgdata:                    # Named volume (Docker-managed)
  grafana-storage:
    driver: local

services:
  db:
    volumes:
      - pgdata:/var/lib/postgresql/data          # Named volume
      - ./init.sql:/docker-entrypoint-initdb.d/  # Bind mount
      - /data/backups:/backups:ro                 # Read-only bind
```

- **Named volume** — `volname:/path`: Persistent data (databases, uploads)
- **Bind mount** — `./host:/container`: Development, config files
- **tmpfs** — `type: tmpfs`: Ephemeral scratch data, secrets at runtime

- Named volumes survive `docker compose down` (but not `down -v`)
- Bind mounts for development; named volumes for production
- Use `:ro` suffix for read-only mounts

## Multi-environment Compose

### Override files

```bash
# Base + development overrides (automatic)
docker compose up

# Base + production overrides
docker compose -f compose.yml -f compose.prod.yml up
```

`compose.override.yml` is loaded automatically with `compose.yml`.

### Profile-based services

```yaml
services:
  app:
    # Always starts

  debug:
    profiles: ["debug"]
    image: busybox
    # Only starts with: docker compose --profile debug up

  test:
    profiles: ["test"]
```

## Restart Policies

- **`no`** — Never restart (default)
- **`always`** — Always restart, including on daemon startup
- **`unless-stopped`** — Like `always`, but not if manually stopped
- **`on-failure[:max]`** — Restart only on non-zero exit, optional retry limit

Use `unless-stopped` for production services. Use `on-failure` for tasks that should retry but eventually give up.

## Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: "1.5"
      memory: 512M
    reservations:
      cpus: "0.5"
      memory: 256M
```

- `limits` — hard ceiling, container is killed/throttled if exceeded
- `reservations` — guaranteed minimum, used for scheduling
- Always set memory limits for production — prevents OOM cascading
- `deploy.resources` works with `docker compose up` (not just Swarm)

## Secrets

File-based secrets are safer than environment variables — env vars leak into `docker inspect`, process listings, and
crash dumps.

```yaml
services:
  app:
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

- Secrets mount as files at `/run/secrets/<name>` — read-only by default
- Many official images support `*_FILE` env vars (Postgres, MySQL, etc.)
- For custom apps, read the secret file path from an env var at startup
- Granular per-service access — only services that declare the secret can read it

## Override Files

Layer environment-specific configuration without duplicating code:

```bash
# Development (automatic — loads compose.override.yml)
docker compose up

# Production (explicit file selection)
docker compose -f compose.yml -f compose.prod.yml up -d

# Validate merged result before deploying
docker compose -f compose.yml -f compose.prod.yml config
```

### Merge behavior

- Scalar values (image, command): **replaced** by override
- Arrays (ports, volumes): **combined** — watch for port conflicts
- Maps (environment, labels): **merged** by key

### Project organization

```
project/
├── compose.yml              # Common defaults
├── compose.override.yml     # Development (auto-loaded, gitignored)
├── compose.prod.yml         # Production overrides
├── compose.monitoring.yml   # Optional observability stack
├── .env                     # Variable substitution (gitignored)
└── .env.example             # Template (committed)
```

- Never rely on automatic `compose.override.yml` in production
- Use explicit `-f` flags for production deployments
- Use `docker compose config` to verify merged output

## Zero-downtime Patterns

Standard `docker compose up` stops the old container before starting the new one — 10-20 seconds of downtime.

### docker-rollout plugin

```bash
# Install the plugin, then:
docker rollout myservice
```

Scales to 2 instances, waits for health check, updates proxy routing, then removes the old container. Requires a reverse
proxy (Traefik, Nginx).

### Blue/green with project names

```bash
# Start green alongside blue
TAG=v2.0 docker compose -p green up -d

# Verify green health, flip proxy upstream

# Remove blue
docker compose -p blue down
```

Trade-offs: requires enough resources for both stacks briefly, migrations must be backward-compatible.

### Rollback

```bash
# Re-deploy the previous tag
TAG=v1.9 docker compose up -d
```

If migrations were destructive, rollback may be impossible. Use additive schema changes and feature flags.

## Init Process

Enable tini as PID 1 for signal forwarding and zombie reaping:

```yaml
services:
  app:
    init: true
```

Use for any service where the application is not designed to run as PID 1 (most applications).

## Compose Commands

```bash
docker compose up -d              # Start detached
docker compose down               # Stop and remove containers
docker compose down -v            # Also remove volumes
docker compose logs -f app        # Follow logs for service
docker compose exec app sh        # Shell into running container
docker compose build --no-cache   # Rebuild images
docker compose ps                 # List running services
docker compose config             # Validate and print merged config
```
