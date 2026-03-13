# Docker Containers on Unraid

## Architecture

- All container data stored in `docker.img` (BTRFS virtual disk image)
- Default location: `system` share on cache pool for performance
- Container configurations saved as XML templates on the flash drive at `/boot/config/plugins/dockerMan/templates-user/`
- Application data stored in `appdata` share, one subfolder per container
- Unraid does not natively support Docker Compose

## Network Modes

| Mode                    | Behavior                                              | When to Use                                    |
| ----------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Bridge (default)        | Internal Docker network, only mapped ports accessible | Most applications -- safest option             |
| Host                    | Shares server's network stack, all ports available    | Applications requiring direct network access   |
| None                    | No network access                                     | Isolated workloads                             |
| Custom (macvlan/ipvlan) | Container gets its own LAN IP                         | Services needing to appear as separate devices |

### macvlan vs ipvlan Stability

**macvlan on a bridge interface (`br0`) causes kernel call traces and system crashes.** This is a longstanding kernel
issue. Fixes in order of preference:

1. **Switch to ipvlan** (default since 6.11.5): Settings > Docker (Advanced View) > Docker custom network type > ipvlan.
   Works for most systems. Some routers (Fritzbox) and network tools (Ubiquiti) may have issues with ipvlan
2. **Disable bridging on eth0**: Settings > Network Settings > eth0 > Enable Bridging = No. Creates a macvtap network
   with parent `eth0` instead of `br0`. Avoids call traces and reported to be faster than bridged networking

After disabling bridging:

- Docker containers: change Network type to "Custom: eth0"
- VMs: change Network Source to "vhost0", ensure MAC address assigned
- WireGuard tunnels: make a dummy change and save each tunnel
- Port forwarding: delete and recreate rules in router (especially Fritzbox)

### Host Access to Custom Networks

By default, the Unraid host cannot communicate with containers on custom networks (macvlan/ipvlan). To enable
host-container communication:

Settings > Docker Settings > **Host access to custom networks** > Enabled

Critical for: WireGuard tunnels reaching custom-IP containers, reverse proxies accessing custom-network services, any
host service communicating with custom-IP containers.

### Custom Docker Networks

Create custom bridge networks for better isolation and inter-container communication:

```bash
docker network create --driver bridge my-network
```

Benefits:

- Containers on the same custom network can communicate by container name (DNS)
- Isolated from containers on other networks
- Better security segmentation (e.g., separate networks for media vs. databases)
- Persistent across Docker restarts if created via the Docker tab

**Preserve custom networks**: add network creation commands to a User Script that runs at array start to ensure networks
survive Docker service restarts.

### VPN Container Routing

Route container traffic through a dedicated VPN container (e.g., Gluetun):

- VPN container connects to VPN provider, exposes its network to dependent containers
- Dependent containers set their network to the VPN container's network stack
- Ensures all traffic from dependent containers is encrypted and anonymized
- Start VPN container first with sufficient wait time before dependent containers

### Networking Gotchas

- Docker cannot participate in two networks sharing the same subnet
- Switching between wired/wireless requires Docker restart and container reconfiguration
- Bridge mode: only modify the **host port**, not the container port
- Host mode: ensure no port conflicts between containers
- Wi-Fi and Docker have known limitations -- prefer wired connections

## Docker Compose on Unraid

Unraid's native Docker management uses XML templates, not Compose. Docker Compose is an advanced, community-supported
workflow.

### Options for Running Compose

- **Docker-Compose Manager plugin**: install from Community Applications. Provides WebGUI interface for managing Compose
  stacks and editing YAML files
- **CLI**: run standard `docker-compose` commands via Unraid terminal or SSH
- **unDOCK-compose**: tool to convert existing Unraid Docker XML templates into Docker Compose YAML files. Useful for
  migration

### What Compose Enables

- Multiple custom networks per container (not available via native WebGUI)
- Infrastructure as Code: entire server config in version-controlled YAML
- Complex dependencies: multi-container stacks (app + database + cache) with ordering
- Traefik integration via Docker labels for dynamic routing

### Compose Limitations on Unraid

- Containers launched via Compose appear in the Docker tab but **cannot be edited via the Unraid WebGUI** -- all changes
  must be made in the YAML file
- **Action Center** update alerts and automated XML template backups only cover containers installed via Community
  Applications
- Unraid's user-friendly template system is designed to avoid CLI complexity -- Compose is explicitly outside standard
  Unraid documentation and support

## Reverse Proxy Integration

### Traefik

Traefik uses Docker labels for dynamic service discovery and routing:

- Mount Docker socket read-only: `/var/run/docker.sock:/var/run/docker.sock:ro`
- Add routing labels to each container in Compose or template extra parameters
- Handles automatic SSL certificate provisioning via Let's Encrypt
- Configuration lives alongside container definitions (IaC approach)

### Nginx Proxy Manager

- GUI-based configuration -- simpler for users who prefer visual setup
- Manual per-service configuration required
- Does not support dynamic Docker-based discovery like Traefik

Choose Traefik for IaC/automation workflows. Choose NPM for simpler setups or users who prefer a GUI.

## Volume Mappings

- **Container path**: the path inside the container (e.g., `/config`, `/data`)
- **Host path**: the path on the Unraid server (e.g., `/mnt/user/appdata/myapp`)
- **Access mode**: read-only or read/write -- always use most restrictive mode
- Reference the container path in application settings, not the host path

### Standard Patterns

```
Host: /mnt/user/appdata/<app>  ->  Container: /config     (app configuration)
Host: /mnt/user/media          ->  Container: /media       (media files, read-only)
Host: /mnt/user/data           ->  Container: /data        (working data)
```

### Critical Rules

- **Paths are case-sensitive**: `/mnt/user/Media` != `/mnt/user/media`
- Host paths are created automatically if they don't exist -- unexpected folders indicate misconfigured mappings
- Store application data outside the container in the `appdata` share
- Never hardcode sensitive data in container images -- use environment variables

## Environment Variables

Common variables across containers:

| Variable        | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `PUID` / `PGID` | Run container processes as specific user/group |
| `TZ`            | Timezone (e.g., `America/New_York`)            |
| `UMASK`         | File permission mask                           |

Use environment variables for all configuration -- enhances portability and security.

## Startup Management

### Auto-Start Configuration

1. Docker tab > toggle Auto-Start per container
2. Unlock container list (padlock icon) to drag-and-drop reorder
3. Advanced View > set wait times (seconds) between container starts
4. Critical: start dependencies first (database before app, VPN before dependent services)

### Scheduled Start/Stop

Use User Scripts plugin for scheduled container control:

```bash
# Stop a container
docker stop "container-name"

# Start a container
docker start "container-name"

# Restart a container
docker restart "container-name"
```

Schedule via Settings > User Scripts with cron expressions.

## Container Management

### Context Menu Actions

- **WebUI**: open container's web interface
- **Console**: command-line access into container
- **Logs**: view container output for troubleshooting
- **Edit**: modify settings (applied immediately after save)
- **Remove**: delete container (optionally delete image too)

### Health Indicators

- Green: running and responding
- Yellow: running but failing health check -- investigate logs
- White: no health check configured (common, not necessarily a problem)

## Docker Image Management

- `docker.img` uses BTRFS filesystem, mounted internally by Unraid
- Store on cache pool for best performance
- Monitor image size -- if it fills up, containers will fail
- Clean up unused images periodically: remove dangling images via User Scripts

### Maintenance Scripts

Essential User Scripts for Docker health:

- **Delete dangling Docker images**: reclaim space from orphaned layers
- **Trim/clean Docker logs**: prevent log files from consuming docker.img space
- **View Docker log size**: identify containers with excessive logging

## Fork Bomb Prevention (Unraid 7+)

Set PID limits per container to prevent resource exhaustion from runaway processes. Configure in container advanced
settings.
