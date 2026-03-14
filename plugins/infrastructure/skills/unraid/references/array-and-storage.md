# Array and Storage Management

## Storage Architecture

Unraid offers three storage approaches, each with distinct trade-offs:

| Approach                      | Strengths                                                                | Weaknesses                                                 | Best For                                     |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| Traditional array (XFS/BTRFS) | Power-efficient (per-disk spindown), easy expansion, parity protection   | Single-disk write speed, no bitrot protection              | Media storage, growing collections           |
| ZFS pools                     | Bitrot protection, self-healing, snapshots, compression, high throughput | Higher RAM/CPU, all disks spin together, complex expansion | Performance-critical data, multi-user access |
| Hybrid (array + ZFS pools)    | Combines strengths of both                                               | More complex configuration                                 | Balanced setups with mixed workloads         |

Unraid 7+ supports **array-free operation** -- servers configured entirely with ZFS/BTRFS pools and no traditional array
slots. Ideal for all-SSD/NVMe builds.

## Write Modes

- **Read/Modify/Write** (default) — 20-40 MB/s, low power, only parity + target drives spinning. Most workloads, energy
  savings, small writes
- **Turbo Write** (Reconstruct) — 40-120 MB/s, high power, all drives spinning. Large file transfers, array rebuilds
- **Cache Write** (SSD/NVMe) — 50-110 MB/s (SSD), 250-900 MB/s (NVMe), varies, cache drives only. Apps, VMs, frequent
  writes

### Turbo Write

Reads from all data drives to recalculate parity simultaneously. Enable via Settings > Disk Settings > Tunable
(md_write_method) > Reconstruct Write.

- **When to use**: large sequential transfers, during rebuilds (all drives already spinning)
- **When to avoid**: if you want drive spindown for power savings, if any drive is failing
- **Auto mode** (future feature): engages Turbo Write only when all drives already spinning
- Community plugins offer enhanced Turbo Write automation/scheduling

### Tunable (md_write_method) for Power Efficiency

Set to **Auto** in Settings > Disk Settings to spin up only parity + target drive during writes. Slower but prevents
all-drive spinups on every single write operation.

## Parity Protection

The traditional Unraid array uses dedicated parity drives for data protection:

- **Single parity**: protects against one drive failure
- **Dual parity**: protects against two simultaneous drive failures
- Parity drives must be equal to or larger than the largest data drive
- Parity is calculated across all data drives using XOR (single) or Reed-Solomon (dual)
- Parity checks should be scheduled monthly via Settings > Scheduler
- **Parity is not a backup** -- it protects against drive failure, not accidental deletion
- Unclean shutdowns trigger automatic parity checks on next boot -- increased drive wear

## Cache and Pool Strategy

### Cache Write Acceleration

Data written to SSD/NVMe cache appears immediately in shares while the Mover transfers it to the array in the background
(default 3:40 AM). Performance expectations:

- Without cache: average 20-30 MB/s, peaks up to 40 MB/s
- With SSD cache: 50-110 MB/s
- With NVMe cache: 250-900 MB/s (can saturate 10GbE)

**Critical**: files on cache are unprotected by parity until moved. Mitigate with:

- Redundant cache pool (multiple SSDs in RAID 1)
- Mover Tuning plugin to prevent cache overflow
- CA Appdata Backup for container configuration safety

### SSD Limitations

**Unraid does not support TRIM/Discard for SSDs in the main array.** This causes performance degradation over time. SSDs
must be used only in:

- Cache pools (TRIM works properly)
- Unassigned Devices (TRIM works properly)

Never add SSDs to array data slots.

### Single Large Cache ("Big Mac" Strategy)

A single high-endurance enterprise NVMe (e.g., Intel P4510) consolidates multiple SSDs:

- Eliminates inter-drive transfers (all operations on one device)
- Reduces PCIe lane usage
- 3+ GB/s sequential speeds for internal operations
- Enterprise drives offer 10+ PBW endurance

**Risk**: single cache device has no redundancy. Use cache pool for protection.

### Pool Types (Unraid 7+)

- **Cache pools**: fast tier for writes before mover transfers to array
- **ZFS pools**: enable snapshots, compression (lz4 default), self-healing
- **BTRFS pools**: support multiple devices with RAID profiles

### Cache Pool Performance Comparison

| Feature         | Cache Pool (BTRFS)                     | Cache Pool (ZFS)                                    | Main Array                   |
| --------------- | -------------------------------------- | --------------------------------------------------- | ---------------------------- |
| Read speed      | SSD: 400-550 MB/s, NVMe: 250-7000 MB/s | SSD: 400-550 MB/s, NVMe: 250-7000 MB/s              | HDD: 70-250 MB/s (per disk)  |
| Write speed     | SSD: 400-550 MB/s, NVMe: 250-7000 MB/s | SSD: 400-550 MB/s, NVMe: 250-7000 MB/s              | 20-120 MB/s (mode-dependent) |
| Data protection | RAID 1                                 | RAID 1                                              | Parity-based                 |
| Expansion       | Mix drive sizes, dynamic add/remove    | RAIDZ: one drive at a time (7.2+), no drive removal | Add drives freely            |
| Best for        | Apps, VMs, frequent writes             | Apps, VMs, enterprise workloads                     | Bulk storage, media          |

### Mover Configuration

The Mover transfers files between primary and secondary storage:

- Schedule via Settings > Scheduler > Mover Settings
- Direction: Cache > Array (default) or Array > Cache
- **Mover Tuning plugin**: prevents moves when cache is below threshold, supports age-based filtering (e.g., only move
  files older than 40 days when cache > 70% full)
- Custom User Scripts can run per-share mover operations (bypass Mover Tuning thresholds)
- Enable mover logging for troubleshooting: Settings > Scheduler > Mover Settings
- Stop Docker/VMs before manual mover runs if files appear stuck

### Drive Spindown Optimization

Combining cache strategy with spindown saves significant power:

1. Set per-drive spindown to 2 hours (Main page, per-disk)
2. Install Dynamix Cache Dirs plugin (prevents spinups from directory listings)
3. Install Mover Tuning plugin with age/threshold settings
4. Set md_write_method to Auto (avoids all-drive spinup on writes)
5. Use custom mover scripts for specific shares

Typical result: array drives spun down 90%+ of the time, ~30-45W savings depending on drive count.

## Allocation Methods

- **High-Water** (default) — Progressively fills disks using switch points based on half the largest drive. Media
  servers, mixed drive sizes
- **Most-Free** — Always writes to disk with most free space. High-throughput workflows, video editing
- **Fill-Up** — Fills disks sequentially until minimum free space threshold. Static archives, identical drive sizes

**Minimum Free Space**: set to 2x largest file size. Required for Fill-Up method. Split Level takes priority over free
space -- may cause "out of space" errors even with available capacity.

## Split Level

Controls how directory trees span multiple disks:

- **Auto split any directory** — Creates folders on any disk as needed. General data, downloads
- **Auto split top level only** — First-level subfolders stay on one disk. Media libraries (Movies/Title)
- **Auto split top N levels** — N levels managed automatically. Complex nested projects
- **Manual (no auto split)** — Files only go where parent exists. Archives, full manual control

## Disk Management

- **SMART monitoring**: check via Main tab, per-disk SMART reports. Enable notifications for temperature warnings and
  disk errors
- **Preclear**: prepare new drives before adding to array (Unassigned Devices Preclear plugin)
- **Disk replacement**: replace failed drives, rebuild from parity. Run parity check with zero errors before starting.
  Single parity: one disk at a time. Dual: up to two
- **Dynamix Cache Dirs plugin**: prevents unnecessary spinups from directory listings

## ZFS-Specific Configuration

- **Compression**: lz4 is default, minimal overhead even on compressed media. Never use `none` -- wastes space on
  partial blocks and zero-block detection
- **Snapshots**: useful for recovery from bad re-encoding operations. Create clones from snapshots to extract files
  without affecting the original dataset
- **LUKS encryption**: available for ZFS pools and individual drives
- **Hybrid ZFS pools**: support subpools with advanced allocation profiles

### ZFS Pool Profiles

- **Stripe** — No redundancy, fast but risky, 100% space efficiency. Any number of drives
- **Mirror** — 1:1 redundancy, excellent random I/O, 50% space efficiency. 2+ drives (add more mirrors)
- **RAIDZ1** — 1 disk/vdev redundancy, fast sequential, high space efficiency. 3-6 drives (max 8)
- **RAIDZ2** — 2 disks/vdev redundancy, slightly slower writes, moderate space efficiency. 6-12 drives (max 14)
- **RAIDZ3** — 3 disks/vdev redundancy, most write overhead, lower space efficiency. 10-16 drives (max 20)

### RAIDZ Expansion (Unraid 7.2+)

Expand single-vdev RAIDZ1/2/3 pools by adding one drive at a time -- no need to create new vdevs or rebuild.

**Process:**

1. Stop the array
2. On Main > Pool Devices, check if "Upgrade Pool" button exists -- click it if so (one-way, prevents mounting on
   pre-7.1 Unraid)
3. Add a slot to the pool
4. Assign the new drive (must be >= smallest drive in the pool)
5. Start the array -- expansion begins automatically

**Constraints:**

- Expansion is slow: adding a 14TB drive to a pool with 8TB of data takes 26-36 hours
- The array remains fully usable during expansion -- do not stop the array mid-expansion
- **Existing data is not restriped** across the new drive. Old files remain on their original disks until rewritten. New
  data stripes across all drives. To restripe existing data: rewrite files (copy/paste or convert directories to ZFS
  datasets)
- New capacity does not appear until expansion completes -- check progress via Pool Status on the first drive in the
  pool

### Foreign ZFS Pool Import (Unraid 7.1+)

Import ZFS pools created on TrueNAS, Proxmox, QNAP, or Ubuntu:

1. Stop the array
2. Click Add Pool, choose a name
3. Set Number of Data Slots to total drives in the original pool (including support vdevs: log, cache, special, dedup)
4. Assign every physical drive to the correct slots -- Unraid auto-detects each drive's role on start
5. Set File System to **Auto**
6. Start the array. Run a **scrub** after import to verify data integrity

**Limitations:**

- Missing special or dedup vdevs: pool will not import or will be unusable
- Missing log (SLOG) vdev: pool imports but sync write performance drops
- Missing cache (L2ARC) vdev: pool imports, read cache lost, no data loss
- Spare vdevs: not supported (as of 7.1.2)
- Upgrading an imported pool to newer ZFS features prevents mounting on earlier Unraid versions

### External Filesystem Support (Unraid 7.2+)

Unraid 7.2 natively supports **Ext2/3/4, NTFS, and exFAT** alongside XFS, BTRFS, and ZFS:

- Add filled data drives in these formats to the array or single-device pools -- data is retained
- Filled drives can only be added **before** starting the array with a parity drive. Once parity exists, new drives are
  zeroed
- Drives can be formatted directly into Ext4 or NTFS from the WebGUI
- Use case: importing legacy drives (content creator archives, drives from other NAS platforms)

### ZFS Integration Patterns

- **Fast SSD/NVMe pool for appdata** — Store appdata share for responsive containers. 2-drive mirror typical
- **ZFS cache pool** — Use ZFS features (snapshots, compression) for cache tier
- **Daily backup/replication target** — Use ZFS send/receive for efficient incremental replication
- **Snapshot safety net** — Point-in-time recovery from accidental deletions or misconfigurations

## Encryption

- Encryption is disabled by default and requires reformatting drives (erases data)
- To encrypt: move data off disk, change filesystem to encrypted variant, format, restore
- LUKS encryption available for array drives, ZFS pools, and individual devices
- **Warning**: encryption complicates data recovery if something goes wrong
