# Container Operations

## Health Checks

### Dockerfile HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1
```

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `--interval` | 30s | Time between checks |
| `--timeout` | 30s | Max time for a single check |
| `--start-period` | 0s | Grace period for startup (failures don't count) |
| `--retries` | 3 | Consecutive failures before `unhealthy` |
| `--start-interval` | 5s | Interval during start period (Docker 25+) |

### Health check patterns by service type

```dockerfile
# HTTP service
HEALTHCHECK CMD curl -f http://localhost:8080/healthz || exit 1

# TCP service (no curl available)
HEALTHCHECK CMD nc -z localhost 5432 || exit 1

# PostgreSQL
HEALTHCHECK CMD pg_isready -U postgres || exit 1

# Redis
HEALTHCHECK CMD redis-cli ping || exit 1

# Process check (distroless — no shell)
HEALTHCHECK CMD ["/app", "--healthcheck"]
```

- `HEALTHCHECK NONE` disables health checks inherited from base image
- Exit code 0 = healthy, 1 = unhealthy
- For distroless images, build the health check into the application binary
- Health checks run inside the container — only check local endpoints

### Compose health checks

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    depends_on:
      db:
        condition: service_healthy
```

## Resource Constraints

### Memory

```bash
docker run --memory=512m --memory-swap=512m myimage
```

- `--memory` — hard limit (container OOM-killed if exceeded)
- `--memory-swap` equal to `--memory` — disables swap
- `--memory-reservation` — soft limit for scheduling

### CPU

```bash
docker run --cpus=1.5 myimage            # Limit to 1.5 CPU cores
docker run --cpuset-cpus=0,1 myimage     # Pin to specific cores
docker run --cpu-shares=512 myimage      # Relative weight (soft limit)
```

- `--cpus` — hard limit on CPU usage (1.5 = 150% of one core)
- `--cpuset-cpus` — pin to physical cores (NUMA-aware workloads)
- `--cpu-shares` — relative weight, only enforced under contention

### In Compose

```yaml
deploy:
  resources:
    limits:
      cpus: "2.0"
      memory: 512M
    reservations:
      cpus: "0.5"
      memory: 256M
```

Always set memory limits in production. A single container without limits
can OOM-kill the Docker daemon or other containers.

## Logging

### Driver selection

| Driver | Rotation | `docker logs` | Use Case |
|--------|----------|--------------|----------|
| `json-file` | Manual | Yes | Default — configure rotation |
| `local` | Built-in | Yes | Recommended for production |
| `journald` | Via journald | Yes | Systemd integration |
| `syslog` | Via syslog | No | Central syslog server |
| `fluentd` | Via fluentd | No | Log aggregation pipeline |
| `none` | N/A | No | Disable logging entirely |

### Configure log rotation (critical for production)

```json
// /etc/docker/daemon.json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Or per container:

```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

- Default `json-file` driver has NO rotation — logs grow until disk is full
- Use `local` driver for built-in rotation, or configure `json-file` rotation
- `max-size` per file, `max-file` total files — container gets
  `max-size * max-file` total log space

### Application logging rules

- Write to stdout/stderr — Docker captures both streams
- Use structured logging (JSON) for machine-parseable output
- Never log secrets, tokens, or passwords
- For non-blocking logging:
  ```bash
  docker run --log-opt mode=non-blocking --log-opt max-buffer-size=4m myimage
  ```

### Structured logging examples

Configure applications to emit JSON for parsing and aggregation:

```python
# Python — stdlib JSON formatter
import logging, json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "ts": self.formatTime(record),
            "level": record.levelname,
            "msg": record.getMessage(),
            "logger": record.name,
        })
```

```javascript
// Node.js — use Pino (high-performance JSON logger)
const pino = require('pino');
const logger = pino({ level: 'info' });
```

```go
// Go — use Zap (structured, leveled logging)
logger, _ := zap.NewProduction()
defer logger.Sync()
logger.Info("request", zap.String("path", "/api"))
```

### Centralized log collection

For multi-service deployments, ship logs to a central store:

- **Fluentd / Fluent Bit / Vector** — lightweight collectors that
  aggregate and forward logs
- Use the `fluentd` logging driver or ship via `journald`
- **EFK stack** (Elasticsearch + Fluentd + Kibana) for searchable logs
- Configure async mode and retries for remote log drivers to prevent
  log loss during collector outages

## Monitoring

### Resource monitoring

```bash
docker stats                      # Real-time CPU/memory/network
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
docker system df                  # Disk usage by images/containers/volumes
```

For production monitoring:
- Export metrics via **cAdvisor** (Docker) or **podman-exporter** (Podman)
- Feed into **Prometheus** + **Grafana** dashboards
- Podman dashboard: Grafana ID 21559

### Health endpoint patterns

Implement multiple health endpoints for fine-grained monitoring:

| Endpoint | Purpose | Check |
|----------|---------|-------|
| `/livez` | Liveness — process is alive | Always 200 if event loop runs |
| `/readyz` | Readiness — can handle traffic | DB + cache connectivity |
| `/healthz` | Combined (simple apps) | Basic connectivity check |

Configure Compose health checks against the readiness endpoint:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/readyz"]
  interval: 15s
  timeout: 5s
  retries: 3
  start_period: 30s
```

## Quadlet Patterns (Podman systemd Integration)

Quadlet is the declarative model for running containers under systemd.
Place files in `~/.config/containers/systemd/` (rootless) or
`/etc/containers/systemd/` (rootful).

### Container unit

```ini
# ~/.config/containers/systemd/myapp.container
[Unit]
Description=My Application

[Container]
Image=docker.io/myorg/myapp:v1.2.3
PublishPort=127.0.0.1:8080:8080
Network=app.network
Volume=app-data.volume:/app/data:Z
AutoUpdate=registry
RunInit=true
NoNewPrivileges=true
DropCapability=ALL
ReadOnly=true
Tmpfs=/tmp

[Service]
TimeoutStartSec=300
Restart=always

[Install]
WantedBy=default.target
```

### Volume unit

```ini
# ~/.config/containers/systemd/app-data.volume
[Volume]
VolumeName=myapp_data
```

### Network unit

```ini
# ~/.config/containers/systemd/app.network
[Network]
NetworkName=myapp_net
Internal=true
```

### Pod unit (shared network namespace)

```ini
# ~/.config/containers/systemd/stack.pod
[Pod]
PodName=mystack
PublishPort=8080:80

[Install]
WantedBy=default.target
```

Containers join with `Pod=stack.pod` in their `.container` file.

### Operations

```bash
systemctl --user daemon-reload     # Regenerate units after changes
systemctl --user start myapp       # Start the service
systemctl --user status myapp      # Check status
journalctl --user -u myapp -f      # Follow logs

# Auto-update
systemctl --user enable --now podman-auto-update.timer
podman auto-update --dry-run       # Preview updates
podman auto-update                 # Apply updates
```

### Key conventions

- Use `After=other.service` for dependencies (not `.container` names)
- Use `EnvironmentFile=` for non-sensitive config
- Use `Secret=` for credentials
- Use fully-qualified image names with `AutoUpdate=registry`
- Use drop-ins (`*.container.d/*.conf`) for environment overrides

## Debugging Running Containers

```bash
# Shell into running container
docker exec -it <container> sh

# View logs (follow)
docker logs -f --tail 100 <container>

# Inspect container config, network, mounts
docker inspect <container>

# View resource usage
docker stats <container>

# View processes
docker top <container>

# Copy files out for inspection
docker cp <container>:/path/to/file ./local-copy

# Ephemeral debug container (shared network namespace)
docker run -it --rm --network container:<target> nicolaka/netshoot

# Ephemeral debug container for distroless (shared PID + network)
docker run -it --rm \
    --pid container:<target> \
    --network container:<target> \
    busybox
```

## Docker vs Podman CLI Compatibility

Most Docker CLI commands work identically with Podman:

```bash
alias docker=podman  # Common alias for Podman users
```

| Docker | Podman | Notes |
|--------|--------|-------|
| `docker compose` | `podman compose` | Podman compose is a wrapper |
| `docker build` | `podman build` | Uses Buildah under the hood |
| `docker run` | `podman run` | Rootless by default in Podman |
| `docker volume` | `podman volume` | Same interface |
| `docker network` | `podman network` | Rootless uses pasta/slirp4netns |

### Key Podman differences

- No daemon — each command is an independent process
- Rootless by default — no `sudo` needed
- Uses Buildah for builds, Skopeo for registry operations
- Quadlet files for systemd service generation (replaces `podman generate systemd`)
- `podman pod` groups containers sharing network namespace (like k8s pods)
- `podman machine` manages Linux VM on macOS/Windows (like Docker Desktop)
