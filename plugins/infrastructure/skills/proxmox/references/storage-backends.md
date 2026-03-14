# Storage Backends

Proxmox VE supports multiple storage backends, each with different capabilities and trade-offs. Storage selection
directly impacts performance, redundancy, snapshot support, and cluster compatibility.

## Storage Types Overview

| Backend    | Type       | Shared     | Snapshots    | Clones      | Replication    | Best For                             |
| ---------- | ---------- | ---------- | ------------ | ----------- | -------------- | ------------------------------------ |
| ZFS        | Block/File | No (local) | Yes          | Yes         | Yes (ZFS repl) | Local redundancy, data integrity     |
| LVM        | Block      | No (local) | Yes (PVE 9+) | No          | No             | Simple local block storage           |
| LVM-Thin   | Block      | No (local) | Yes          | Yes         | Yes            | Local with snapshots/clones          |
| Ceph (RBD) | Block      | Yes        | Yes          | Yes         | N/A (built-in) | HA clusters, shared storage          |
| CephFS     | File       | Yes        | Yes          | No          | N/A (built-in) | Shared file storage in Ceph clusters |
| NFS        | File       | Yes        | Yes (qcow2)  | Yes (qcow2) | No             | ISOs, backups, simple shared storage |
| iSCSI      | Block      | Yes        | No           | No          | No             | Enterprise SAN integration           |
| CIFS/SMB   | File       | Yes        | Yes (qcow2)  | Yes (qcow2) | No             | Windows-compatible shared storage    |
| Directory  | File       | No (local) | Yes (qcow2)  | Yes (qcow2) | No             | Simple local file storage            |
| PBS        | Backup     | Yes        | N/A          | N/A         | N/A            | Deduplicated backups                 |

**PVE 9.0 change:** LVM thick now supports VM snapshots via "snapshots as volume chains" — qcow2 layers separate volumes
without the I/O degradation of traditional LVM snapshots.

## Content Types

Each storage can host specific content types:

- **`images`** — VM disk images; all block/file storage
- **`rootdir`** — container root filesystems; Directory, NFS, ZFS, LVM-Thin
- **`iso`** — ISO images for VM installation; Directory, NFS, CIFS
- **`vztmpl`** — container templates; Directory, NFS, CIFS
- **`backup`** — backup files (vzdump); Directory, NFS, CIFS, PBS
- **`snippets`** — snippet files (cloud-init, hookscripts); Directory, NFS, CIFS

## ZFS

ZFS provides software RAID, checksumming, copy-on-write snapshots, and built-in compression. It is the most feature-rich
local storage option.

### Strengths

- Data integrity via checksumming (detects and corrects silent corruption)
- Flexible RAID levels (mirror, RAIDZ1/2/3, dRAID)
- Efficient snapshots and clones (copy-on-write)
- Built-in compression (`lz4` recommended — minimal CPU cost, good compression)
- Native replication to other nodes (`pve-zsync` or built-in replication)
- ARC cache provides excellent read performance

### Constraints

- RAM-intensive: baseline 2GB + 1GB per TB of storage
- Requires HBA (IT mode) or direct disk access — never use hardware RAID controllers with write-back cache, as this
  defeats ZFS's data integrity guarantees
- Cannot shrink a pool — plan capacity upfront
- Adding single disks to existing vdevs is supported only since OpenZFS 2.3+

### ARC (Adaptive Replacement Cache) Sizing

The ARC is ZFS's primary read cache in RAM. If left uncapped, it silently consumes up to 50% of host memory, causing VM
crashes from OOM contention.

- **PVE 8.1+ defaults:** New installs set ARC to 10% of physical memory, max 16GB
- **Mixed workloads:** Cap ARC to 25-30% of total host RAM
- **Rule of thumb:** 2GB base + 1GB per TB of storage
- **Monitor:** ARC hit ratio above 90% means the cache earns its RAM. Below 70%, diminishing returns
- **Configuration:**
  ```
  # /etc/modprobe.d/zfs.conf
  options zfs zfs_arc_max=8589934592  # 8GB
  ```
  Run `update-initramfs -u` after changes. Reboot to apply.
- Temporary adjustment: `echo "$[10 * 1024*1024*1024]" > /sys/module/zfs/parameters/zfs_arc_max`
- If `zfs_arc_max` <= `zfs_arc_min`, `zfs_arc_max` is ignored — set `zfs_arc_min` lower first

### SLOG (ZFS Intent Log)

The ZIL handles synchronous writes. A dedicated SLOG offloads this traffic, reducing latency for databases and frequent
`fsync` operations.

- Size: **8-32GB** is adequate — SLOG only holds ~5 seconds of write data
- Using more than half of installed RAM provides no benefit
- **Requirements:** enterprise NVMe with power-loss protection (PLP) — consumer SSDs without PLP defeat the purpose of
  the ZIL
- Benefits: sync-heavy workloads (databases, NFS)

### L2ARC (Level 2 Cache)

Second-level read cache on a dedicated fast device. Only use if ARC hit ratio is low and adding more RAM is not
feasible.

- **Sizing:** 5-20x larger than RAM size
- **RAM overhead:** Budget 1GB of RAM per 50GB of L2ARC (for metadata in ARC)
- The L2ARC device must support more IOPS than the main pool to be effective
- A single SSD as L2ARC in front of 40 SSDs is useless — the pool already exceeds L2ARC IOPS

### Block Size Tuning

**Volblocksize (VMs on zvols)** — sets the logical block size for VM disks. Can only be set at zvol creation. Match to
RAID configuration to minimize write amplification:

- **Mirror / RAID10** — 16k (PVE default)
- **RAIDZ-1 (3-5 disks)** — 16k-32k
- **RAIDZ-1 (10+ disks)** — 128k
- **RAIDZ-2 (4 disks)** — 16k
- **RAIDZ-2 (11+ disks)** — 128k

**Recordsize (containers on datasets)** — tune per workload:

- **Postgres** — 8k
- **MariaDB/MySQL** — 16k
- **General purpose** — 128k (default)
- **Large sequential files (backups, video)** — 1M

### Other ZFS Settings

- `ashift=12` for all modern SSDs and 4K drives. Incorrect ashift halves IOPS due to sector misalignment. Cannot be
  changed after pool creation.
- `compression=lz4` always — can increase I/O performance by writing less data. Use `zstd` if storage space is more
  critical than CPU.
- `atime=off` — reduces metadata writes
- Schedule regular scrubs: `zpool scrub <pool>` (weekly or monthly)
- Never create swap on a ZFS zvol — use a partition on a physical disk

## LVM and LVM-Thin

**LVM (thick):** Simple block storage. Each volume consumes its full allocated size immediately. PVE 9.0 adds snapshot
support via volume chains (qcow2 layering).

**LVM-Thin:** Thin-provisioned volumes that allocate space on write. Supports snapshots and clones. Preferred over thick
LVM for VM/container storage.

**Configuration:**

- Create thin pool on SSD/NVMe for VM storage
- Monitor thin pool usage — overprovisioning is expected, but the pool must not fill completely (causes I/O errors for
  all guests on that pool)
- Set appropriate chunk size during thin pool creation (64K-512K)

## Ceph (RBD and CephFS)

Ceph provides distributed, self-healing storage with no single point of failure. Proxmox VE integrates Ceph natively —
it can manage the full Ceph lifecycle. PVE 9.0 defaults to Ceph Squid (v19.2).

### Strengths

- No single point of failure — data replicated across multiple nodes
- Self-healing — automatically recovers from disk/node failures
- Scales horizontally by adding nodes/disks
- Shared storage enables live migration and HA without external SAN
- Integrated management via Proxmox GUI and CLI

### Requirements

- Minimum 3 nodes (for proper quorum and data distribution)
- Dedicated network for Ceph traffic: 10GbE minimum, 25GbE+ recommended for NVMe
- Separate Ceph cluster network from Proxmox corosync/management traffic — Ceph rebalance traffic saturates links and
  triggers Corosync instability
- SSD or NVMe for OSD journals/WAL/DB (critical for performance)
- Dedicated disks for OSDs — never share with the OS

### When to Choose Ceph vs ZFS

| Factor                | ZFS                     | Ceph             |
| --------------------- | ----------------------- | ---------------- |
| Cluster size          | 1-3 nodes               | 3+ nodes         |
| Shared storage needed | No                      | Yes              |
| Live migration        | Via replication (delay) | Native           |
| Failure domain        | Single node             | Multi-node       |
| Complexity            | Low                     | High             |
| Network requirements  | Standard                | 10GbE+ dedicated |

**Rule of thumb:** Use ZFS for single-node or small clusters without shared storage needs. Use Ceph when you need shared
storage across 3+ nodes with HA.

### Ceph Anti-Patterns

- Running Ceph on 1GbE — rebalance saturates the link, freezing client I/O and triggering Corosync fencing
- 2-node Ceph clusters — not HA, just a split-brain generator. Minimum 3 nodes for operational safety, 5+ for production

## NFS and iSCSI

**NFS:** File-level shared storage. Easy to set up. Suitable for ISOs, backups, templates, and VM disks (as qcow2
files).

- Use NFSv4 when possible (better security, performance)
- Mount with `noatime` to reduce metadata writes
- Ensure server-side exports use `no_root_squash` for Proxmox operations

**iSCSI:** Block-level shared storage. Higher performance than NFS for VM workloads.

- Use multipath for redundancy
- Pair with LVM for thin provisioning on the Proxmox side
- Ensure proper CHAP authentication for security

## Storage Selection Decision Tree

1. **Need shared storage for HA/live migration?**
   - Yes, 3+ nodes, willing to manage complexity -> **Ceph**
   - Yes, have existing SAN/NAS -> **iSCSI** or **NFS**
   - No -> continue to local options
2. **Need data integrity, snapshots, compression?**
   - Yes -> **ZFS**
3. **Need snapshots/clones without ZFS overhead?**
   - Yes -> **LVM-Thin**
4. **Simple block storage, no snapshots needed?**
   - Yes -> **LVM** (PVE 9+ adds snapshot support via volume chains)
5. **Backup storage?**
   - Serious backups -> **PBS** (deduplication, encryption, verification)
   - Simple backups -> **NFS** or **Directory**
