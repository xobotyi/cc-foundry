---
name: containers
description: >-
  Docker and Podman container management: Dockerfile optimization, multi-stage
  builds, Compose v2 orchestration, networking, volumes, security hardening,
  supply chain integrity, health checks, resource limits, Quadlet systemd
  integration, and debugging. Invoke whenever task involves any interaction
  with containers — writing Dockerfiles, configuring Compose, managing
  Podman Quadlets, reviewing container security, debugging container
  issues, or setting up image signing and scanning.
---

# Containers

Security is not optional. Every container runs non-root, with dropped capabilities, on a minimal base image. Convenience
defaults that weaken security posture are bugs, not trade-offs.

## Security Rules

These are non-negotiable defaults for every container configuration. Apply unconditionally — no exceptions for
development, convenience, or "temporary" setups.

- **Run as non-root.** Add a `USER` instruction with explicit UID/GID. Never run production containers as root.
- **Drop all capabilities.** `--cap-drop=ALL`, then add back only what the application genuinely requires. Most
  applications need zero.
- **Enable no-new-privileges.** `--security-opt=no-new-privileges` prevents setuid/setgid escalation.
- **Use read-only filesystem.** `--read-only` with `tmpfs` mounts for `/tmp`, `/run`, and any directories the app writes
  to.
- **Never pass secrets via ENV.** Visible in `docker inspect`, logs, and child processes. Use mounted secret files or
  Docker secrets.
- **Scan images before deployment.** Use Docker Scout, Trivy, or Grype in CI. Block images with critical CVEs.
- **Use distroless for production** when possible. No shell means no shell-based attacks and dramatically fewer CVEs.
- **Never use `--privileged`.** It removes almost all security restrictions. If a workload claims to need it, decompose
  the requirement into specific capabilities.
- **Never mount the Docker socket** (`/var/run/docker.sock`) into containers. It grants root-equivalent control over the
  host. Use purpose-built APIs or socket proxies with restricted access.
- **Use `--init` or tini/dumb-init for PID 1.** Regular applications don't reap zombie processes or handle signals
  correctly as PID 1. Use `docker run --init`, `RunInit=true` in Quadlets, or install tini in the Dockerfile. Without
  this, `docker stop` waits for the kill timeout and zombies accumulate.
- **Verify supply chain integrity.** Pin images to digest, generate SBOMs (Syft, Docker Scout), sign images with
  cosign/Sigstore. Use VEX documents to distinguish exploitable from non-exploitable CVEs. Block unsigned images in CI.

## References

| Topic                 | Reference                                                   | Contents                                                                                                                                           |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dockerfile patterns   | [`${CLAUDE_SKILL_DIR}/references/dockerfile-patterns.md`]   | Multi-stage templates, layer optimization, base image table, .dockerignore, ENTRYPOINT/CMD, BuildKit cache mounts, signal handling, OCI labels     |
| Compose orchestration | [`${CLAUDE_SKILL_DIR}/references/compose-orchestration.md`] | Service structure, depends_on conditions, env vars, secrets, networks, volumes, profiles, restart policies, override files, zero-downtime patterns |
| Security hardening    | [`${CLAUDE_SKILL_DIR}/references/security-hardening.md`]    | Non-root patterns, read-only FS, capabilities, distroless, secrets, scanning, supply chain security, SBOM, image signing, VEX, hardening checklist |
| Networking            | [`${CLAUDE_SKILL_DIR}/references/networking.md`]            | Driver selection table, bridge/host/macvlan/ipvlan usage, port publishing, DNS, multi-network, common mistakes, iptables bypass                    |
| Storage and volumes   | [`${CLAUDE_SKILL_DIR}/references/storage-and-volumes.md`]   | Volume types table, named/bind/tmpfs, NFS/CIFS drivers, backup/restore, permissions, storage drivers, performance                                  |
| Operations            | [`${CLAUDE_SKILL_DIR}/references/operations.md`]            | Health checks, resource constraints, logging drivers, structured logging, debugging, monitoring, Quadlet patterns, Docker/Podman CLI compat        |

## Dockerfile Rules

- **Use multi-stage builds.** Separate build dependencies from the runtime image. Final stage contains only the
  binary/app and its runtime dependencies.
- **Choose minimal base images.** `alpine`, `*-slim`, `distroless`, or `scratch` for static binaries. Never use full OS
  images in production.
- **Pin base image versions.** Use digest pinning (`@sha256:...`) in CI for reproducibility. Use minor version tags
  (`3.13-slim`) in development. Never use `:latest`.
- **Order layers by change frequency.** Stable instructions first (OS packages), volatile instructions last (source
  code). Copy dependency manifests before source code for layer caching.
- **Combine RUN statements.** Merge `apt-get update` with `apt-get install` in the same `RUN`. Clean caches in the same
  layer. Sort packages alphabetically.
- **Use COPY, not ADD.** `COPY` for local files. `ADD` only when you need remote URL fetching or automatic tar
  extraction.
- **Use exec form for CMD/ENTRYPOINT.** `CMD ["app", "--flag"]` — not `CMD app --flag`. Shell form wraps in
  `/bin/sh -c`, making the shell PID 1. Shells don't forward signals to children — your app never receives SIGTERM on
  `docker stop`.
- **Use `exec "$@"` in entrypoint scripts.** Without `exec`, the shell spawns the app as a child and swallows signals.
  `exec` replaces the shell process with the app, making it PID 1.
- **Always create a .dockerignore.** Exclude `.git`, `node_modules`, `.env`, build artifacts, and documentation from the
  build context.
- **Use `--mount=type=secret` for build-time secrets.** Never `COPY` or `ENV` secrets — they persist in image layers.
- **Set WORKDIR to an absolute path.** Never use `RUN cd ... && ...`.
- **Use BuildKit cache mounts** for package manager caches:
  `RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt`. Avoids re-downloading dependencies
  on every build.
- **Use `docker buildx` for multi-platform images.** `docker buildx build --platform linux/amd64,linux/arm64` produces
  images for multiple architectures. Required for ARM/x86 portability.
- **Add OCI labels.** Use `LABEL org.opencontainers.image.*` for source, version, description. Enables registry
  identification and automated tooling.

## Compose Rules

- **Use Compose v2 specification.** No `version:` field. Use `compose.yml` (not `docker-compose.yml`).
- **Use `depends_on` with `condition: service_healthy`** for services that need initialization time (databases, caches).
- **Use `service_completed_successfully`** for one-shot dependencies like migrations.
- **Isolate networks.** Create separate networks for frontend/backend tiers. Use `internal: true` on backend networks to
  block outbound internet access.
- **Use named volumes for persistent data.** Bind mounts for development, named volumes for production. Never rely on
  anonymous volumes.
- **Always set resource limits.** `deploy.resources.limits` for memory and CPU. A container without memory limits can
  OOM-kill the host.
- **Configure log rotation.** Use `local` logging driver, or configure `json-file` with `max-size` and `max-file`.
  Default has no rotation.
- **Use restart policies.** `unless-stopped` for production services. `on-failure` for tasks that should retry but
  eventually stop.
- **Use profiles for optional services.** Debug tools, monitoring, and test runners behind `profiles:` — not started by
  default.
- **Use env_file for environment variables.** Keep `.env.example` in version control, `.env` in `.gitignore`.
- **Use file-based secrets.** Compose `secrets:` mounts files at `/run/secrets/<name>` — granular per-service access,
  not visible in `docker inspect` or process listings like env vars.
- **Use override files for multi-environment.** `compose.yml` for common defaults, `compose.prod.yml` for production
  overrides. Use explicit `-f` flags in production — never rely on automatic `compose.override.yml` loading.
- **Use structured logging (JSON).** Configure apps to emit JSON logs to stdout. Use Pino (Node), Zap (Go), or stdlib
  JSON formatters. Structured logs enable filtering and aggregation.

## Networking Rules

- **Always use user-defined bridge networks.** Default bridge has no DNS resolution and no isolation. User-defined
  bridges provide automatic service discovery by container name.
- **Use `host` network only for performance-critical workloads** that bind many dynamic ports. Not available on Docker
  Desktop.
- **Use `macvlan` when containers need LAN presence** with unique MAC addresses. Use `ipvlan` when the switch limits MAC
  count.
- **Bind published ports to `127.0.0.1`** when the service should not be externally accessible. Docker port mapping
  bypasses host firewall rules.
- **Use `internal: true`** on backend Compose networks to prevent outbound internet access from database and cache
  containers.
- **Bind services to `0.0.0.0` inside containers.** A service bound to `localhost` inside a container is unreachable
  from other containers — `localhost` refers to the container's own namespace.
- **Use a reverse proxy for public-facing services.** Only the proxy publishes ports. Backend services stay on internal
  networks with no published ports. This centralizes TLS, rate limiting, and access logs.

## Volume Rules

- **Named volumes for persistent data.** Databases, uploads, state that must survive container recreation.
- **Bind mounts for development.** Source code, config files injected from host. Always use `:ro` when the container
  should not modify.
- **tmpfs for sensitive ephemeral data.** Secrets at runtime, session files, scratch space. Never persisted to disk.
- **Set volume permissions at build time.** `RUN mkdir && chown` before `USER` instruction. Avoids permission denied
  errors at runtime.
- **Monitor volume disk usage.** `docker system df` shows space used by images, containers, and volumes. Dangling
  anonymous volumes accumulate silently — run `docker volume prune` periodically.
- **For Podman:** use `:U` to chown volume contents to match container user, `:Z`/`:z` for SELinux relabeling.

## Health Check Rules

- **Define health checks for every long-running service.** Use `HEALTHCHECK` in Dockerfile or `healthcheck:` in Compose.
- **Use appropriate check commands.** `curl -f` for HTTP services, `pg_isready` for Postgres, `redis-cli ping` for
  Redis, `nc -z` for TCP ports.
- **Set `start_period`** for services with slow initialization. Failures during start period don't count toward retry
  limit.
- **For distroless images,** build the health check into the application binary. No shell or curl available.
- **Health checks run inside the container.** Only check local endpoints, never external dependencies.

## Resource Limit Rules

- **Always set memory limits in production.** `--memory` or `deploy.resources.limits.memory`. Prevents OOM cascade.
- **Set `--memory-swap` equal to `--memory`** to disable swap. Swapping containers cause unpredictable latency.
- **Use `--cpus` for CPU limits.** Simpler than `--cpu-period`/`--cpu-quota`. `--cpus=1.5` means 150% of one core.
- **Use `--cpu-shares` for relative priority** under contention. Not a hard limit — only enforced when CPU is scarce.

## Podman Considerations

- **Podman is rootless by default.** No daemon, no root required. Uses user namespaces to map container root to
  unprivileged host user. Grants only 11 default capabilities (vs Docker's 14) — tighter least-privilege baseline out of
  the box.
- **Requires `/etc/subuid` and `/etc/subgid` ranges** for the user running containers. Run `podman system migrate` after
  changes.
- **Rootless cannot bind ports < 1024** without `net.ipv4.ip_unprivileged_port_start` sysctl.
- **Rootless networking uses `pasta` or `slirp4netns`** — not kernel bridging. Performance differs from Docker's bridge
  driver. DNS resolution within custom networks is handled by `aardvark-dns`; network setup by `netavark`.
- **Use Quadlet files for systemd integration.** Place `.container`, `.volume`, `.network`, `.pod` files in
  `~/.config/containers/systemd/` (rootless) or `/etc/containers/systemd/` (rootful). Replaces deprecated
  `podman generate systemd`. Run `systemctl --user daemon-reload` after changes. Enable user lingering
  (`loginctl enable-linger`) for rootless services to survive logout.
- **Use `AutoUpdate=registry` in Quadlet containers.** Requires fully-qualified image names. Enable the timer:
  `systemctl --user enable --now podman-auto-update.timer`. Podman pulls new images and restarts affected services.
  Dry-run with `podman auto-update --dry-run`.
- **Use `RunInit=true` in Quadlet containers.** Equivalent to `docker run --init` — adds tini as PID 1 for signal
  forwarding and zombie reaping.
- **Use `TimeoutStartSec=900` for slow image pulls.** Systemd defaults to 90s — large images will fail the service
  start.
- **`podman pod`** groups containers sharing a network namespace, similar to Kubernetes pods. Containers in a pod
  communicate over `localhost`. Use `.pod` Quadlet files with `Pod=` directive in container files to join.
- **SELinux integration is first-class.** Use `:Z` (private) or `:z` (shared) volume flags. `:Z` applies MCS labels
  isolating containers from each other. Always use `:Z` on SELinux systems.
- **Use `Secret=` in Quadlets for credentials.** Create with `podman secret create`, reference with
  `Secret=name,type=env,target=VAR`. Cleaner than env files for sensitive data.
- **Docker Compose compatibility:** `podman compose` wraps docker-compose. Use fully-qualified image names for registry
  operations. Most Docker CLI commands work identically with Podman.

## Application

**When writing Dockerfiles or Compose files:** Apply all rules silently. Produce secure, optimized configurations by
default — multi-stage builds, non-root users, minimal images, init process, health checks, resource limits, log
rotation, and file-based secrets. Never produce a Dockerfile without a `USER` instruction or a Compose service without
`deploy.resources.limits`.

**When reviewing container configurations:** Check every security rule first. Cite the specific rule violated and show
the fix inline. Review priority: security violations > missing resource limits > missing health checks > missing log
rotation > layer optimization.

**When debugging container issues:**

1. `docker logs -f --tail 100 <container>` — check application output
2. `docker inspect <container>` — verify config, mounts, network, env
3. `docker exec -it <container> sh` — interactive inspection (if shell available)
4. `docker run -it --rm --network container:<target> nicolaka/netshoot` — network debugging with full toolkit
5. For distroless: `docker run -it --rm --pid container:<target> --network container:<target> busybox` — ephemeral debug
   sidecar

## Integration

- `the-coder` provides overall coding discipline for configuration files
- `networking` skill in this plugin covers network infrastructure beyond container networking (VLANs, firewalls, reverse
  proxies)
- Language plugins (golang, javascript, python) provide language-specific build patterns referenced in multi-stage
  Dockerfiles

Every container is non-root, read-only filesystem, all capabilities dropped, with an init process for signal handling.
Every image is minimal, scanned, signed, and pinned. Every service has health checks, resource limits, log rotation, and
structured logging. No exceptions.
