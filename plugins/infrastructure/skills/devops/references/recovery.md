# Backup and Recovery

A backup is proven by a timed restore and by nothing else. What each backup method captures, what it skips, and what the
recovery depends on that the backup does not contain.

## Databases

- **A filesystem copy of a running PostgreSQL cluster is not a backup.** The server must be shut down; refusing
  connections is not enough, because `tar` takes no atomic snapshot and the server buffers internally. Per-table or
  per-database file restores are impossible (`pg_xact` makes the cluster one unit). If data and WAL, or tablespaces,
  span filesystems, snapshots must be simultaneous. Valid: `pg_dump`, a base backup under continuous archiving, or an
  atomic frozen snapshot of the whole data directory (the server replays WAL on start).
- **MySQL and MariaDB file copies are invalid with InnoDB** unless the server is stopped; InnoDB keeps modified pages in
  memory. `mysqldump --single-transaction` is the online path for InnoDB. An LVM snapshot without quiescing is
  equivalent to a power failure and risks torn pages.
- **SQLite** is copied online with `.backup` or `VACUUM INTO`, which produce a consistent snapshot; a plain file copy of
  a database with a live WAL is not one.
- **`pg_upgrade --link` leaves no old cluster to fall back to** once the new one starts; the backup taken before the
  upgrade is the only reverse.

## Filesystems and hosts

- **ZFS snapshots are atomic**, and `zfs snapshot -r` takes every dataset at the same instant. A snapshot of a database
  dataset is crash-consistent, not application-consistent; freeze or use the engine's tool for the latter.
- **restic** preserves permissions, ownership, and modification time; stores symlinks as symlinks and device files as
  nodes; descends into bind mounts unless `--one-file-system`. It does not save atime by default, nor Unix creation
  dates or inode flags. A file changed during the backup is stored as read.
- **Borg** stores xattrs, ACLs, flags, and hard links by default, supports sparse files, and flags a file that changed
  during backup with status `C`. It does not store Unix sockets or btrfs `NOCOW`, and hard links to symlinks lose the
  link.
- **Neither restic nor Borg coordinates with an application.** A database file inside a restic or Borg snapshot has the
  consistency of a power cut. Pre-backup hooks (engine dump, filesystem freeze, ZFS snapshot) are the operator's
  responsibility.

## Virtual machines and containers (Proxmox VE)

- **vzdump modes**: `stop` shuts the guest down and gives the highest consistency; `suspend` exists for compatibility
  and adds downtime without improving consistency; `snapshot` copies blocks while the VM runs at "a small inconsistency
  risk", improved by the guest agent's `fs-freeze` and `fs-thaw`, which quiesce the filesystem and not the application.
  Container `snapshot` mode suspends the container briefly to snapshot its volumes.
- **`proxmox-backup-client` skips mount points** by default; every filesystem to include needs `--include-dev`. The
  message is `skip mount point`, not an error.
- **A VM backup is disk and configuration.** It is not the running memory state, and a database inside it restores at
  the consistency of the mode above.

## Unraid

- **Parity protects against a failed disk, not against deletion, corruption, or ransomware**; a deleted file is deleted
  on parity too. Parity is not a backup and does not count toward any copy.
- **A New Config resets the array and invalidates parity**; the array is unprotected until the sync completes, and the
  history a rebuild needs is cleared. Move data off a disk before removing it.

## State, secrets, and the recovery graph

- **Terraform and OpenTofu state is recovery-critical.** Losing it makes the planner propose creating everything;
  substituting an old one makes it propose destroying what it does not know. Keep state in a versioned, locked remote
  backend, and treat a restore of state as a change to be planned and refreshed, never applied blind.
- **The keys to the backup are part of the backup dependency graph**: repository passwords, age identities, KMS access,
  object-store credentials, database keys, ACME account keys. A backup whose key lived only on the failed host is
  unreadable. Store the keys under a different failure domain and a different credential than the data.
- **A credential that can delete the backup is part of the blast radius.** The April 2026 PocketOS deletion took the
  production volume and the backups stored on it in one API call. Immutability (object lock, retention policy,
  append-only repository) is what stops the same automation, or the same attacker, from deleting the copy. 3-2-1 (Peter
  Krogh, cited by US-CERT in 2012: three copies, two media, one off-site) is extended by 3-2-1-1-0 (Veeam): one copy
  immutable or offline, zero errors on automated verification.
- **Recovery order is a dependency graph.** Identity and secrets, then network and DNS, then storage and state, then
  databases, then control planes, then workloads. Google's 2024 GCVE deletion showed that retained data copies do not
  rebuild the network, security, and application layers around them; the customer's private cloud was reconstructed
  layer by layer with the backups intact the whole time.
- **A restore is timed and its result is opened.** The deliverable records the backup identifier, the restore target,
  the elapsed time, and the application-level check that passed against the restored copy. Reddit's 2023 Kubernetes
  outage met a restore procedure "written several years ago" that "hadn't been kept fully up to date" and had never been
  run against production. A daily automated restore test is what operators adopt after a loss; adopt it before.

## Before a destructive change

- Take the backup with the method above that matches the data, verify it opens, record where it is and which key reads
  it, and confirm the credential performing the change cannot delete it.
- If any of those four is missing, the change is not ready. The GCVE deletion had a year of warning that nobody could
  see because the deletion was system-triggered and sent no notification; the DataTalks.Club destruction was survivable
  only because AWS Support found a snapshot the customer's console no longer showed.
