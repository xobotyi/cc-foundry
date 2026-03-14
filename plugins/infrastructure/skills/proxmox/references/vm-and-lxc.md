# VM and LXC Container Management

## Virtualization Types

Proxmox VE supports two virtualization technologies: **KVM virtual machines** (full virtualization) and **LXC
containers** (OS-level virtualization). Each serves different use cases with distinct trade-offs.

### KVM Virtual Machines

VMs emulate a complete physical computer with dedicated virtual hardware. Each VM runs its own kernel, providing full
isolation from the host and other guests.

- **Isolation** — full hardware-level isolation; separate kernel
- **Overhead** — higher; hypervisor layer, dedicated RAM allocation
- **Guest OS** — any OS (Linux, Windows, FreeBSD, etc.)
- **Migration** — live migration supported (except with PCIe passthrough)
- **Use cases** — untrusted workloads, non-Linux OS, GPU passthrough, full isolation

**Configuration best practices:**

- Use **VirtIO** drivers for disk (`virtio-scsi-pci`) and network (`virtio`) — they provide near-native performance vs.
  emulated IDE/E1000
- Enable **QEMU Guest Agent** (`qemu-guest-agent` package inside VM) for proper shutdown, freeze/thaw for snapshots, and
  IP reporting
- Use **OVMF (UEFI)** firmware with **Q35 machine type** for modern features (PCIe passthrough, Secure Boot support)
- Set **CPU type to `host`** for maximum performance when live migration between different CPU generations is not needed
- Use **ballooning** for dynamic memory management — set minimum memory below maximum to allow the hypervisor to reclaim
  unused RAM
- Enable **NUMA** topology for VMs with many cores on multi-socket hosts

### LXC Containers

Containers share the host kernel and provide lightweight, near-native performance isolation using Linux namespaces and
cgroups.

- **Isolation** — namespace/cgroup isolation; shared kernel
- **Overhead** — minimal; no hypervisor layer, shared kernel
- **Guest OS** — Linux only (must be compatible with host kernel)
- **Migration** — offline migration only (restart required)
- **Use cases** — Linux services, high-density deployments, system containers

**Configuration best practices:**

- Use **unprivileged containers** (default) — they map container root (UID 0) to a non-privileged host UID (e.g.,
  100000), preventing container escape attacks
- Only use **privileged containers** when unprivileged mode is incompatible with the workload (e.g., certain NFS mounts,
  specific device access)
- Use **bind mounts** for sharing host directories into containers rather than NFS/CIFS mounts inside the container
- Set **memory limits** explicitly — containers without limits can consume all host RAM
- Enable **nesting** (`features: nesting=1`) only when running containers inside containers (e.g., Docker inside LXC)
- For Docker workloads, prefer: **(1)** a dedicated Docker VM (most compatible), **(2)** native OCI containers for
  single-service apps (PVE 9.1+), or **(3)** Docker inside an unprivileged LXC with `nesting=1` and `keyctl=1` — but
  note this is **unsupported** by Proxmox and can break on host updates
- **Docker-in-LXC breakage risk:** CVE-2025-52881 (containerd patch) broke Docker in all LXC containers — workaround
  requires setting `lxc.apparmor.profile: unconfined`, which weakens security. If using Docker-in-LXC, put Docker data
  on a **separate mount point** so the container OS is disposable and data persists across rebuilds

### Choosing Between VM, LXC, and OCI Containers

| Criterion                                 | VM                 | LXC                     | OCI Container (9.1)   |
| ----------------------------------------- | ------------------ | ----------------------- | --------------------- |
| Need non-Linux OS                         | Yes                | No                      | No                    |
| Need GPU passthrough                      | Yes                | Limited (since PVE 8.2) | No                    |
| Need full isolation (untrusted workloads) | Yes                | No                      | No                    |
| Need maximum density (many instances)     | No                 | Yes                     | Yes                   |
| Need near-native I/O performance          | Good (with VirtIO) | Best                    | Best (shared kernel)  |
| Need live migration                       | Yes                | No                      | No                    |
| Need kernel customization                 | Yes                | No                      | No                    |
| Need Docker Compose / orchestration       | Yes (Docker VM)    | Possible (unsupported)  | No                    |
| Deploy from Docker Hub images             | Via Docker in VM   | Manual conversion       | Native (pull and run) |

**Default to LXC** for trusted Linux workloads. **Use VMs** when you need full isolation, non-Linux guests, PCIe
passthrough, or live migration. **Use OCI containers** (PVE 9.1+) for single-purpose microservices from OCI registries.
**Use a Docker VM** for multi-container stacks requiring Docker Compose or orchestration.

## Template Management

### VM Templates

1. Create a base VM with desired OS, packages, and configuration
2. Install `qemu-guest-agent` and `cloud-init` (if using cloud-init)
3. Remove machine-specific data (SSH host keys, machine-id)
4. Convert to template: `qm template <vmid>`
5. Deploy via **linked clone** (fast, shares base disk) or **full clone** (independent copy)

### Container Templates

- Download official templates from Proxmox template repository via the GUI or:
  ```
  pveam update
  pveam available
  pveam download local <template-name>
  ```
- Create custom templates by configuring a container, then backing it up as a `.tar.gz` template

### Linked vs Full Clone

| Type         | Disk usage              | Performance                  | Independence             |
| ------------ | ----------------------- | ---------------------------- | ------------------------ |
| Linked clone | Low (CoW from template) | Slightly lower (shared base) | Depends on template disk |
| Full clone   | Full copy               | Native                       | Fully independent        |

Use **linked clones** for ephemeral or development workloads. Use **full clones** for production workloads that need
independence from the template.

## OCI Application Containers (PVE 9.1 — Technology Preview)

PVE 9.1 introduces native support for OCI (Open Container Initiative) images — the same format used by Docker Hub. This
bridges the gap between traditional LXC system containers and Docker application containers.

### How It Works

1. **Pull from OCI Registry** — a button in the storage interface (CT Templates section) downloads images from Docker
   Hub, GHCR, Quay, Harbor, or private registries using standard references (e.g.,
   `registry.hub.docker.com/library/nginx`)
2. **Layer squashing** — PVE merges all OCI image layers into a single rootfs, creating an LXC-compatible template
3. **Container creation** — the OCI template is used like any other LXC template via the Create CT wizard
4. **Host-managed DHCP** — application containers without a traditional network stack get automatic DHCP via the host

### Capabilities

- Managed as native Proxmox objects — snapshots, backups, permissions, storage, SDN all apply
- Compatible with any OCI-compliant registry
- Lower overhead than a Docker VM — shared kernel, no hypervisor layer
- More secure than running Docker directly on the PVE host

### Limitations

- **No in-place updates** — layers are squashed at creation; to update, recreate the container with the newer image and
  remap data volumes. The Proxmox team plans to add update support in a future release
- **No Docker Compose** — each OCI container is a single service; multi-container stacks require a Docker VM
- **No shell in most containers** — the console shows stdout of the main process, not a login shell
- **No orchestration** — no Swarm, no Kubernetes; for orchestrated workloads, use a Docker VM
- **Technology Preview** — not yet GA; expect rough edges

### When to Use OCI Containers

- Single-purpose microservices: monitoring agents, reverse proxies, small databases, dashboards
- Quick deployments from Docker Hub without spinning up a Docker VM
- Reducing VM sprawl for lightweight, single-container workloads
- Environments where installing Docker/Podman is undesirable

## Docker on Proxmox — Decision Guide

| Method                        | Best For                                          | Trade-offs                                                        |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Docker VM**                 | Multi-container stacks, Compose, Kubernetes, prod | Higher resource overhead (full OS), but full Docker compatibility |
| **OCI Container (PVE 9.1+)**  | Single-service apps from Docker Hub               | No Compose, no in-place updates, tech preview                     |
| **Docker in LXC**             | Low-overhead Docker when risks are acceptable     | Unsupported, breaks on host updates, security trade-offs          |
| **Never: Docker on PVE host** | —                                                 | Conflicts with PVE networking/storage, complicates updates        |

**Docker VM best practices:**

- Use Debian or Ubuntu Server as the base OS
- Install `qemu-guest-agent` for integration and stats reporting
- Use VirtIO network adapters
- Create a **dedicated disk** for Docker volumes (mounted to `/opt/docker` or `/srv/docker`) — separates app data from
  OS, simplifies backups and migrations
- Back up volumes via Proxmox Backup Server or rsync/restic on the dedicated disk
