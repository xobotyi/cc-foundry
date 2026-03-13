---
name: proxmox
description: >-
  Proxmox VE administration: VM and LXC provisioning, storage backends, networking,
  clustering, high availability, API automation, cloud-init templates, backups, and
  PCIe passthrough. Invoke whenever task involves any interaction with Proxmox VE —
  configuring hosts, managing guests, designing storage or networking, writing
  automation scripts, planning clusters, troubleshooting, or reviewing PVE
  configurations.
---

# Proxmox VE

**Production infrastructure demands production discipline. Every Proxmox
configuration must be secure by default, redundant where it matters, and
automated where possible.**

---

## Route to Reference

| Topic | Reference | Contents |
|-------|-----------|----------|
| VM and LXC management | [`${CLAUDE_SKILL_DIR}/references/vm-and-lxc.md`] | VM vs LXC comparison table, configuration options, template workflows, linked vs full clone trade-offs |
| Storage backends | [`${CLAUDE_SKILL_DIR}/references/storage-backends.md`] | Backend capability matrix, ZFS tuning (ARC/L2ARC/SLOG/volblocksize), Ceph configuration, LVM-Thin monitoring, storage selection decision tree |
| Networking | [`${CLAUDE_SKILL_DIR}/references/networking.md`] | Bridge configuration, VLAN layout, bonding modes, SDN zones (VXLAN/EVPN), MTU considerations, OVS vs Linux bridge, firewall lockout prevention |
| Clustering and HA | [`${CLAUDE_SKILL_DIR}/references/clustering-and-ha.md`] | Corosync configuration, quorum math, QDevice setup, split-brain prevention, fencing methods, HA groups, migration, quorum loss recovery |
| API and automation | [`${CLAUDE_SKILL_DIR}/references/api-automation.md`] | REST API architecture, pvesh/qm/pct reference, Terraform patterns, cloud-init customization (cicustom, network v2), hookscript lifecycle, CI/CD pipelines |
| Backup strategies | [`${CLAUDE_SKILL_DIR}/references/backup-strategies.md`] | vzdump modes, PBS architecture, encryption key management, garbage collection safety, verification jobs, retention policies, off-site sync patterns |

---

## Guest Management

<guest-management>

### VM vs LXC Decision

- **Default to LXC** for trusted Linux workloads — near-zero overhead, high density
- **Use VMs** when the workload requires: non-Linux OS, full kernel isolation, PCIe
  passthrough, or live migration
- **Use unprivileged containers** (default) — they map container UID 0 to a
  non-privileged host UID, preventing container escape attacks
- Only use privileged containers when unprivileged mode is incompatible (specific
  device access, certain NFS mounts)

### VM Configuration

- Use **VirtIO** drivers for disk and network — mandatory for production performance
- Enable **QEMU Guest Agent** inside every VM for graceful shutdown, snapshot
  consistency, and IP address reporting
- Use **OVMF (UEFI) + Q35 machine type** for PCIe passthrough and Secure Boot
- Set CPU type to `host` for maximum performance in homogeneous clusters; use
  `x86-64-v2-AES` or the lowest common CPU generation when live migration across
  different CPU generations is required
- Enable **memory ballooning** for dynamic RAM management
- Enable **NUMA** topology for VMs with many cores on multi-socket hosts

### Container Configuration

- Set **explicit memory limits** — containers without limits can exhaust host RAM
- Enable **nesting** (`features: nesting=1`) only when required (Docker inside LXC)
- For Docker workloads in LXC: unprivileged + `nesting=1` + `keyctl=1`
- Use **bind mounts** to share host directories, not NFS/CIFS mounts inside the
  container
- PVE 9.0 removed cgroup v1 entirely — containers requiring cgroup v1 must move
  to VMs

### Templates and Cloning

- Build templates with the guest agent and cloud-init pre-installed
- Convert to template: `qm template <vmid>` or backup as `.tar.gz` for containers
- Use **linked clones** for development/ephemeral workloads (fast, shared base disk)
- Use **full clones** for production (independent, no template dependency)

</guest-management>

---

## Storage

<storage>

### Backend Selection

| Need | Backend |
|------|---------|
| Local redundancy, data integrity, snapshots | **ZFS** |
| Local snapshots/clones without ZFS overhead | **LVM-Thin** |
| Shared storage for HA clusters (3+ nodes) | **Ceph** |
| Simple shared storage (existing NAS/SAN) | **NFS** or **iSCSI** |
| Deduplicated backups | **PBS** |

### ZFS Rules

- Use HBA in IT mode — never hardware RAID controllers with write-back cache
- **ARC sizing:** cap explicitly in `/etc/modprobe.d/zfs.conf`; 25-30% of host
  RAM for mixed workloads. PVE 8.1+ defaults to 10% (max 16GB) for new installs.
  Rule of thumb: 2GB base + 1GB per TB of storage
- Set `ashift=12` for 4K sector disks (most modern drives); incorrect ashift
  halves IOPS due to sector misalignment
- **Volblocksize** (VMs on zvols): 16k for mirrors/RAID10; increase for wide
  RAIDZ to reduce write amplification. Can only be set at zvol creation
- **Recordsize** (containers on datasets): tune per workload — 8k for Postgres,
  16k for MariaDB, 1M for large sequential files
- Enable `compression=lz4` — can actually increase I/O performance by writing
  less data to disk
- **SLOG:** 8-32GB enterprise NVMe with power-loss protection; only holds ~5s
  of write data. Benefits sync-heavy workloads (databases, NFS)
- **L2ARC:** only if ARC hit ratio is low and adding RAM is not possible; size
  5-20x RAM; budget 1GB RAM per 50GB of L2ARC for metadata
- Schedule regular scrubs (weekly or monthly)
- Plan capacity upfront — ZFS pools cannot be shrunk
- Never create swap on a ZFS zvol — causes blocking I/O during backups

### Ceph Rules

- Minimum 3 nodes for proper quorum and data distribution
- Dedicated 10GbE+ network for Ceph traffic (25GbE+ recommended for NVMe OSDs),
  separate from Corosync — Ceph rebalance traffic saturates links and causes
  Corosync instability
- Use SSD/NVMe for OSD WAL/DB
- Dedicated disks for OSDs — never share with the host OS
- PVE 9.0 defaults to Ceph Squid (v19.2)

### Storage Anti-Patterns

- Running ZFS or Ceph on top of hardware RAID with write-back cache — defeats
  data integrity guarantees
- Overprovisioning LVM-Thin without monitoring — a full thin pool causes I/O
  errors for all guests on that pool
- Storing backups on the same physical disks as production data
- Letting ZFS ARC consume unbounded RAM — causes VM crashes when the hypervisor
  and VMs compete for memory

</storage>

---

## Networking

<networking>

### Core Model

Every guest connects to a **Linux bridge**. Use **VLAN-aware bridges** (single
bridge with 802.1Q tagging) instead of per-VLAN bridges. The VLAN-aware checkbox
must be explicitly enabled — it is off by default.

### VLAN Best Practices

- Place the **management interface on a dedicated VLAN** — never share with
  guest traffic
- Configure **trunk ports** on physical switches for the Proxmox host — frames
  with VLAN IDs not allowed by the switch are silently dropped
- Assign VLAN tags per guest in the network configuration
- Verify no double-tagging mismatch between Proxmox and switch native VLAN

### Traffic Separation

| Traffic | Minimum bandwidth |
|---------|------------------|
| Management / Corosync | 1GbE (dedicated) |
| Ceph cluster + public | 10GbE (dedicated), 25GbE recommended |
| Migration | 10GbE (recommended) |
| Guest | Depends on workload |

**Critical rule:** Never combine Corosync traffic with high-bandwidth Ceph or
migration traffic on a single 1GbE link. Corosync is latency-sensitive — network
contention causes cluster instability and false fencing.

### SDN

Use SDN (VXLAN zones) for overlay networking across nodes without physical switch
changes. Use EVPN for advanced multi-tenant setups with BGP routing.

**SDN gotchas:**
- VXLAN adds 50-byte header — set VNet MTU to 1450 (or 1370 with IPSEC)
- SDN changes are **staged**, not live — click Apply at Datacenter level
- DHCP requires a gateway configured on the subnet
- Multiple EVPN exit nodes require disabling `rp_filter` in sysctl
- **OVS vs Linux bridge:** OVS is automatically VLAN-aware and may resolve
  10GbE throughput bottlenecks seen with native Linux bridge

</networking>

---

## Clustering and High Availability

<clustering>

### Cluster Rules

- Use a **dedicated network** for Corosync — latency under 5ms required
- Configure **redundant Corosync links** (up to 8 supported via Kronosnet)
  on separate physical networks
- For 2-node clusters, deploy a **QDevice** on a third machine for quorum —
  a 2-node cluster without QDevice is a split-brain generator
- QDevice is discouraged for odd-numbered clusters — it becomes a single
  point of failure due to (N-1) vote allocation
- If using LACP bonds for Corosync, set `bond-lacp-rate fast` on both node
  and switch — default slow rate has 90s failover, causing fencing after ~60s
- **Avoid** `balance-rr`, `balance-xor`, `balance-tlb`, `balance-alb` bond
  modes for Corosync — they cause asymmetric connectivity and mass fencing
- Never join a node with existing VMs/containers to a cluster — start fresh
- Update nodes **one at a time** — the LRM requests a service freeze from the
  CRM during updates; if both are updating, the watchdog fences the node

### HA Requirements

- **Shared or replicated storage** accessible from all HA nodes
- **Working fencing mechanism** — test before relying on HA
- **Minimum 3 quorum votes** (3 nodes, or 2 nodes + QDevice)
- Configure **HA groups** with node priorities for controlled failover

### Fencing

Fencing guarantees a failed node is offline before its services restart elsewhere.
**HA without fencing is a data corruption risk** — two nodes writing to shared
storage simultaneously causes irrecoverable damage.

- Verify watchdog status: `ha-manager status`
- Test fencing by simulating node failure before going to production
- Use hardware watchdog (`iTCO_wdt` via `/etc/default/pve-ha-manager`) when
  available, software watchdog (`softdog`) as fallback
- Configure `WATCHDOG_MODULE=iTCO_wdt` in `/etc/default/pve-ha-manager`

### Quorum Loss Recovery

If the cluster loses quorum, `pmxcfs` becomes read-only — no VM operations
are possible. Emergency recovery:

- `pvecm expected 1` forces single-node quorum — use only to restore vital
  guests or fix the quorum issue itself
- **Never** make cluster changes (add/remove nodes, storage, guests) while
  expected votes are overridden

### Migration

- **Live migration** (VMs only): requires shared/replicated storage, no PCIe
  passthrough devices, brief pause at cutover
- **Offline migration** (VMs and containers): guest stops, data transfers, guest
  starts on target
- Use a dedicated high-bandwidth network for migration traffic

</clustering>

---

## API and Automation

<automation>

### Authentication

- Use **API tokens with privilege separation** for all automation — never root
  credentials
- Store token secrets in vault or environment variables — never in code
- Use ticket authentication only for interactive or short-lived tools

### CLI Tools

| Tool | Purpose |
|------|---------|
| `pvesh` | Direct REST API access from CLI |
| `qm` | VM lifecycle management |
| `pct` | Container lifecycle management |
| `ha-manager` | HA resource management |
| `pvecm` | Cluster management |
| `pvesm` | Storage management |

### Terraform

- Use **API tokens** with privilege separation — never root credentials
- Use cloud-init templates as the base for Terraform-managed VMs — templates
  must have `qemu-guest-agent` installed or Terraform hangs on "still creating"
- Store Terraform state remotely (GitLab HTTP backend, S3, Consul) — never
  local state for shared infrastructure
- Use `lifecycle { ignore_changes }` for fields Proxmox modifies outside
  Terraform (e.g., disk size after manual resize)
- CI/CD pipeline: validate -> plan (save artifact) -> apply (manual trigger)
- Never commit API secrets to git — use CI/CD variables (`TF_VAR_*`)

### Cloud-Init

- Prepare a base VM with `qemu-guest-agent` and `cloud-init` installed
- Add a Cloud-Init drive (IDE or SCSI CD-ROM)
- Configure network, SSH keys, and user data via the Cloud-Init panel or API
- Convert to template, deploy via linked clone
- Use **SSH key authentication** — cloud-init password storage is less secure
- **cicustom** for advanced needs: reference custom YAML snippets for user,
  network, and meta data from a snippets-capable storage
- Store cicustom snippets on shared storage (CephFS) in clusters for HA
- Windows templates: use Cloudbase-Init with `configdrive2` format + Sysprep

</automation>

---

## Backups

<backups>

### Backup Rules

- **Use PBS for production** — deduplication, incremental backups, verification,
  and encryption. Directory/NFS backups are acceptable only for lab environments.
- Use **snapshot mode** for VMs (crash-consistent, no downtime)
- Use **zstd compression** — best balance of ratio and speed
- Run backups during **low-usage windows**, stagger across storage targets
- Follow the **3-2-1 rule**: 3 copies, 2 media types, 1 off-site

### Retention

Configure retention per backup job:
```
keep-daily=7,keep-weekly=4,keep-monthly=6,keep-yearly=1
```

Retention options process in order — each option covers only its time period.
Use higher retention than minimally required; you cannot recreate pruned backups.

### PBS Security

- Restrict PVE backup user/token to create-only access (no delete) on PBS
- Use **dedicated API tokens per host/cluster** scoped to specific namespaces
- Separate PBS admin credentials from PVE access
- Enable backup verification jobs — re-verify all backups monthly (bit rot
  detection). Encrypted chunks can only verify CRC-32, not plaintext content
- Encrypt off-site backups with client-side encryption
- **Store encryption keys separately** from the backed-up system — losing the
  key means losing access. Use an RSA master key for recovery. Store key copies
  in a password manager, USB drive, and QR-encoded paper backup
- Never disable `gc-atime-safety-check` — risks deleting in-use chunks
- The `protected` flag does not sync between PBS instances — re-protect
  snapshots manually on remote targets after sync

### Non-Negotiable

- **Test restores regularly.** A backup that cannot be restored is worthless.
- **Monitor backup jobs.** Configure notification matchers for `vzdump` errors.
  A silently failing backup is worse than no backup.
- **Document the restore procedure.** Where, what credentials, exact commands,
  expected recovery time.

### Off-site Sync

- Use **dedicated remote users** per sync job — shared users with
  `remove-vanished` enabled delete each other's snapshots
- Verify removable datastores are mounted at scheduled sync times

</backups>

---

## PCIe Passthrough

<passthrough>

### Requirements

- CPU: VT-d (Intel) or AMD-Vi enabled in BIOS/UEFI
- IOMMU enabled in kernel: `intel_iommu=on` or `amd_iommu=on` in boot parameters
- Interrupt remapping supported (verify with `dmesg | grep remapping`)
- Dedicated IOMMU group for the passthrough device
- VFIO modules loaded: `vfio`, `vfio_iommu_type1`, `vfio_pci`, `vfio_virqfd`

### Configuration

- Use **OVMF (UEFI) firmware + Q35 machine type** — provides virtual PCIe bus;
  if the GPU lacks a UEFI-capable ROM, use SeaBIOS instead
- Blacklist the host driver for the passthrough device (e.g., `nouveau`, `nvidia`,
  `radeon`) or bind via `vfio-pci` IDs in `/etc/modprobe.d/`
- Add device via `hostpci0: 0000:01:00,pcie=1` in VM configuration
- Pass through **all device functions** — a GPU requires both video and audio
  functions; partial passthrough fails. GPUs with USB-C controllers need that
  controller bound to `vfio-pci` too, or the host freezes
- For GPU passthrough: add `x-vga=1` for primary GPU, configure `vga: none`
- GPU output is **not visible** via NoVNC/SPICE — use a physical monitor,
  HDMI/DP dummy plug, or **Looking Glass** (shared-memory low-latency display)
- VMs with passthrough devices **cannot be live-migrated** — use cluster-wide
  resource mappings (`/cluster/mapping/pci`) for HA with passthrough

### GPU-Specific Issues

- **NVIDIA Error 43 (Windows):** set CPU type to `host`, add
  `options kvm ignore_msrs=1` in `/etc/modprobe.d/kvm.conf`
- **AMD reset bug** (Vega, Polaris, some Navi): GPU fails to reset after VM
  shutdown, preventing reuse without host reboot. Fix: install `vendor-reset`
  kernel module for vendor-specific reset quirks. RDNA2+ generally unaffected
- **NVIDIA vGPU:** officially supported since vGPU Software 18 on PVE. Requires
  valid NVIDIA entitlement. Ampere+ GPUs need SR-IOV enabled first via
  `pve-nvidia-vgpu-helper`

### LXC Device Passthrough

Since PVE 8.2, device passthrough for containers is configurable via the UI.
Limited compared to VM passthrough — no full PCIe passthrough, but supports
specific device access (GPU rendering, USB devices).

### Troubleshooting

- `dmesg | grep -e DMAR -e IOMMU` — verify IOMMU is enabled
- `pvesh get /nodes/{node}/hardware/pci --pci-class-blacklist ""` — list groups
- If IOMMU group contains multiple devices (common on B550/X570), use
  `pcie_acs_override=downstream,multifunction` as a workaround — not
  recommended for production but necessary on many consumer motherboards
- IOMMU groups can change between kernel major versions — verify after updates

</passthrough>

---

## Security

<security>

### Certificates

- PVE generates self-signed certificates by default — replace with ACME
  (Let's Encrypt) certificates for trusted HTTPS
- Use **DNS-01 challenge** for nodes behind firewalls or for wildcard certs
  (via acme.sh-compatible DNS API plugins)
- Use **HTTP-01 challenge** for internet-reachable nodes on port 80
- Trusted certificates are required for reliable WebAuthn (FIDO2) operations

### Firewall

Proxmox VE includes a distributed firewall (iptables-based, nftables available
since PVE 8.2 as tech preview) configurable at datacenter, host, and guest levels.

- Enable the firewall **selectively at each level** — datacenter first, then host,
  then per-VM/container interface. It is disabled by default at all levels.
- Before enabling, create rules to allow management access from remote IPs (ports
  8006, 22, 3128) — enabling without rules locks you out. **Always keep an SSH
  session open** before applying firewall changes
- Create an **IPSet named `management`** with trusted admin IPs — Proxmox
  auto-generates required management access rules from this set
- Use **security groups** for reusable rule sets (e.g., "webserver" group opening
  ports 80/443), applied to multiple VMs for consistency
- Use **`ipfilter-net*` IPSets** per VM interface to prevent IP spoofing
- Enable firewall **logging** for dropped/rejected packets — disabled by default
- **nftables backend** (PVE 8.2+): enable via `nftables: 1` in host.fw; supports
  forwarded traffic rules at host and VNet levels

### User Management and RBAC

- Grant permissions to **groups**, not individual users — shorter, maintainable ACLs
- Use **resource pools** to group related VMs/containers/storage; assign permissions
  at the pool level rather than per-resource
- Use **realms** for authentication: PAM (local), LDAP, Active Directory,
  OpenID Connect (Keycloak, Authentik)
- Define **roles** with specific privileges (PVEVMAdmin, PVEAuditor,
  PVEDatastoreUser) — assign at the narrowest path needed
- Use **privilege-separated API tokens** — token permissions are the intersection
  of user permissions and token-specific ACLs
- Enforce **two-factor authentication** (TOTP, YubiKey, WebAuthn) at the realm
  level for all interactive accounts

### Hardening

- Use the **Enterprise repository** for production — the no-subscription and test
  repositories are not as thoroughly validated
- Keep Proxmox VE updated — apply security patches promptly
- Restrict management interface access (dedicated VLAN, firewall rules)
- Disable root SSH login — use a non-root account with sudo
- Use API tokens with privilege separation for automation
- Do not run additional services (Docker, web servers) directly on the Proxmox host
- Enable **non-free-firmware** repository for CPU microcode security updates
  (enabled by default on PVE 9.0 new installs)

</security>

---

## Monitoring

<monitoring>

### Metrics Export

- Configure **external metric servers** (Datacenter > Metric Server) to export
  host, guest, and storage stats to **InfluxDB** or **Graphite**
- Use **Grafana** for dashboards — community dashboard ID 10048 provides
  per-host, per-VM, and per-storage visualization

### Critical Alerts

Configure notification matchers (PVE 8.1+ notification system) for:

- **Backup failures:** `match-field exact:type=vzdump`, `match-severity error`
- **Fencing/HA events:** `match-field exact:type=fencing`
- **Replication failures:** `match-field exact:type=replication`
- **ZFS errors:** enable ZED email notifications in `/etc/zfs/zed.d/zed.rc`
- **Disk health:** `smartmontools` for S.M.A.R.T. monitoring
- **Ceph health:** monitor for `HEALTH_WARN` and `HEALTH_ERR` states

### Notification Targets

Supported targets: Sendmail/Postfix, SMTP relay, Gotify push notifications,
Webhooks (Discord, Slack, Mattermost). Configure at Datacenter > Notifications.

</monitoring>

---

## Anti-Patterns

These anti-patterns are non-obvious traps that the positive rules above do not
fully convey — common mistakes where the "right" approach is counterintuitive.

| Anti-Pattern | Risk | Fix |
|--------------|------|-----|
| Running Docker directly on the PVE host | Conflicts with PVE networking/storage, complicates updates | Run Docker inside a VM or LXC container |
| Swap on ZFS zvol | Blocks server during backups, high I/O load | Partition a physical disk for swap |
| Using `host` CPU type in mixed clusters | Live migration fails on different CPU generations | Use `x86-64-v2-AES` or lowest common model |
| LACP bonds for Corosync with default rate | 90s failover exceeds fencing timeout (~60s) | Set `bond-lacp-rate fast` on node and switch |
| Load-balancing bond modes for Corosync | Asymmetric connectivity causes mass fencing | Use `active-backup` or LACP with fast rate |
| Using no-subscription repo in production | Less validated packages, potential instability | Use Enterprise repository for production |
| Updating all cluster nodes simultaneously | Watchdog fences nodes during CRM/LRM freeze | Update one node at a time, verify each |
| Unbounded ZFS ARC on VM hosts | ARC silently consumes RAM, VMs crash from OOM | Cap ARC explicitly in `/etc/modprobe.d/zfs.conf` |
| VXLAN with default MTU 1500 | 50-byte encapsulation overhead causes fragmentation | Set VNet MTU to 1450 (1370 with IPSEC) |
| Storing PBS encryption key on backed-up system | Key lost when system fails, backups irrecoverable | Store key in password manager + offline backup |
| Shared remote user for multiple PBS sync jobs | Jobs delete each other's snapshots with `remove-vanished` | Dedicated remote user per sync job |

---

## Application

<application>

### When Configuring Proxmox

- Apply these conventions without narrating each rule
- If the environment has existing patterns, follow them — flag divergences once
- Security practices are defaults, not optional add-ons
- Test changes in a non-production environment when possible
- Document non-obvious configuration choices in comments or a wiki

### When Reviewing Configuration

- Verify storage backend matches workload requirements
- Check network separation (Corosync, Ceph, guest, management)
- Verify HA prerequisites: shared storage, fencing, quorum
- Check backup coverage: all production guests backed up, retention configured,
  notifications enabled, restores tested
- Verify security: firewall enabled, ACME certificates, RBAC configured, no
  root API usage, 2FA enforced
- Verify monitoring: metric server configured, ZED enabled, notification
  matchers for backup/fencing/replication failures

### When Writing Automation

- Use `pvesh` or the REST API — never screen-scrape the web GUI
- Use API tokens with privilege separation
- Handle API errors and task status polling (long operations return task IDs)
- Use cloud-init templates for VM provisioning
- Idempotent scripts: running twice produces the same result
- For automation-heavy workloads with high API volume, increase `MAX_WORKERS`
  in `/etc/default/pvedaemon` and `/etc/default/pveproxy`

</application>

---

## Integration

This skill provides Proxmox VE discipline alongside sibling skills in the
infrastructure plugin:

- **`devops`** — foundational discipline (IaC principles, change management,
  observability) that applies to all Proxmox work
- **`networking`** — general network infrastructure (VLANs, firewalls, DNS)
  beyond PVE-specific networking covered here
- **`ansible`** — configuration management for automating Proxmox host setup
  and post-provisioning
- **`containers`** — Docker/Podman management inside PVE guests (VMs or LXC)

---

## Critical Rules

- **HA without fencing is a data corruption risk** — never enable HA without a tested
  fencing mechanism
- **Cap ZFS ARC explicitly** — unbounded ARC causes VM OOM crashes
- **Dedicated Corosync network** — never share with Ceph or migration traffic on 1GbE
- **Test restores regularly** — a backup that cannot be restored is worthless
- **API tokens with privilege separation** for all automation — never root credentials
- **Use VirtIO drivers** for all production VM disks and network interfaces

**Proxmox is infrastructure. Treat it with the same rigor as production code:
version-controlled configuration, tested changes, monitored operations, documented
decisions.**
