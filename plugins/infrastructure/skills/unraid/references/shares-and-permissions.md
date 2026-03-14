# Shares and Permissions

## Share Types

### User Shares

Aggregated view of top-level folders across cache and array drives:

- Accessible under `/mnt/user/` (combines files from array and pools)
- Share name = folder name
- Files appear merged but remain on individual physical drives
- Created via Shares tab > Add Share

### Disk Shares

Direct access to individual drives or pools:

- Individual drives: `/mnt/diskX` (e.g., `/mnt/disk1`)
- Pools: `/mnt/pool-name` (e.g., `/mnt/cache`)
- Disabled by default -- enable via Settings > Global Share Settings
- Set to Private with user access permissions

### Critical Rule

**Never copy files between user shares and disk shares** with matching folder names. Both views point to the same
underlying files -- `cp` and `rsync` cannot distinguish them, leading to corruption or data loss.

Safe practices:

- Copy only between user shares OR only between disk shares
- Use `rsync -c` to verify copies
- Use Unassigned Devices plugin for external drives (mount at `/mnt/disks/`)

## Default Shares

Created automatically when Docker or VM Manager starts:

- `appdata` — Docker container working files (one subfolder per container)
- `system` — Docker `docker.img` and VM XML templates
- `domains` — VM virtual disk images (vdisks)
- `isos` — OS installation ISOs for VMs

Do not change permissions on `appdata`, `system`, or `domains`. The `isos` share can be made network-accessible for
adding ISO files.

## Creating Shares

1. Shares tab > Add Share
2. Configure: name, comments, minimum free space
3. Primary storage: cache, array, or named pool
4. Secondary storage: overflow/final destination after mover runs
5. Allocation method: High-Water (default), Most-Free, or Fill-Up
6. Split level: controls folder distribution across disks
7. Included/excluded disks (mutually exclusive)
8. Mover action: direction of data movement

**New shares are not network-visible by default** -- configure SMB/NFS export after creation. Export options:

- **Yes**: visible in network browse lists and accessible
- **Yes (Hidden)**: not visible in browse lists, accessible by exact name
- **No**: completely hidden and inaccessible via that protocol

Use "Yes (Hidden)" for shares that authorized users need but should not be discoverable by network scanning.

## SMB Security Levels

- **Public** — Read: everyone, Write: everyone. Non-sensitive shared media
- **Secure** — Read: everyone, Write: authorized users. Collaborative project folders
- **Private** — Read: authorized users, Write: authorized users. Sensitive data, personal documents

### Windows SMB Considerations

- Windows 10 1709+ blocks Public (guest) SMB shares by default
- Best practice: always use user accounts with passwords
- Windows allows only one credential set per server -- use server name for one share and IP address for another as a
  workaround

## NFS Configuration

- NFS 4.1 and 4.2 supported (Unraid 7+)
- Configure per-share in Shares tab > share settings > NFS section
- Export settings: Yes, Yes (Hidden), or No
- Used primarily by Linux clients and some media devices

## User Access Control

- Root user is for system administration only -- cannot access network shares
- Create dedicated user accounts for network share access
- Assign Read-only or Read/Write per user per share
- Regularly review permissions and remove unused accounts

### Principle of Least Privilege

- Grant minimum access necessary for each user's tasks
- Set sensitive shares to Private
- If Public share is necessary, set to Read-only
- Only grant write access to authorized users with strong passwords

## Flash Device Share

The flash device at `/boot` contains system configuration:

- Only expose over SMB if absolutely necessary
- Always set to Private with strong password
- Disable when not in use
