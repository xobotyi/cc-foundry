# Storage and Volumes

## Storage Types

- **Named volume** — Managed by Docker, persists, accessible via `docker volume`: Database data, persistent state
- **Anonymous volume** — Managed by Docker, persists until container removed, no direct host access: Temporary
  per-container data
- **Bind mount** — Managed by user, is host FS (direct access): Development, config injection
- **tmpfs** — Managed by kernel, RAM only (never persisted), no host access: Secrets, scratch data, caches

## Named Volumes

```bash
docker volume create pgdata
docker run -v pgdata:/var/lib/postgresql/data postgres:17
```

```yaml
services:
  db:
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- Preferred for production persistent data
- Survive `docker compose down` (but not `down -v`)
- Docker pre-populates empty volumes from container contents at mount point
- `--mount` syntax is more explicit than `-v`:
  ```bash
  docker run --mount source=pgdata,target=/var/lib/postgresql/data postgres:17
  ```

## Bind Mounts

```bash
docker run -v $(pwd)/config:/app/config:ro myimage
```

```yaml
services:
  app:
    volumes:
      - ./src:/app/src       # Development live reload
      - ./config:/app/config:ro
```

- Use for development (live code reload) and config file injection
- Always use `:ro` when the container should not modify host files
- Bind mounts depend on host directory structure — not portable
- Path must be absolute or start with `./` in Compose

## tmpfs Mounts

```bash
docker run --tmpfs /tmp:rw,noexec,nosuid,size=64m myimage
```

```yaml
services:
  app:
    tmpfs:
      - /tmp
      - /run
```

- Stored in host memory only — never written to disk
- Use for sensitive temporary data (secrets, session files)
- Use with `--read-only` to provide writable scratch space
- Set `size` limit to prevent memory exhaustion

## Volume Drivers

### NFS volume

```bash
docker volume create --driver local \
    --opt type=nfs \
    --opt o=addr=10.0.0.10,rw,nfsvers=4 \
    --opt device=:/exports/data \
    nfs-data
```

### CIFS/Samba volume

```bash
docker volume create --driver local \
    --opt type=cifs \
    --opt device=//server/share \
    --opt o=addr=server,username=user,password=pass \
    smb-data
```

## Volume Backup and Restore

### Backup

```bash
docker run --rm \
    -v pgdata:/data:ro \
    -v $(pwd):/backup \
    alpine tar czf /backup/pgdata-backup.tar.gz -C /data .
```

### Restore

```bash
docker run --rm \
    -v pgdata:/data \
    -v $(pwd):/backup \
    alpine tar xzf /backup/pgdata-backup.tar.gz -C /data
```

## Volume Permissions

Common issue: container user cannot write to mounted volume because UID/GID doesn't match.

### Fix at build time

```dockerfile
RUN mkdir -p /app/data && chown 1000:1000 /app/data
USER 1000:1000
```

### Fix at runtime

```bash
docker run --user 1000:1000 -v mydata:/app/data myimage
```

### Podman-specific

```bash
# :U — chown volume contents to match container user
podman run -v mydata:/app/data:U myimage

# :Z — relabel for SELinux (single container access)
podman run -v mydata:/app/data:Z myimage

# :z — relabel for SELinux (shared multi-container access)
podman run -v mydata:/app/data:z myimage
```

## Volume Subpaths

Mount a subdirectory of a volume instead of the entire volume:

```bash
docker run --mount source=logs,target=/var/log/app,volume-subpath=app1 myimage
```

Useful for sharing one volume across multiple containers with isolated subdirectories.

## VOLUME Instruction in Dockerfile

```dockerfile
VOLUME ["/data"]
```

- Creates an anonymous volume at the specified path
- Data at that path is not included in image layers
- **Avoid in application Dockerfiles** — creates anonymous volumes that accumulate and are hard to manage
- Appropriate for database images where data must not be in the writable layer
- Named volumes in `compose.yml` or `docker run -v` override the `VOLUME` instruction

## Cleanup

```bash
docker volume prune              # Remove unused volumes
docker volume prune --all        # Remove ALL unused volumes (including named)
docker system prune --volumes    # Full cleanup including volumes
```

Dangling anonymous volumes accumulate silently. Run `docker volume prune` periodically.

## Storage Drivers

The storage driver manages the container's layered filesystem using copy-on-write. Writing to the container's writable
layer is slower than writing to a volume — never store databases or logs in the container layer.

- **`overlay2`** — Default for Docker on Linux: Best performance, recommended
- **`fuse-overlayfs`** — Rootless Podman (legacy): Slower than native overlay
- **`overlay` (native)** — Rootless Podman (kernel 5.12+): Matches Docker overlay2 performance
- **`btrfs` / `zfs`** — Specialized host filesystems: Use when host FS requires it
- **`vfs`** — Fallback / nested builds: No CoW — simple but least efficient

### Performance best practices

- **Never write heavy data to the container layer.** Use named volumes for databases, uploads, and logs. The union
  filesystem adds overhead on every write.
- **Use native overlay for rootless Podman.** On kernel 5.12+, configure `driver = "overlay"` in `storage.conf` to avoid
  fuse-overlayfs performance penalties.
- **Monitor disk usage.** `docker system df` shows space by images, containers, and volumes. Set alerts on production
  hosts.
- **For nested builds (container-in-container):** Mount a host volume to `/var/lib/containers/storage` instead of
  relying on fuse-overlayfs. Or use `driver = "vfs"` as a faster-than-fuse fallback.
