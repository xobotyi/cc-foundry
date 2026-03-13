# Security, Networking, Backup, and Programmatic Access

## Security Fundamentals

### Root Password

- Required on first WebGUI access after install
- Unraid does not enforce password complexity -- user's responsibility
- Use Dynamix Password Validator plugin for real-time strength feedback
- Root user is for system administration only, cannot access network shares
- Fix Common Problems plugin (3.24.21+) checks for missing root password

### Services to Disable

Disable unless explicitly required:

| Service    | Risk                                             | Action                                             |
| ---------- | ------------------------------------------------ | -------------------------------------------------- |
| Telnet     | Plaintext console access                         | Settings > Management Access > Use TELNET = No     |
| FTP        | Unencrypted credentials and data                 | Settings > Network Services > FTP Server > Disable |
| USB Export | Physical access attack vector, license key theft | Main > Flash > USB Security > Export = No          |

### WebGUI Hardening

- **SSL certificates**: provision trusted wildcard SSL via Let's Encrypt for `myunraid.net` domains. Settings >
  Management Access > Provision
- **Strict SSL**: set Use SSL/TLS to **Strict** to force all WebGUI access through encrypted HTTPS. Redirects all HTTP
  requests to the myunraid.net URL
- **Port obfuscation**: change default HTTPS port (443) to a random port over 1000 to reduce visibility to automated
  scanners
- **Local TLD**: leave at default `local` unless you provide your own DNS resolution
- **Fallback**: with Strict SSL, local access may fail if DNS is unavailable. Use "Yes" mode if you need local fallback
  access

### Port Forwarding Risks

| Port(s)  | Service    | Risk                              | Safer Alternative     |
| -------- | ---------- | --------------------------------- | --------------------- |
| 80/443   | WebGUI     | Exposes management interface      | VPN or Tailscale      |
| 445      | SMB        | Exposes file shares, flash device | VPN                   |
| 111/2049 | NFS        | Exposes NFS shares                | VPN                   |
| 22/23    | SSH/Telnet | Console access exposure           | SSH keys + VPN        |
| 57xx     | VNC        | VM console exposure               | VPN or Unraid Connect |

**Never place the server in your router's DMZ.**

### Remote Access Methods

| Method                  | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Tailscale (recommended) | Built-in plugin (native in 7.0), creates secure private tailnet, no port forwarding needed |
| WireGuard VPN           | Built into Unraid, encrypted tunnel, advanced routing control                              |
| OpenVPN                 | Available as plugin or Docker container                                                    |
| Unraid Connect          | Remote WebGUI access via encrypted proxy, requires port forward on router                  |

### Tailscale Integration (Unraid 7+)

- Install Tailscale plugin from Apps tab (or use built-in support in 7.0+)
- Secure remote access to WebGUI and Docker containers
- Install Tailscale in individual Docker containers to share them on your tailnet
- Exit Nodes: route traffic through your Unraid server
- Use Tailscale certificates for secure WebGUI access
- No port forwarding required -- uses Tailscale's coordination server

### WireGuard Configuration

Configure via Settings > VPN Manager. Connection types:

| Connection Type         | Use Case                                                        |
| ----------------------- | --------------------------------------------------------------- |
| Remote access to server | Access Unraid WebGUI and services remotely                      |
| Remote access to LAN    | Access all LAN devices as if on local network                   |
| Server to server        | Encrypted link between Unraid servers for backup/sharing        |
| LAN to LAN              | Connect entire networks through central server                  |
| VPN tunneled            | Route specific containers through commercial VPN                |
| Remote tunneled         | Route all internet traffic through Unraid on untrusted networks |

For complex networks (custom-IP containers, strict VM networking):

- Set Use NAT to No in tunnel configuration
- Add static route on router for WireGuard subnet pointing to Unraid IP
- Enable Host access to custom networks in Docker Settings

### Update Practices

- Check: Tools > Update OS
- Enable notifications: Settings > Notifications
- Update plugins and containers via Apps tab
- Apply updates promptly -- CVEs are discovered frequently

### Share Security Checklist

1. Set sensitive shares to Private
2. Use user accounts with strong passwords (not Public access)
3. Assign least-privilege permissions per user
4. Keep flash device share Private or disabled
5. Review permissions regularly, remove unused accounts
6. Modern Windows blocks Public SMB shares by default -- use credentials
7. Use "Yes (Hidden)" export setting for shares that should not appear in network browse lists but remain accessible by
   exact name

### Application Security

- Use CA Action Center to monitor for blacklisted or deprecated apps
- Check developer reputation and support thread activity before installing
- Be cautious about granting container access to array, cache, or sensitive data
- Install ClamAV for optional antivirus scanning
- Set up 2FA on your Unraid Forum account

## Networking

### Network File Sharing Protocols

| Protocol      | Best For                                                    |
| ------------- | ----------------------------------------------------------- |
| SMB           | Windows/macOS networks, mixed environments, VM storage      |
| NFS           | Linux/Unix clients, small file operations, static workloads |
| FTP/FTPS/SFTP | Cross-platform legacy transfers (prefer SFTP for security)  |

AFP support removed in Unraid 6.9+. Enable Enhanced macOS interoperability in Settings > SMB for Time Machine
compatibility.

### Docker Networking

**Default bridge (docker0)**: containers communicate via mapped ports only.

**Custom bridges**: better isolation, DNS-based inter-container communication.

```bash
# Create a persistent custom network
docker network create --driver bridge my-stack

# Assign containers to the network via Docker tab or docker run
docker run --network my-stack ...
```

**macvlan/ipvlan**: container gets its own LAN IP. Useful for services that need to appear as separate network devices
(e.g., Pi-hole, Home Assistant).

### br0 and Custom Bridges

- `br0`: the default network bridge created by Unraid for VMs and macvlan containers
- Custom bridges isolate container groups from each other
- Containers on the same custom bridge can resolve each other by name
- Preserve custom networks across Docker restarts with a User Script at array start
- **macvlan on br0 causes call traces** -- switch to ipvlan or disable bridging

### IPv6

Unraid 7+ supports dynamic IPv4 and IPv6 address configuration. Enable via Settings > Network Settings.

## Backup Strategy

### The 3-2-1 Rule

3 copies of data, 2 different media types, 1 copy offsite. Implementation for Unraid:

1. **Local scratch backups**: use Appdata Backup plugin to create backups on a dedicated "scratch" drive (Unassigned
   Devices). Faster than writing to parity-protected array
2. **Internal redundancy**: User Script copies scratch backups to parity-protected array and/or external USB drive
3. **Offsite versioned backups**: use Borgmatic, Kopia, Restic, or Duplicacy to sync to remote storage (Hetzner Storage
   Box, Backblaze B2)

### Why Versioning Matters

Simple cloud sync (rclone copy/sync) provides no protection against ransomware -- encrypted files overwrite the backup.
Versioned backup tools provide:

- **Deduplication**: only changed blocks are transmitted (37TB raw = 3.9TB stored)
- **Point-in-time recovery**: restore files from before the infection
- **Incremental backups**: fast daily backups after initial seed

### Backup Coverage Checklist

| Data                        | Tool                                          | Frequency                        |
| --------------------------- | --------------------------------------------- | -------------------------------- |
| Flash drive (/boot)         | Appdata Backup plugin or User Script + rclone | Daily                            |
| Appdata (container configs) | CA Appdata Backup/Restore                     | Daily/weekly, containers stopped |
| VM XML + NVRAM              | User Script                                   | Weekly                           |
| VM state                    | VM Backup plugin or QCOW2 snapshots           | Before changes                   |
| ZFS datasets                | ZFS snapshot + rsync to array                 | Daily (zero-downtime)            |
| Critical personal data      | Borgmatic/Kopia/Restic to offsite             | Daily                            |
| Media library               | Parity protection + optional offsite          | As needed                        |

### ZFS Snapshot Backups

For ZFS cache pools hosting Docker appdata:

- Script creates ZFS snapshots for all child datasets (per-container)
- Syncs snapshots to array via rsync (only modified files transferred)
- Zero container downtime during backup
- Pair with Kopia/Borgmatic for versioned offsite backup of the synced data

### Backup Monitoring

- **healthchecks.io**: each backup script pings a URL on completion. If a ping is missed, alert is sent automatically.
  Host externally so Unraid failure doesn't block alerts
- **Telegram/Pushover notifications**: configure in Settings > Notifications for immediate alerts on disk errors, backup
  failures, temperature warnings
- **SMART monitoring**: enable per-disk SMART reports and notification alerts for early warning of drive failure

## UPS Integration

### Network UPS Tools (NUT)

NUT is the de facto standard for UPS monitoring on NAS systems. Install as plugin from Community Applications.

- Three-tier model: device drivers > server (upsd) > clients (upsmon)
- Supports vast range of UPS brands and models
- Monitors battery level, runtime, and power state
- Triggers graceful shutdown when battery reaches threshold
- Unraid 6.12.4+ modified shutdown process to work properly with NUT plugin

### Graceful Shutdown Sequence

1. NUT detects power loss and monitors battery level
2. At configured threshold: triggers Unraid shutdown
3. Unraid stops all Docker containers
4. Unraid shuts down or hibernates VMs (QEMU Guest Agent enables clean Windows shutdown)
5. Array stops, disks unmount
6. System powers off

### Configuration Best Practices

- Set shutdown trigger with sufficient remaining runtime for full array stop (account for many services and large VMs
  that take time to close)
- Install QEMU Guest Agent in Windows VMs for clean shutdown
- Test the shutdown sequence manually before relying on it
- Unclean shutdowns trigger parity checks on next boot -- increased drive wear
- Configure UPS status notifications via Telegram/email for remote awareness

## Programmatic Access

### Official GraphQL API (Unraid 7.2+)

Unraid 7.2 introduced an official GraphQL-based API as part of the core OS. Enables deeper integrations and
community-driven developer tooling.

### Unraid Management Agent (Third-Party Plugin)

Go-based plugin providing comprehensive system monitoring and control:

| Interface  | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| REST API   | HTTP endpoints for synchronous queries                             |
| WebSocket  | Real-time event streaming for live updates                         |
| Prometheus | Native `/metrics` endpoint with 41 metrics for Grafana             |
| MQTT       | Event publishing for IoT/Home Assistant integration                |
| MCP        | 54 tools for AI agent integration (LLM-powered monitoring/control) |

**Monitoring capabilities**: CPU, RAM, temperatures, array status, per-disk metrics, SMART data, Docker containers, VMs,
UPS status, GPU metrics, user shares, ZFS pools, notifications.

**Control operations**: Docker start/stop/restart, VM lifecycle management, array start/stop, parity check control, disk
spin up/down, User Script execution.

**Architecture**: event-driven pubsub bus with native Go libraries (Docker SDK, go-libvirt) instead of shell command
parsing for performance.

### Automation Patterns

- **Traefik dynamic config**: Docker labels for automatic reverse proxy routing and SSL. IaC approach -- config lives
  with container definitions
- **Docker Compose**: declarative state management via YAML files
- **MQTT + Home Assistant**: publish system events to MQTT broker for home automation triggers (e.g., shutdown on
  temperature threshold)
- **Prometheus + Grafana**: monitoring dashboards with alerting rules

## Flash Drive Security

The USB flash drive at `/boot` is the Unraid OS boot device:

- Contains all system configuration, license key, and plugin settings
- Back up regularly: Tools > Flash Backup (or CA Flash Backup plugin)
- Not available as a disk share by default
- If exposed as SMB share, set to Private with strong password
- Keep a backup copy of the flash drive in a secure offsite location
- Automate cloud backups via rclone in a User Script (daily, retain 14 days)
