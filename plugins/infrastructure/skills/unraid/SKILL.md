---
name: unraid
description: >-
  Unraid server management: array configuration, Docker containers, VMs, shares,
  plugins, user scripts, backup strategy, and security hardening. Invoke whenever task
  involves any interaction with Unraid — configuring storage, deploying containers,
  setting up VMs, managing shares, writing user scripts, planning backups, reviewing
  configurations, or troubleshooting Unraid systems.
---

# Unraid

Unraid is a storage-first operating system. Every decision flows from how data is stored, protected, and accessed.
Understand the storage layer before touching Docker, VMs, or shares.

## References

Extended configuration details, command examples, and decision tables live in the references directory.

- **Array and storage** — [`${CLAUDE_SKILL_DIR}/references/array-and-storage.md`] Storage architecture comparison, write
  modes with speed benchmarks, cache strategies, allocation methods, split level, ZFS configuration, SSD limitations,
  RAIDZ expansion (7.2), foreign ZFS import (7.1), external FS support (7.2), encryption
- **Docker containers** — [`${CLAUDE_SKILL_DIR}/references/docker-containers.md`] Network modes, macvlan vs ipvlan
  stability, custom networks, Docker Compose Manager plugin workflow, native Compose roadmap, Traefik integration, VPN
  container routing, fork bomb prevention, overlay2 on ZFS, volume mappings, startup management
- **VM management** — [`${CLAUDE_SKILL_DIR}/references/vm-management.md`] BIOS/machine types, vDisk types, GPU
  passthrough setup, IOMMU group risks, ACS override caveats, CPU pinning, IOThreads, NUMA, SR-IOV, snapshots,
  templates, VM backup
- **Shares and permissions** — [`${CLAUDE_SKILL_DIR}/references/shares-and-permissions.md`] Security levels, share
  creation workflow, export visibility options, Windows SMB considerations, NFS configuration, user access control,
  flash device security
- **Plugins and scripts** — [`${CLAUDE_SKILL_DIR}/references/plugins-and-scripts.md`] Plugin catalog, script scheduling
  options, automation patterns, Docker template XML, notification agents, heartbeat monitoring, script repositories
- **Security and networking** — [`${CLAUDE_SKILL_DIR}/references/security-and-networking.md`] SSL hardening, port
  security, remote access methods (Tailscale/WireGuard), Wi-Fi (7.1), OIDC/SSO (7.2), 3-2-1 backup rule, offsite tools
  (Borgmatic/Kopia/Restic), UPS/NUT integration, official GraphQL API (7.2), MCP agent, WebGUI features

## Storage Architecture

Unraid supports three storage approaches. Choose based on workload:

| Approach                               | Use When                                                            |
| -------------------------------------- | ------------------------------------------------------------------- |
| Traditional array (XFS/BTRFS + parity) | Growing media collections, power efficiency matters, easy expansion |
| ZFS pools                              | Data integrity critical, multi-user throughput, snapshots needed    |
| Hybrid (array + ZFS pools)             | Mixed workloads — fast pool for active data, array for cold storage |

Unraid 7+ supports **array-free operation** for all-SSD/NVMe builds using only pools.

### Parity

- Parity drives must be >= largest data drive
- Single parity: one drive failure. Dual parity: two drive failures
- Schedule monthly parity checks via Settings > Scheduler
- **Parity is not a backup** — protects against drive failure only

### Write Modes

- **Read/Modify/Write** (default) — 20-40 MB/s, low power (2 drives). Most workloads, energy savings
- **Turbo Write** (Reconstruct) — 40-120 MB/s, high power (all drives). Large transfers, array rebuilds
- **Cache Write** (SSD/NVMe) — 50-900 MB/s, varies. Apps, VMs, frequent writes

Enable Turbo Write: Settings > Disk Settings > Tunable (md_write_method).

### Cache and Pools

- Store `docker.img` and `appdata` on cache pool for performance
- Use Mover to transfer files between cache and array on schedule
- **Mover Tuning plugin**: prevents moves when cache below threshold, supports age-based filtering (e.g., only move
  files older than 40 days)
- ZFS pools enable snapshots, lz4 compression, self-healing, and RAIDZ expansion (7.2)
- Files on cache are unprotected by parity until moved — back up appdata separately
- **SSDs in array are unsupported** — no TRIM/Discard, causes degradation. Use SSDs only in cache pools or as unassigned
  devices
- **External FS support** (7.2): NTFS, exFAT, EXT2/3/4 drives can be added to array with data intact (before parity is
  assigned)

### Allocation

- **High-Water** (default): progressively fills disks. **Most-Free**: spreads across disks. **Fill-Up**: sequential
- Set Minimum Free Space to 2x largest file size
- Split Level controls directory distribution — takes priority over free space
- See the array and storage reference for detailed allocation methods and split level options

## Docker Containers

### Network Modes

- **Bridge** (default) — Most applications; safest, only mapped ports exposed
- **Host** — Application requires direct network stack access
- **Custom** (macvlan/ipvlan) — Service needs its own LAN IP (Pi-hole, Home Assistant)
- **None** — Isolated workloads with no network needs

Only modify the **host port** in bridge mode, not the container port.

### macvlan vs ipvlan

macvlan on `br0` causes kernel call traces and crashes — switch to ipvlan (default since 6.11.5) or disable bridging.
See the Docker containers reference for detailed migration steps.

Enable **Host access to custom networks** in Settings > Docker if containers with custom IPs need to reach the Unraid
host.

### Docker Compose

Unraid's native Docker management uses XML templates. Docker Compose is community-supported via the **Docker Compose
Manager plugin** (install from CA). Compose containers cannot be edited via WebGUI — all changes must be made in YAML.
See the Docker containers reference for full setup workflow and limitations.

### Volume Mappings

- Store app config in `/mnt/user/appdata/<app>` mapped to `/config`
- Use **read-only** access mode unless write is required
- Reference container paths in application settings, not host paths
- Paths are case-sensitive: `/mnt/user/Media` != `/mnt/user/media`
- Never hardcode secrets in images — use environment variables (`PUID`, `PGID`, `TZ`)

### Startup Order

Order containers by dependency (database before app, VPN before dependent services). Set wait times between starts in
Advanced View on the Docker tab.

### Custom Docker Networks

Create custom bridge networks for inter-container DNS resolution and isolation. Preserve across restarts with a User
Script at array start. See the Docker containers reference for setup details.

## Reverse Proxy

- **Traefik**: Docker labels for dynamic routing and automatic SSL. Mount Docker socket read-only. Best for IaC/Compose
  workflows
- **Nginx Proxy Manager**: GUI-based, simpler setup, manual per-service config. Best for users who prefer visual
  configuration

## Virtual Machines

### Prerequisites

- Enable IOMMU (Intel VT-d / AMD-Vi) in BIOS
- Upload OS ISOs and VirtIO drivers to `isos` share
- Use OVMF (UEFI) for modern OSes and GPU passthrough
- Use Q35 machine type for Linux VMs and GPU passthrough

### GPU Passthrough

1. Bind GPU + audio device to vfio-pci: Tools > System Devices
2. Reboot after binding
3. Select bound GPU in VM settings, assign USB keyboard/mouse
4. If black screen: switch to OVMF + Q35, then try manual ROM injection as last resort

**IOMMU group risks**: on consumer motherboards, the GPU may share an IOMMU group with the SATA controller — binding it
to a VM strips the host of disk access. ACS Override splits groups but bypasses hardware isolation. See the VM
management reference for detailed risks and safer alternatives.

### Performance Tuning

- **CPU pinning**: assign dedicated cores to VMs, avoid core 0
- **IOThreads**: enable VirtIO IOThreads for up to 20% latency reduction
- **NUMA pinning**: place vCPU, IOThreads, and memory on same NUMA node as storage controller for 5%+ IOPS improvement
- **VirtIO drivers**: install paravirtualized drivers for Windows VMs (auto-attach ISO via Settings > VM Manager)
- **QEMU Guest Agent**: install in Windows VMs for graceful shutdown/hibernation

### Snapshots (Unraid 7+)

- Require QCOW2 vDisk format
- Create before significant changes (updates, software installs)
- Revert to restore state, Block Commit to make changes permanent
- Not a backup replacement — complement with VM XML + NVRAM backups

### GPU Sharing (Unraid 7+)

- **VirGL**: share Intel/AMD GPU among Linux VMs (no physical output, no Windows)
- **SR-IOV**: efficient Intel iGPU sharing across multiple VMs
- **QXL**: multi-screen virtual GPU with configurable video memory

## Shares

### User Shares vs Disk Shares

- User shares: aggregated view under `/mnt/user/`, spans drives
- Disk shares: direct drive access under `/mnt/diskX` or `/mnt/pool-name`
- **Never copy between user shares and disk shares** with matching names — causes data corruption

### Security Levels

- **Public** — Read: everyone, Write: everyone. Non-sensitive media (Windows 10+ blocks guest SMB)
- **Secure** — Read: everyone, Write: authorized users. Collaborative folders
- **Private** — Read: authorized users, Write: authorized users. Sensitive data

- Create dedicated user accounts for share access (root cannot access network shares)
- Windows allows only one credential per server — use name for one share, IP for another
- New shares are not network-visible by default — configure SMB/NFS export after creation
- Use "Yes (Hidden)" export for shares that should be accessible but not discoverable

### Default Shares

Do not change permissions on `appdata`, `system`, or `domains`. Only `isos` should be network-accessible.

## Plugins and Automation

### Essential Plugins

- **Community Applications** — App store interface; install first
- **CA Appdata Backup/Restore** — Container config and appdata backup
- **Fix Common Problems** — Configuration error and security risk alerts
- **Unassigned Devices** — Mount drives outside array/pools
- **Dynamix Cache Dirs** — Prevent unnecessary drive spinups
- **Dynamix System Temp** — Hardware temperature monitoring
- **File Integrity** — Bitrot detection and data integrity verification
- **Mover Tuning** — Advanced mover schedule and threshold control
- **Tips and Tweaks** — System-level performance optimizations
- **NUT (Network UPS Tools)** — UPS monitoring and graceful shutdown
- **User Scripts** — Custom automation via scheduled shell scripts

### User Scripts

Install from Apps tab. Access via Settings > User Scripts.

- Schedule with cron expressions or preset intervals
- Common uses: container start/stop for backups, custom mover per share, log trimming, SMART checks, flash drive
  backups, VM XML backups
- Run at: array start, array stop, first boot, or custom cron schedule
- **GPU idle script**: kick Nvidia GPUs into idle at startup (prevents full-power draw when only used by containers)
- **Turbo Write automation**: toggle based on drive spin state
- **Heartbeat monitoring**: send pings to healthchecks.io; alerts if a script fails

## Security

### Non-Negotiable Defaults

- Set a strong root password immediately after install
- Disable Telnet, FTP, and USB Export unless explicitly required
- Never expose the server to the internet or place in router DMZ
- Never forward ports 445 (SMB), 22/23 (SSH/Telnet), or 57xx (VNC)
- Keep OS, plugins, and containers up to date

### WebGUI Hardening

- Provision SSL certificate via Let's Encrypt (myunraid.net wildcard)
- Set Use SSL/TLS to **Strict** for forced HTTPS
- Change default HTTPS port to a random port over 1000
- Install Fix Common Problems plugin for automated security auditing

### Remote Access

- **Tailscale** (recommended): built-in plugin, no port forwarding needed
- **WireGuard**: built into Unraid, encrypted VPN tunnel
- **Unraid Connect**: remote WebGUI, requires port forward
- Never expose the WebGUI directly to the internet

### Share Security

- Set sensitive shares to Private
- Use user accounts with strong passwords, not Public access
- Apply least-privilege permissions per user
- Keep flash device share Private or disabled
- Review permissions regularly, remove unused accounts

### UPS Integration

- Install NUT plugin for UPS monitoring and automated graceful shutdown
- Configure shutdown trigger with sufficient battery runtime for full array stop
- Install QEMU Guest Agent in Windows VMs for clean shutdown during power events
- Unclean shutdowns trigger parity checks on next boot — avoid at all costs

## Backup Strategy

Parity protects against drive failure. Backups protect against everything else. Follow the **3-2-1 rule**: 3 copies, 2
media types, 1 offsite.

- **Flash drive**: back up via Tools > Flash Backup — contains config, license, plugin settings, and Docker template
  XMLs
- **Appdata**: use CA Appdata Backup/Restore plugin on schedule — stop containers during backup for consistency. Back up
  to a "scratch" drive (Unassigned Devices) for speed
- **VM configs**: back up XML files and OVMF NVRAM via User Scripts
- **VM state**: use QCOW2 snapshots before updates, but snapshots are not a backup replacement
- **ZFS snapshots**: useful for quick recovery from bad operations, but not offsite backup
- **Offsite**: use Borgmatic, Kopia, Restic, or Duplicacy for deduplicated, versioned offsite backups (Hetzner Storage
  Box, Backblaze B2). Simple rclone sync lacks versioning — cannot recover from ransomware
- **Monitoring**: use healthchecks.io to verify backup jobs run on schedule. Configure Telegram/Pushover/Slack
  notifications for disk errors and backup failures

## Programmatic Access (Unraid 7.2+)

- **Official GraphQL API**: built into Unraid 7.2+, fully open-source. Powers the Notifications panel and Dashboard CPU
  stats. Supports OIDC/SSO authentication for secure remote access. More WebGUI features will migrate to the API over
  time
- **Unraid Management Agent**: third-party plugin providing REST API, WebSocket, MCP (54 tools for AI agents),
  Prometheus metrics (41 metrics), and MQTT for Home Assistant. Independent from the official API
- **User Scripts**: primary automation engine for host-level scripting

## Gotchas

### Storage

- Cache data has zero parity protection until the Mover runs — treat it as volatile
- Allocation and disk inclusion changes apply prospectively; existing files stay put
- Split Level overrides free space calculations — diagnose "disk full" errors here first
- Array SSD performance degrades silently over time (no TRIM) — pools only
- **RAIDZ expansion** does not restripe existing data — old files remain on original drives until rewritten. Expansion
  of a 14TB drive into an 8TB pool takes 26-36 hours
- **ZFS pool upgrade** is one-way — upgraded pools cannot mount on Unraid versions before 7.1

### Docker

- A corrupted `docker.img` means rebuilding every container from scratch — appdata backups are your only recovery path
- Template defaults set correct container ports — only ever change the host-side mapping
- App settings must reference container-internal paths (`/config`), not host mount points
- Case mismatches in paths silently create duplicate directory trees
- Closing the browser mid-install corrupts the container config — wait for completion
- The `br0` + macvlan combination is a known crash vector — use ipvlan or macvtap
- **Docker on ZFS**: use overlay2 storage driver (Settings > Docker). The legacy native driver causes stability issues.
  Switch requires deleting Docker directory contents for re-download

### Shares

- `cp`/`rsync` between `/mnt/user/` and `/mnt/diskX/` with the same folder name corrupts data — both views point to the
  same underlying files
- Windows caches one credential set per server — use hostname for one share, IP for another as a workaround
- All new shares default to Public read/write — lock down sensitive shares before exposing them on the network

### VMs

- Hot-plugging USB devices into running VMs is unreliable — attach before start
- Hardware changes can silently unbind PCI devices — re-verify in System Devices
- Passing through the only GPU leaves Unraid without a local display
- vDisk shrinking is unsupported — only expand, then resize the guest partition
- ACS Override trades IOMMU isolation for group splitting — weigh data corruption risk against passthrough convenience

## Application

When **configuring** Unraid systems: apply conventions silently. Provide production-ready configurations with security
hardening included by default — Private shares for sensitive data, strong passwords, disabled Telnet/FTP, VPN for remote
access, SSL on WebGUI, UPS integration. Never suggest Public shares for anything beyond non-sensitive media.

When **troubleshooting** Unraid issues: check the Gotchas section first (organized by subsystem). State the likely cause
and fix. Common root causes: user/disk share path mixing, case-sensitive path mismatches, Split Level overriding free
space, cache data not yet parity-protected, macvlan call traces on br0.

When **writing user scripts**: use absolute paths, `set -euo pipefail`, include comments explaining purpose. Test with
manual execution before scheduling. Include backup steps before destructive operations. Add healthchecks.io heartbeats
for critical scripts. Pattern: stop dependent services, perform operation, restart services, send notification on
success/failure.

When **reviewing** Unraid configurations: verify backup coverage (flash, appdata, VM configs, offsite), check share
security levels, confirm cache risk exposure is acceptable for each share's data sensitivity, verify UPS integration.

## Integration

The **containers** skill governs general Docker/Podman practices; this skill governs Unraid-specific Docker integration
(templates, networking modes, `docker.img`, appdata). The **networking** skill governs general network architecture;
this skill governs Unraid-specific networking (br0, Tailscale plugin, WireGuard built-in).

**Storage is the foundation. Understand array, cache, and pools before configuring anything else.**
