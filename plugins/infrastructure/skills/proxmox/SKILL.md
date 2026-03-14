---
name: proxmox
description: >-
  Proxmox VE administration: VM/LXC/OCI container provisioning, storage backends,
  networking/SDN, clustering, high availability, API automation, cloud-init templates,
  backups/PBS, PCIe passthrough, and vGPU. Invoke whenever task involves any interaction
  with Proxmox VE — configuring hosts, managing guests, designing storage or networking,
  writing automation scripts, planning clusters, troubleshooting, or reviewing PVE
  configurations.
---

# Proxmox VE

**Production infrastructure demands production discipline. Every Proxmox configuration must be secure by default,
redundant where it matters, and automated where possible.**

## Route to Reference

- **VM, LXC, and OCI container management** — [`${CLAUDE_SKILL_DIR}/references/vm-and-lxc.md`]: VM vs LXC vs OCI
  comparison, OCI container support (PVE 9.1 tech preview), Docker-on-Proxmox decision guidance, configuration options,
  template workflows, linked vs full clone trade-offs
- **Storage backends** — [`${CLAUDE_SKILL_DIR}/references/storage-backends.md`]: Backend capability matrix, ZFS tuning
  (ARC/L2ARC/SLOG/volblocksize), Ceph configuration, LVM-Thin monitoring, storage selection decision tree
- **Networking** — [`${CLAUDE_SKILL_DIR}/references/networking.md`]: Bridge configuration, VLAN layout, bonding modes,
  SDN zones (VXLAN/EVPN), MTU considerations, OVS vs Linux bridge, firewall lockout prevention
- **Clustering and HA** — [`${CLAUDE_SKILL_DIR}/references/clustering-and-ha.md`]: Corosync configuration, quorum math,
  QDevice setup, split-brain prevention, fencing methods, HA groups, migration, quorum loss recovery
- **API and automation** — [`${CLAUDE_SKILL_DIR}/references/api-automation.md`]: REST API architecture, pvesh/qm/pct
  reference, Terraform patterns, cloud-init customization (cicustom, network v2), hookscript lifecycle, CI/CD pipelines
- **Backup strategies** — [`${CLAUDE_SKILL_DIR}/references/backup-strategies.md`]: vzdump modes, PBS architecture,
  encryption key management, garbage collection safety, verification jobs, retention policies, off-site sync patterns

## Guest Management

<guest-management>

### VM vs LXC vs OCI Decision

- **Default to LXC** for trusted Linux workloads — near-zero overhead, high density
- **Use VMs** when the workload requires: non-Linux OS, full kernel isolation, PCIe passthrough, or live migration
- **Use OCI containers** (PVE 9.1+, tech preview) for single-purpose microservices from Docker Hub/GHCR — lightweight
  deployment without a Docker VM. Not suitable for multi-container stacks or workloads requiring Docker Compose
- **Use a Docker VM** for full Docker/Compose/Kubernetes workflows, multi-container stacks, or advanced networking
  (macvlan, overlay). Still the most flexible and compatible option for container-heavy workloads
- **Use unprivileged containers** (default) — they map container UID 0 to a non-privileged host UID, preventing
  container escape attacks
- Only use privileged containers when unprivileged mode is incompatible (specific device access, certain NFS mounts)

### VM Configuration

- Use **VirtIO** drivers for disk and network — mandatory for production performance
- Enable **QEMU Guest Agent** inside every VM for graceful shutdown, snapshot consistency, and IP address reporting
- Use **OVMF (UEFI) + Q35 machine type** for PCIe passthrough and Secure Boot
- Set CPU type to `host` for maximum performance in homogeneous clusters; use `x86-64-v2-AES` or the lowest common CPU
  generation when live migration across different CPU generations is required
- Enable **memory ballooning** for dynamic RAM management
- Enable **NUMA** topology for VMs with many cores on multi-socket hosts

### Container Configuration

- Set **explicit memory limits** — containers without limits can exhaust host RAM
- Enable **nesting** (`features: nesting=1`) only when required (Docker inside LXC)
- For Docker workloads in LXC: unprivileged + `nesting=1` + `keyctl=1` — but note this is **unsupported** and can break
  on host updates (CVE-2025-52881 broke Docker-in-LXC setups; workaround: `lxc.apparmor.profile: unconfined`)
- Use **bind mounts** to share host directories, not NFS/CIFS mounts inside the container
- PVE 9.0 removed cgroup v1 entirely — containers requiring cgroup v1 must move to VMs

### OCI Application Containers (PVE 9.1 — Tech Preview)

- Pull OCI images from Docker Hub/GHCR/Quay and run as LXC containers — no Docker engine required
- **Limitations:** no in-place updates, no Docker Compose, no orchestration, no shell in most containers
- **Use for:** single-purpose lightweight services; **use a Docker VM** for multi-container stacks
- See [`${CLAUDE_SKILL_DIR}/references/vm-and-lxc.md`] for full OCI details, Docker-on-Proxmox decision guide, and
  Docker VM best practices

### Templates and Cloning

- Build templates with the guest agent and cloud-init pre-installed
- Convert to template: `qm template <vmid>` or backup as `.tar.gz` for containers
- Use **linked clones** for development/ephemeral workloads (fast, shared base disk)
- Use **full clones** for production (independent, no template dependency)

</guest-management>

## Storage

<storage>

### Backend Selection

- **Local redundancy, data integrity, snapshots** → ZFS
- **Local snapshots/clones without ZFS overhead** → LVM-Thin
- **Shared storage for HA clusters (3+ nodes)** → Ceph
- **Simple shared storage (existing NAS/SAN)** → NFS or iSCSI
- **Deduplicated backups** → PBS

### ZFS Rules

- Use HBA in IT mode — never hardware RAID controllers with write-back cache
- **ARC sizing:** cap explicitly in `/etc/modprobe.d/zfs.conf`; 25-30% of host RAM for mixed workloads. PVE 8.1+
  defaults to 10% (max 16GB) for new installs. Rule of thumb: 2GB base + 1GB per TB of storage
- Set `ashift=12` for 4K sector disks (most modern drives); incorrect ashift halves IOPS due to sector misalignment
- **Volblocksize** (VMs on zvols): 16k for mirrors/RAID10; increase for wide RAIDZ to reduce write amplification. Can
  only be set at zvol creation
- **Recordsize** (containers on datasets): tune per workload — 8k for Postgres, 16k for MariaDB, 1M for large sequential
  files
- Enable `compression=lz4` — can actually increase I/O performance by writing less data to disk
- **SLOG:** 8-32GB enterprise NVMe with power-loss protection; only holds ~5s of write data. Benefits sync-heavy
  workloads (databases, NFS)
- **L2ARC:** only if ARC hit ratio is low and adding RAM is not possible; size 5-20x RAM; budget 1GB RAM per 50GB of
  L2ARC for metadata
- Schedule regular scrubs (weekly or monthly)
- Plan capacity upfront — ZFS pools cannot be shrunk
- Never create swap on a ZFS zvol — causes blocking I/O during backups

### Ceph Rules

- Minimum 3 nodes for proper quorum and data distribution
- Dedicated 10GbE+ network for Ceph traffic (25GbE+ recommended for NVMe OSDs), separate from Corosync — Ceph rebalance
  traffic saturates links and causes Corosync instability
- Use SSD/NVMe for OSD WAL/DB
- Dedicated disks for OSDs — never share with the host OS
- PVE 9.0 defaults to Ceph Squid (v19.2)

### Storage Anti-Patterns

- Running ZFS or Ceph on top of hardware RAID with write-back cache — defeats data integrity guarantees
- Overprovisioning LVM-Thin without monitoring — a full thin pool causes I/O errors for all guests on that pool
- Storing backups on the same physical disks as production data
- Letting ZFS ARC consume unbounded RAM — causes VM crashes when the hypervisor and VMs compete for memory

</storage>

## Networking

<networking>

### Core Model

Every guest connects to a **Linux bridge**. Use **VLAN-aware bridges** (single bridge with 802.1Q tagging) instead of
per-VLAN bridges. The VLAN-aware checkbox must be explicitly enabled — it is off by default.

### VLAN Best Practices

- Place the **management interface on a dedicated VLAN** — never share with guest traffic
- Configure **trunk ports** on physical switches for the Proxmox host — frames with VLAN IDs not allowed by the switch
  are silently dropped
- Assign VLAN tags per guest in the network configuration
- Verify no double-tagging mismatch between Proxmox and switch native VLAN

### Traffic Separation

- **Management / Corosync** — 1GbE (dedicated)
- **Ceph cluster + public** — 10GbE (dedicated), 25GbE recommended
- **Migration** — 10GbE (recommended)
- **Guest** — depends on workload

**Critical rule:** Never combine Corosync traffic with high-bandwidth Ceph or migration traffic on a single 1GbE link.
Corosync is latency-sensitive — network contention causes cluster instability and false fencing.

### SDN

Use SDN (VXLAN zones) for overlay networking across nodes without physical switch changes. Use EVPN for advanced
multi-tenant setups with BGP routing. SDN is fully supported and installed by default since PVE 8.1.

**SDN gotchas:**

- VXLAN adds 50-byte header — set VNet MTU to 1450 (or 1370 with IPSEC)
- SDN changes are **staged**, not live — click Apply at Datacenter level
- DHCP requires a gateway configured on the subnet
- Multiple EVPN exit nodes require disabling `rp_filter` in sysctl
- **OVS vs Linux bridge:** OVS is automatically VLAN-aware and may resolve 10GbE throughput bottlenecks seen with native
  Linux bridge

**SDN-Firewall integration (PVE 8.3+):** SDN automatically generates IPSets for VNets and IPAM-managed guests — use
these in firewall rules for simplified maintenance. The nftables firewall can filter forwarded traffic at host and VNet
levels (e.g., restrict SNAT or inter-zone traffic).

**Fabrics (PVE 9.0+):** Automated routing between cluster nodes using FRRouting with OpenFabric (IS-IS-based) or OSPF.
Fabrics simplify underlay network configuration for Ceph full-mesh and EVPN/VXLAN deployments.

</networking>

## Clustering and High Availability

<clustering>

### Cluster Rules

- Use a **dedicated network** for Corosync — latency under 5ms required
- Configure **redundant Corosync links** (up to 8 supported via Kronosnet) on separate physical networks
- For 2-node clusters, deploy a **QDevice** on a third machine for quorum — a 2-node cluster without QDevice is a
  split-brain generator
- QDevice is discouraged for odd-numbered clusters — it becomes a single point of failure due to (N-1) vote allocation
- If using LACP bonds for Corosync, set `bond-lacp-rate fast` on both node and switch — default slow rate has 90s
  failover, causing fencing after ~60s
- **Avoid** `balance-rr`, `balance-xor`, `balance-tlb`, `balance-alb` bond modes for Corosync — they cause asymmetric
  connectivity and mass fencing
- Never join a node with existing VMs/containers to a cluster — start fresh
- Update nodes **one at a time** — the LRM requests a service freeze from the CRM during updates; if both are updating,
  the watchdog fences the node

### HA Requirements

- **Shared or replicated storage** accessible from all HA nodes
- **Working fencing mechanism** — test before relying on HA
- **Minimum 3 quorum votes** (3 nodes, or 2 nodes + QDevice)
- Configure **HA groups** with node priorities for controlled failover

### Fencing

Fencing guarantees a failed node is offline before its services restart elsewhere. **HA without fencing is a data
corruption risk** — two nodes writing to shared storage simultaneously causes irrecoverable damage.

- Verify watchdog status: `ha-manager status`
- Test fencing by simulating node failure before going to production
- Use hardware watchdog (`iTCO_wdt` via `/etc/default/pve-ha-manager`) when available, software watchdog (`softdog`) as
  fallback
- Configure `WATCHDOG_MODULE=iTCO_wdt` in `/etc/default/pve-ha-manager`

### Quorum Loss Recovery

If the cluster loses quorum, `pmxcfs` becomes read-only — no VM operations are possible. Emergency recovery:

- `pvecm expected 1` forces single-node quorum — use only to restore vital guests or fix the quorum issue itself
- **Never** make cluster changes (add/remove nodes, storage, guests) while expected votes are overridden

### Migration

- **Live migration** (VMs only): requires shared/replicated storage, brief pause at cutover
- **vGPU live migration** (PVE 8.4+): VMs using NVIDIA vGPU (mediated devices) can now be live-migrated between nodes
  with compatible GPU hardware — previously required shutdown
- VMs with full PCIe passthrough devices still cannot be live-migrated — use cluster-wide resource mappings for HA
- **Offline migration** (VMs and containers): guest stops, data transfers, guest starts on target
- Use a dedicated high-bandwidth network for migration traffic

</clustering>

## API and Automation

<automation>

### Authentication

- Use **API tokens with privilege separation** for all automation — never root credentials
- Store token secrets in vault or environment variables — never in code
- Use ticket authentication only for interactive or short-lived tools

### CLI Tools

- **`pvesh`** — direct REST API access from CLI
- **`qm`** — VM lifecycle management
- **`pct`** — container lifecycle management
- **`ha-manager`** — HA resource management
- **`pvecm`** — cluster management
- **`pvesm`** — storage management

### Terraform

- Use **API tokens** with privilege separation — never root credentials
- Use cloud-init templates as the base for Terraform-managed VMs — templates must have `qemu-guest-agent` installed or
  Terraform hangs on "still creating"
- Store Terraform state remotely (GitLab HTTP backend, S3, Consul) — never local state for shared infrastructure
- Use `lifecycle { ignore_changes }` for fields Proxmox modifies outside Terraform (e.g., disk size after manual resize)
- CI/CD pipeline: validate -> plan (save artifact) -> apply (manual trigger)
- Never commit API secrets to git — use CI/CD variables (`TF_VAR_*`)

### Cloud-Init

- Prepare a base VM with `qemu-guest-agent` and `cloud-init` installed
- Add a Cloud-Init drive (IDE or SCSI CD-ROM)
- Configure network, SSH keys, and user data via the Cloud-Init panel or API
- Convert to template, deploy via linked clone
- Use **SSH key authentication** — cloud-init password storage is less secure
- **cicustom** for advanced needs: reference custom YAML snippets for user, network, and meta data from a
  snippets-capable storage
- Store cicustom snippets on shared storage (CephFS) in clusters for HA
- Windows templates: use Cloudbase-Init with `configdrive2` format + Sysprep

</automation>

## Backups

<backups>

### Backup Rules

- **Use PBS for production** — deduplication, incremental backups, verification, encryption
- Use **snapshot mode** for VMs (crash-consistent, no downtime); **zstd compression**
- Follow the **3-2-1 rule**: 3 copies, 2 media types, 1 off-site
- Retention: `keep-daily=7,keep-weekly=4,keep-monthly=6,keep-yearly=1`

### PBS Security

- Restrict PVE backup user/token to create-only access (no delete) on PBS
- Separate PBS admin credentials from PVE access
- **Store encryption keys separately** from the backed-up system — password manager + offline backup
- Never disable `gc-atime-safety-check`; use dedicated remote users per sync job

### Non-Negotiable

- **Test restores regularly.** A backup that cannot be restored is worthless.
- **Monitor backup jobs.** A silently failing backup is worse than no backup.
- **Document the restore procedure.**

</backups>

## PCIe Passthrough

<passthrough>

### Requirements

- CPU: VT-d (Intel) or AMD-Vi enabled in BIOS/UEFI
- IOMMU enabled in kernel: `intel_iommu=on` or `amd_iommu=on`
- VFIO modules loaded: `vfio`, `vfio_iommu_type1`, `vfio_pci`, `vfio_virqfd`
- Dedicated IOMMU group for the passthrough device

### Configuration

- Use **OVMF (UEFI) + Q35 machine type**; SeaBIOS if GPU lacks UEFI ROM
- Blacklist host driver or bind via `vfio-pci` IDs in `/etc/modprobe.d/`
- Pass through **all device functions** — GPU requires video + audio; USB-C controllers must also be bound to vfio-pci
- For GPU: `x-vga=1` for primary, `vga: none`; output via physical monitor, dummy plug, or Looking Glass
- VMs with full passthrough **cannot be live-migrated** — use resource mappings (`/cluster/mapping/pci`) for HA

### GPU-Specific Issues

- **NVIDIA Error 43 (Windows):** set CPU type to `host`, add `options kvm ignore_msrs=1` in `/etc/modprobe.d/kvm.conf`
- **AMD reset bug** (Vega, Polaris, some Navi): GPU fails to reset after VM shutdown, preventing reuse without host
  reboot. Fix: install `vendor-reset` kernel module for vendor-specific reset quirks. RDNA2+ generally unaffected
- **NVIDIA vGPU:** officially supported since vGPU Software 18 on PVE. Requires valid NVIDIA entitlement. Ampere+ GPUs
  need SR-IOV enabled first via `pve-nvidia-vgpu-helper`. PVE 8.4+ supports **live migration of vGPU VMs**

### Virtiofs Directory Passthrough (PVE 8.4+)

Host-to-guest file sharing via **virtiofs** — bypasses network filesystems, provides near-native performance. Linux
guests support virtiofs natively; Windows guests require a guest driver. Use for workloads requiring frequent host-guest
file exchange without the overhead of NFS/SMB.

### LXC Device Passthrough

Since PVE 8.2, device passthrough for containers is configurable via the UI. Limited compared to VM passthrough — no
full PCIe passthrough, but supports specific device access (GPU rendering, USB devices).

### Troubleshooting

- `dmesg | grep -e DMAR -e IOMMU` — verify IOMMU is enabled
- `pvesh get /nodes/{node}/hardware/pci --pci-class-blacklist ""` — list groups
- Multi-device IOMMU groups (B550/X570): `pcie_acs_override=downstream,multifunction` as workaround (not for production)
- IOMMU groups can change between kernel major versions — verify after updates

</passthrough>

## Security

<security>

### Certificates

- Replace self-signed certs with ACME (Let's Encrypt) — DNS-01 for nodes behind firewalls, HTTP-01 for
  internet-reachable
- Trusted certificates required for reliable WebAuthn (FIDO2)

### Firewall

Proxmox VE includes a distributed firewall (iptables-based, nftables opt-in since PVE 8.2) at datacenter, host, and
guest levels. The nftables backend (PVE 8.3+) supports filtering **forwarded traffic** at host and VNet levels.

- Enable **selectively** — datacenter first, then host, then per-interface. Disabled by default at all levels
- Before enabling, create rules for management access (8006, 22, 3128) — **keep an SSH session open** as safety net
- Create **IPSet `management`** with trusted admin IPs — auto-generates management access rules
- Use **security groups** for reusable rule sets across VMs
- Use **`ipfilter-net*` IPSets** per VM interface to prevent IP spoofing

### User Management and RBAC

- Grant permissions to **groups**, not individuals
- Use **resource pools** to group related resources; assign permissions at pool level
- Use **realms** for auth: PAM, LDAP, AD, OpenID Connect (Keycloak, Authentik)
- Use **privilege-separated API tokens** for automation
- Enforce **2FA** (TOTP, YubiKey, WebAuthn) at realm level

### Hardening

- Use **Enterprise repository** for production
- Restrict management interface access (dedicated VLAN, firewall rules)
- Disable root SSH; use non-root with sudo
- Do not run Docker or other services directly on the PVE host

</security>

## Monitoring

<monitoring>

- Export metrics to **InfluxDB/Graphite** (Datacenter > Metric Server); visualize with **Grafana** (dashboard 10048)
- Configure notification matchers for: backup failures (`vzdump`), fencing/HA events, replication failures
- Enable ZED for ZFS errors, `smartmontools` for disk health, Ceph health monitoring
- Notification targets: Sendmail, SMTP, Gotify, Webhooks (PVE 8.3+ — any HTTP endpoint with custom headers/body)

</monitoring>

## Anti-Patterns

Non-obvious traps where the "right" approach is counterintuitive:

- **Swap on ZFS zvol** → partition a physical disk for swap; zvol swap causes blocking I/O during backups
- **LACP bonds for Corosync with default rate** → set `bond-lacp-rate fast` (default 90s failover > 60s fence timeout)
- **Load-balancing bond modes for Corosync** → use `active-backup` or LACP with fast rate; load-balancing modes cause
  asymmetric connectivity and mass fencing
- **PBS encryption key on backed-up system** → store in password manager + offline backup; compromised host means
  compromised backups
- **Shared remote user for PBS sync jobs** → dedicated remote user per sync job; shared users bypass
  `gc-atime-safety-check`

## Application

<application>

### When Configuring Proxmox

- Apply conventions without narrating each rule; follow existing environment patterns
- Security practices are defaults, not optional add-ons
- Test changes in non-production when possible

### When Reviewing Configuration

- Check guest type matches workload (VM vs LXC vs OCI decision)
- Verify storage backend matches workload characteristics (ZFS tuning, Ceph sizing, LVM-Thin monitoring)
- Verify network separation: management, Corosync, Ceph, guest traffic on appropriate interfaces
- Verify HA prerequisites: shared storage, fencing tested, quorum math correct, HA groups configured
- Verify backup coverage: PBS for production, retention policy set, restores tested, encryption keys stored separately
- Check security posture: API tokens with privsep, 2FA enforced, firewall enabled, management VLAN isolated
- Check monitoring: metric export configured, notification matchers for backup/fencing/replication failures

### When Writing Automation

- Use `pvesh` or REST API — never screen-scrape the GUI
- Use API tokens with privilege separation; handle task status polling
- Use cloud-init templates; write idempotent scripts

</application>

## Integration

This skill provides Proxmox VE discipline alongside sibling skills in the infrastructure plugin:

- **`devops`** — foundational discipline (IaC principles, change management, observability) that applies to all Proxmox
  work
- **`networking`** — general network infrastructure (VLANs, firewalls, DNS) beyond PVE-specific networking covered here
- **`ansible`** — configuration management for automating Proxmox host setup and post-provisioning
- **`containers`** — Docker/Podman management inside PVE guests (VMs or LXC)

**Proxmox Datacenter Manager (PDM 1.0):** Centralized management for multiple independent PVE/PBS environments —
aggregated views, cross-cluster live migration, EVPN configuration between clusters, centralized update overview.
Written in Rust. Requires PVE 8.4+ / PBS 3.4+. Relevant for multi-site or large-scale deployments.

## Critical Rules

- **HA without fencing is a data corruption risk** — never enable HA without a tested fencing mechanism
- **Cap ZFS ARC explicitly** — unbounded ARC causes VM OOM crashes
- **Dedicated Corosync network** — never share with Ceph or migration traffic on 1GbE
- **Test restores regularly** — a backup that cannot be restored is worthless
- **API tokens with privilege separation** for all automation — never root credentials
- **Use VirtIO drivers** for all production VM disks and network interfaces

**Proxmox is infrastructure. Treat it with the same rigor as production code: version-controlled configuration, tested
changes, monitored operations, documented decisions.**
