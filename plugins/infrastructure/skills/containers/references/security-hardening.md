# Security Hardening

Detailed patterns and examples for container security rules defined in SKILL.md. Read this reference for implementation
specifics.

## Non-root Containers

### Dockerfile non-root pattern

```dockerfile
RUN groupadd -r app --gid=1000 \
    && useradd -r -g app --uid=1000 -d /app app
WORKDIR /app
COPY --chown=app:app . .
USER app
CMD ["./app"]
```

### Runtime non-root

```bash
docker run --user 1000:1000 myimage
```

```yaml
# compose.yml
services:
  app:
    user: "1000:1000"
```

## Read-only Filesystem

```bash
docker run --read-only --tmpfs /tmp --tmpfs /run myimage
```

```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /run
```

Mount `tmpfs` for directories the app needs to write to (`/tmp`, `/run`, `/var/cache`). Everything else is immutable.

## Drop Capabilities

```bash
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myimage
```

```yaml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

Drop all capabilities, then add back only what's needed:

| Capability          | Use Case                    |
| ------------------- | --------------------------- |
| `NET_BIND_SERVICE`  | Bind to ports < 1024        |
| `CHOWN`             | Change file ownership       |
| `SETUID` / `SETGID` | Switch users (init systems) |
| `DAC_OVERRIDE`      | Bypass file permissions     |

Most applications need zero capabilities.

## No New Privileges

```bash
docker run --security-opt=no-new-privileges myimage
```

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
```

Prevents privilege escalation via setuid/setgid binaries inside the container.

## Distroless and Minimal Images

Distroless images contain only the application and its runtime dependencies — no shell, no package manager, no OS
utilities.

```dockerfile
FROM gcr.io/distroless/static-debian12        # Static binaries (Go, Rust)
FROM gcr.io/distroless/base-debian12          # Dynamically linked (C/C++)
FROM gcr.io/distroless/java21-debian12        # Java
FROM gcr.io/distroless/python3-debian12       # Python
FROM gcr.io/distroless/nodejs22-debian12      # Node.js
```

- No shell means no shell-based attacks
- Dramatically reduced CVE surface
- Debugging requires ephemeral debug containers or distroless `:debug` tag

## Secrets Management

### Build-time secrets

```dockerfile
# Mount secrets during build — not persisted in layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

```bash
docker build --secret id=npmrc,src=.npmrc .
```

### Runtime secrets (Compose)

```yaml
services:
  app:
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

- Never pass secrets via `ENV` — visible in `docker inspect`, logs, and child processes
- Never `COPY` secret files — persisted in image layers permanently
- Use `--mount=type=secret` for build-time secrets
- Use Docker secrets or mount secret files at runtime

## Image Scanning

```bash
docker scout cves myimage:latest       # Docker Scout
trivy image myimage:latest             # Trivy
grype myimage:latest                   # Grype
```

Scan images in CI before pushing to registries. Block images with critical/high CVEs.

## Podman Rootless

Podman runs containers without a daemon and without root by default.

### Key differences from Docker

- No daemon — each `podman` command is a direct process
- Rootless by default — uses user namespaces to map container root to unprivileged host user
- Uses `/etc/subuid` and `/etc/subgid` for UID/GID mapping
- Systemd integration via `podman generate systemd` or Quadlet files

### Rootless setup requirements

```bash
# Verify subuid/subgid ranges exist for user
grep $USER /etc/subuid /etc/subgid

# If missing, allocate ranges
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Apply changes
podman system migrate
```

### Rootless limitations

- Cannot bind to ports < 1024 without `net.ipv4.ip_unprivileged_port_start`
- Cannot use `--privileged` or most `--cap-add` options
- Some volume mount permissions require `:Z` or `:U` suffix for SELinux/ownership
- Networking uses `slirp4netns` or `pasta` instead of bridged networking

## Supply Chain Security

### SBOM generation

Generate a Software Bill of Materials for every image in CI:

```bash
# Syft — generate CycloneDX SBOM
syft myimage:latest -o cyclonedx-json > sbom.json

# Docker Scout — generates SBOM automatically
docker scout sbom myimage:latest
```

- Use standard formats: **SPDX** or **CycloneDX**
- Generate SBOMs as a default CI step, not an afterthought
- Cross-reference SBOMs against vulnerability databases continuously

### Image signing with cosign

```bash
# Generate a keypair
cosign generate-key-pair

# Sign an image
cosign sign --key cosign.key myregistry/myimage:v1.2.3

# Verify a signature
cosign verify --key cosign.pub myregistry/myimage:v1.2.3
```

- **Keyless signing** with Sigstore OIDC eliminates key management — signatures use short-lived certificates tied to CI
  identity
- Record signatures in **Rekor** transparency logs for auditability
- Enforce signature verification in CI before deployment

### VEX (Vulnerability Exploitability eXchange)

VEX documents distinguish exploitable CVEs from non-exploitable ones:

- A scanner may report 50 CVEs, but VEX can reduce actionable CVEs to near-zero by filtering out those not exploitable
  in your config
- Docker Scout reads VEX attestations automatically from OCI layers
- For Trivy, configure VEX ingestion to reconcile scanner output
- VEX reduces "security noise" — focus on real risk, not CVE count

### SLSA provenance

- **SLSA Build Level 3** provides cryptographic proof linking an image to its exact source and build environment
- Attach provenance as OCI attestation layers — they travel with the image and are verifiable via
  `cosign verify-attestation`
- Docker Hardened Images (DHIs) ship SLSA L3 provenance by default

## Container Hardening Checklist

- [ ] Non-root USER in Dockerfile
- [ ] Explicit UID/GID (not default auto-assigned)
- [ ] `--read-only` filesystem with tmpfs where needed
- [ ] `--cap-drop=ALL` with minimum add-back
- [ ] `--security-opt=no-new-privileges`
- [ ] `--init` or tini/dumb-init for PID 1 signal handling
- [ ] No secrets in ENV or COPY — use mounted secrets
- [ ] Minimal base image (Alpine, distroless, slim)
- [ ] Image scanned for CVEs before deployment
- [ ] SBOM generated and stored alongside image
- [ ] Image signed (cosign/Sigstore) before push to registry
- [ ] Base image pinned to digest or minor version
- [ ] `.dockerignore` excludes sensitive files
