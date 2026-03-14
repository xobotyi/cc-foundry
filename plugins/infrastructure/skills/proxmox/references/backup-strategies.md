# Backup Strategies

Proxmox VE provides built-in backup via **vzdump** and integrates with **Proxmox Backup Server (PBS)** for advanced
backup management. Reliable backups are a non-negotiable requirement for any production environment.

## vzdump — Built-in Backup Tool

vzdump creates consistent backup archives of VMs and containers, including disk data and configuration files.

### Backup Modes

| Mode       | Downtime | Consistency              | Use Case                                 |
| ---------- | -------- | ------------------------ | ---------------------------------------- |
| `snapshot` | None     | Crash-consistent         | Production VMs (default for KVM)         |
| `suspend`  | Brief    | Consistent (RAM flushed) | When snapshot is unavailable             |
| `stop`     | Full     | Fully consistent         | Maximum consistency, downtime acceptable |

- **Snapshot mode** (recommended for VMs): Uses QEMU's live snapshot capability. The VM continues running. Result is
  crash-consistent — equivalent to a power loss recovery. Applications with journaling (databases, filesystems) handle
  this well.
- **Suspend mode:** Suspends the guest, copies data, then resumes. Brief downtime but guaranteed memory consistency.
- **Stop mode:** Stops the guest completely, backs up, restarts. Longest downtime but cleanest backup. Required for some
  LXC containers.

**PVE 8.3+ container backup optimization:** When backing up containers to PBS, PVE can detect unchanged files since the
last snapshot and skip them — significantly faster container backups for large, mostly-static filesystems.

**PVE 8.4+ backup fleecing:** Refined mechanism that reduces I/O impact on running VMs during live backup operations —
prevents the I/O stalls that could occur with large, write-heavy VMs during snapshot backups.

### Backup Compression

- **`lzo`** — fast speed, low ratio, low CPU
- **`gzip`** — medium speed, medium ratio, medium CPU
- **`zstd`** — fast speed, high ratio, medium CPU

Use **zstd** as the default — it provides the best balance of compression ratio and speed. Specify with
`--compress zstd`.

### Backup Scheduling

Configure backup jobs via the GUI (Datacenter > Backup) or `/etc/pve/jobs.cfg`:

```
vzdump: backup-daily
    enabled 1
    schedule daily 02:00
    storage pbs-store
    mailnotification always
    mailto admin@example.com
    mode snapshot
    compress zstd
    all 1
    exclude 9000,9001
    notes-template {{guestname}} - {{cluster}}
```

**Scheduling best practices:**

- Run backups during low-usage windows (overnight)
- Stagger backup start times across storage targets to avoid I/O contention
- Exclude templates and ephemeral VMs (`exclude` parameter)
- Enable email notifications (`mailnotification always`) for failure alerts
- Use `prune-backups` to define retention policy inline

### Retention

Configure retention per backup job or per storage:

```
prune-backups: keep-daily=7,keep-weekly=4,keep-monthly=6,keep-yearly=1
```

- **`keep-last`** — keep the N most recent backups
- **`keep-hourly`** — keep one backup per hour for N hours
- **`keep-daily`** — keep one backup per day for N days
- **`keep-weekly`** — keep one backup per week for N weeks
- **`keep-monthly`** — keep one backup per month for N months
- **`keep-yearly`** — keep one backup per year for N years

**Retention rules are applied in order.** A backup kept by `keep-daily` is also counted toward `keep-weekly` if
applicable. The pruning algorithm preserves the most diverse time distribution.

## Proxmox Backup Server (PBS)

PBS is a dedicated backup solution that provides enterprise features beyond what vzdump-to-directory offers.

### Key Advantages Over Directory Backups

| Feature                | vzdump (directory/NFS)     | PBS                            |
| ---------------------- | -------------------------- | ------------------------------ |
| Deduplication          | None                       | Content-addressable chunks     |
| Incremental backups    | No (full backup each time) | Yes (only changed chunks)      |
| Client-side encryption | No                         | Yes (AES-256-GCM)              |
| Backup verification    | Manual                     | Automated (`verify` jobs)      |
| Bandwidth efficiency   | Full transfer each time    | Changed data only              |
| Garbage collection     | N/A                        | Automatic unused chunk cleanup |
| Tape backup            | No                         | Yes (tape media pool support)  |
| Third-party plugins    | No                         | Yes (PVE 8.4+ backup API)      |

### PBS Architecture

PBS uses **content-addressable storage** — data is split into fixed-size chunks, each identified by its hash. Identical
chunks across any backup (same VM, different VMs, different times) are stored only once.

**Result:** After the initial full backup, subsequent backups transfer and store only changed chunks. Storage usage
grows proportionally to actual data change rate, not backup count.

### Datastore Configuration

```bash
# Create a datastore
proxmox-backup-manager datastore create mystore /mnt/backup-storage

# Configure garbage collection schedule
proxmox-backup-manager datastore update mystore --gc-schedule daily

# Configure verification schedule
proxmox-backup-manager datastore update mystore --verify-schedule weekly
```

### Encryption

PBS supports **client-side encryption** — data is encrypted before leaving the Proxmox VE node. The PBS server never
sees plaintext data.

- Generate an encryption key: `proxmox-backup-client key create --kdf scrypt`
- Store the key securely — losing the key means losing access to encrypted backups
- The master key can optionally be split with Shamir's Secret Sharing for key recovery

### Ransomware Protection

PBS provides architectural protection against ransomware that compromises the Proxmox VE host:

- **Restricted API access:** The PVE backup user/token can create backups and list snapshots but **cannot delete
  backups** on PBS
- **Separate admin credentials:** PBS admin access is separate from PVE access — compromising PVE does not grant PBS
  admin rights
- **Verification jobs:** PBS can verify backup integrity independently of PVE
- **Immutable backups:** Configure datastore namespaces with delete restrictions

### Third-Party Backup API (PVE 8.4+)

PVE 8.4 introduces an official **backup plugin API** that allows external backup providers to integrate directly into
the Proxmox UI and backup framework. Third-party solutions can register as backup plugins, enabling backup and restore
operations through the same interface as native PBS — including scheduling, verification, and management features. This
gives administrators flexibility to use non-Proxmox backup services with first-class integration.

### Connecting PVE to PBS

Add PBS as a storage in PVE:

```
pvesm add pbs pbs-store \
  --server 10.0.0.50 \
  --datastore mystore \
  --username backup@pbs!automation \
  --password <token-secret> \
  --fingerprint <server-fingerprint>
```

## Backup Best Practices

- **Test restores regularly.** A backup that cannot be restored is worthless. Schedule quarterly restore tests.
- **Follow the 3-2-1 rule:** 3 copies of data, on 2 different media types, with 1 off-site. PBS + local directory +
  off-site PBS replication satisfies this.
- **Use PBS for production.** Directory/NFS backups lack deduplication, incrementals, and verification. They are
  acceptable only for lab environments.
- **Separate backup storage.** Never store backups on the same physical disks as production data.
- **Monitor backup jobs.** Enable email notifications and regularly check backup job status. A silently failing backup
  is worse than no backup.
- **Document the restore procedure.** Include: where backups are stored, credentials needed, the exact restore commands,
  expected recovery time.
- **Encrypt off-site backups.** Any backup leaving your physical control must be encrypted with keys you manage.
