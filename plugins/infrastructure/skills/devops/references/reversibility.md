# What a Revert Reverses

A code revert re-applies the previous declaration forward. It restores what a tool can recreate from a declaration and
nothing else. Per change type: whether the reverse exists, what it costs, and what must be captured before apply.

## Emitted side effects

- **A revert stops new damage; it does not undo emitted state.** Route announcements, notifications, issued credentials,
  deleted objects, and data mutations stay where the forward change left them. Cloudflare's 2026-02-20 incident withdrew
  customer prefixes through an API call with an empty filter; reverting the code stopped further deletion and every
  withdrawn prefix had to be reconstructed by hand over six hours.
- **The reverse path can carry a defect the forward path never exercised.** GitHub's 2024-03-11 rollback failed in one
  datacenter because system-created records lacked a field the rollback required. A rollback that was never run against
  production-shaped objects is a description, not a capability.
- Capture before apply: the list of external objects the change will touch, their current values, and the exact inverse
  operation for each.

## Destroyed resources

- **Re-applying the old code creates a new object, not the old one.** New identifiers, new addresses, no data. State
  stores the binding between declaration and remote object; once the object is gone the binding is gone.
- **`prevent_destroy` rejects a plan that would destroy the object; it does nothing when the resource block is removed
  from the configuration.** The guard fires at plan time or not at all. Deletion protection on the resource itself (a
  database flag, a bucket lock, a Proxmox `protection` flag) is the layer that survives a removed block.
- **A one-character change to a `ForceNew` attribute is a destroy and create.** The plan marks it
  `# forces replacement`; a revert triggers a second replacement, not a restoration. `create_before_destroy` helps where
  the remote type allows two objects with the same identity; many do not.
- **A `moved` block renames without destroying**; a `removed` block (Terraform 1.7, OpenTofu 1.7) drops an object from
  state with `destroy = false` and is plannable, unlike `terraform state rm`. Use them for refactors so the plan shows a
  move, not a destroy and create pair.
- Capture before apply: a reviewed plan with destroy and replace counts, a state backup, and a data backup that does not
  live inside the resource being destroyed.

## Stale or substituted state

- **A plan is a projection of one state at one moment.** GitLab applied a three-week-old Terraform plan on 2023-07-07;
  drift in the meantime turned it into a plan that destroyed 617 resources and replaced production services. A missing
  state file makes `plan` propose creating everything; a state file copied in later makes `destroy` look like the clean
  option, which is how an agent destroyed a production VPC, RDS, and ECS cluster in February 2026.
- **Restoring an old state file makes state lie about reality.** Reconcile with `terraform apply -refresh-only` and a
  fresh plan; never apply a plan older than the last change to the target.
- Capture before apply: the plan's generation time, the state serial, and the backend or workspace it came from.

## Data and schema

- **A migration is not reversed by reverting application code.** Every schema change is its own versioned migration; a
  destructive one (drop, rewrite, lossy transform) is irreversible once the old representation is discarded.
- **Expand, then contract.** Add the new column or table, ship code that reads both shapes, backfill, cut over, and only
  then remove the old shape. A code revert survives the expand step alone. Sadalage and Fowler reject automatic rollback
  migrations as not cost-effective and rely on this transition phase instead.
- **A filesystem copy of a running database is not a backup** (see [`${CLAUDE_SKILL_DIR}/references/recovery.md`]).
- Capture before apply: a restorable backup taken with the engine's own tool or an atomic snapshot, the migration
  version, and the compatibility window during which both shapes are valid.

## Secrets and keys

- **Rotating a credential changes the issuer and the consumer; a revert of the config restores neither.** The old value
  is valid only while the issuer still accepts it. AWS Secrets Manager keeps the previous version under `AWSPREVIOUS`
  and moving `AWSCURRENT` back is the rollback; a version that loses its last label is deprecated and can be deleted.
- **A revoked or compromised credential must not come back**; the reverse of a rotation done for cause is a second
  rotation.
- Capture before apply: the previous version identifier, every consumer of the credential, and an overlap window in
  which both old and new are accepted.

## Certificates

- **Issuance cannot be undone.** Revocation and replacement are new PKI events; Certificate Transparency keeps the
  record. Re-issuing spends rate limit: Let's Encrypt allows 5 certificates per exact identifier set per 7 days with no
  override, and 50 per registered domain per 7 days. ARI-driven renewals are exempt from every limit.
- Capture before apply: the current key and certificate files, so a rollback re-serves them rather than re-issues.

## DNS

- **The reverse is instant at the authoritative server and slow everywhere else.** The revert is itself subject to the
  TTL the record carried when it was cached, and a name queried before it existed is negatively cached for up to the
  SOA-derived negative TTL.
- Capture before apply: the previous record set, and a TTL lowered one old-TTL period ahead.

## Storage

- **Growth is one-way in practice.** `lvreduce` destroys data in the removed extents unless the filesystem was shrunk
  first; ext4 grows online and shrinks only unmounted; XFS cannot shrink beyond trimming the last allocation group.
- **`zpool upgrade` is one-way**: the pool stops importing on systems without the enabled features; the reverse is a
  send and receive into a new pool. Setting the pool's `compatibility` property prevents the upgrade. Removing a
  top-level vdev evacuates it and is impossible on raidz or draid pools.
- **An Unraid array change resets the array configuration and invalidates parity**; the data is unprotected until the
  parity sync completes, and the array history a rebuild needs is cleared.
- Capture before apply: a backup independent of the volume, used-space figures, and the shrink or import support of
  every system that will touch the volume.

## Identifiers and addresses

- **A changed name, address, ID, or port outlives the declaration in every consumer that copied it**: clients, ACLs,
  allowlists, certificates, caches, monitoring targets, and the state of other tools. The reverse cost is proportional
  to that fan-out.
- Capture before apply: the consumers of the identifier and the previous value.

## Version upgrades with on-disk or API format changes

- **`pg_upgrade --link` makes the old cluster unusable the moment the new one starts**; the old cluster then exists only
  as a backup. Clone mode or a copy first keeps the reverse.
- **A Kubernetes CRD version cannot be removed while objects are stored in it** (`status.storedVersions`), and a
  storage-version change does not rewrite existing objects. A revert of the CRD manifest migrates nothing back.
- **Control-plane versions move one minor at a time and do not move back.** kube-apiserver must not skip minors; kubelet
  may lag by up to three minors and never lead. Reddit's 2023 Kubernetes upgrade found a label its route reflectors
  selected on removed by the new version, with no supported downgrade and a restore procedure written for a version two
  releases old.
- **A package upgrade that migrates an on-disk format is reversible only if the vendor documents a downgrade.** Read
  that page before apply; absence means no.
- Capture before apply: an etcd or database snapshot, the old binaries or images, and the documented downgrade path or
  the statement that none exists.

## Configuration management versus provisioning

- **Ansible has no state to revert to.** Reverting the playbook re-runs forward; a removed task is a task that no longer
  runs, and what it created stays. The reverse of a change is written as its own converging task (`state: absent`, the
  previous file content, the previous service state) and tested like the forward one.
- **Terraform and OpenTofu state carries the previous shape, never the previous data.** A revert plans forward from the
  current state; where that plan is a replacement, the data in the destroyed object is gone.

## Not reversible by any code path

- Firmware and bootloader updates, hardware fuses, pool feature flags, deleted backups, and rotated-for-cause
  credentials. A change in this class is applied only with an out-of-band path back (console, recovery media, alternate
  boot slot) verified before the change.
