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
- For Docker workloads, prefer running Docker inside an **unprivileged LXC** with `nesting=1` and `keyctl=1` features
  enabled, or inside a VM for full isolation

### Choosing Between VM and LXC

| Criterion                                 | VM                 | LXC                     |
| ----------------------------------------- | ------------------ | ----------------------- |
| Need non-Linux OS                         | Yes                | No                      |
| Need GPU passthrough                      | Yes                | Limited (since PVE 8.2) |
| Need full isolation (untrusted workloads) | Yes                | No                      |
| Need maximum density (many instances)     | No                 | Yes                     |
| Need near-native I/O performance          | Good (with VirtIO) | Best                    |
| Need live migration                       | Yes                | No                      |
| Need kernel customization                 | Yes                | No                      |

**Default to LXC** for trusted Linux workloads. **Use VMs** when you need full isolation, non-Linux guests, PCIe
passthrough, or live migration.

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
