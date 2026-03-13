# Virtual Machine Management

## Prerequisites

### Hardware Requirements

- CPU with Intel VT-x/VT-d or AMD-v/AMD-Vi (IOMMU) support
- IOMMU enabled in motherboard BIOS
- GPU compatible with passthrough (for GPU passthrough scenarios)
- Motherboard with proper PCIe device isolation

### Required Shares

- `isos`: stores OS installation ISOs and VirtIO driver ISOs
- `domains`: stores virtual disk images (vdisks)

## VM Creation

1. VMs tab > Add VM
2. Select template: Custom or predefined OS template
3. Configure: name, CPU cores, RAM, OS install ISO
4. Primary vDisk: location (cache pool recommended), size, type
5. Graphics: VNC (remote) or physical GPU (passthrough)
6. Optional: sound card, USB devices

### BIOS Types

| Type | Use Case |
|------|----------|
| SeaBIOS | Legacy operating systems |
| OVMF (UEFI) | Windows 8+, modern Linux, GPU passthrough (required) |

BIOS type can only be set at VM creation time.

### Machine Types

| Type | Use Case |
|------|----------|
| i440fx | Default for Windows VMs |
| Q35 | Default for Linux, recommended for GPU passthrough |

### vDisk Types

| Type | Characteristics |
|------|----------------|
| RAW | Best performance, no snapshot support |
| QCOW2 | Supports snapshots, slightly lower performance |

### Windows VM Configuration

| Windows Edition | Recommended BIOS | Machine Type | Notes |
|-----------------|-------------------|--------------|-------|
| Windows 11 | OVMF | Q35 | Requires TPM 2.0 emulation |
| Windows Server 2022 | OVMF | Q35 | Ideal for enterprise workloads |
| Windows 10 | OVMF | Q35 | Deprecated (EOL Oct 2025) |
| Windows Server 2019 | OVMF | i440fx | Compatible but not recommended |

## GPU Passthrough

Assigns a physical GPU to a VM for near-native graphics performance.

### Setup Process

1. Enable IOMMU (VT-d / AMD-Vi) in BIOS
2. Bind GPU to vfio-pci driver: Tools > System Devices > check device > Bind Selected
   to VFIO at Boot > reboot
3. Also bind the GPU's associated audio device
4. In VM settings: select bound GPU under Graphics Card
5. Assign USB keyboard/mouse to VM
6. Use OVMF BIOS

### IOMMU Group Risks

On consumer motherboards, the GPU may share an IOMMU group with the main chipset
or storage controllers. This is a significant Unraid-specific risk:

- **The problem**: if the GPU shares a group with the SATA/SAS controller, assigning
  the GPU to a VM strips the host of disk access, making the Unraid server useless
- **ACS Override**: splits groups artificially via Settings > VM Manager > PCIe ACS
  override (set to "Downstream" or "Both"). **Security risk**: bypasses hardware
  isolation. Guest OS virtual address space can overlap with host device addresses,
  causing data corruption if guest USB transactions hit the host SATA controller
- **When to use ACS Override**: only when you understand the isolation risks and have
  verified that the affected devices do not share address space
- **Safer alternative**: use a motherboard with proper PCIe isolation, or add a
  dedicated PCIe controller in its own IOMMU group

### IOMMU Troubleshooting

- **Unsafe interrupts**: edit syslinux.cfg on flash drive:
  `append vfio_iommu_type1.allow_unsafe_interrupts=1` (only if you trust VM guests)
- After hardware changes, verify bindings in Tools > System Devices
- To reset all bindings: delete `/boot/config/vfio-pci.cfg` and reboot
- If previously using VFIO-PCI Config plugin: uninstall it -- functionality is now
  integrated into Unraid OS

### Manual ROM Injection (Last Resort)

For GPUs that show black screen after passthrough:

1. Download GPU ROM from TechPowerUp VGA BIOS database
2. Store in `isos` or `domains` share
3. Edit VM XML: add `<rom file='/mnt/user/isos/gpu_roms/your_gpu.rom'/>` inside the
   GPU's `<hostdev>` block

Primary GPU passthrough frequently requires vBIOS because the host BIOS has already
claimed the card during boot.

### Black Screen Troubleshooting

1. Set primary graphics to iGPU in motherboard BIOS (not the passthrough GPU)
2. Update motherboard and GPU BIOS to latest versions
3. Switch from SeaBIOS to OVMF (UEFI)
4. Change Machine Type from i440fx to Q35
5. Manual ROM injection (last resort)

## GPU Sharing (Unraid 7+)

- **VirGL**: share Intel/AMD GPUs among Linux VMs. Set Graphics > Virtual,
  VM console video driver > VirtIO(3D). No physical monitor output.
  Incompatible with Windows VMs and standard Nvidia plugins
- **QXL**: multi-screen support with configurable video memory.
  Set Graphics > Virtual, VM console video driver > QXL (best)
- **SR-IOV**: efficient Intel iGPU passthrough across multiple VMs.
  Native support added in Unraid 7.0 VM Manager

## Performance Tuning

### CPU Configuration

- **CPU mode**: Host passthrough (max performance) vs Emulated (better compatibility)
- **CPU pinning**: assign dedicated cores to VMs. Avoid core 0 (used by Unraid).
  Pin related IOThreads to adjacent cores
- **Hyper-V extensions**: enable for Windows VMs (improved compatibility/performance)
- **Hypervclock**: time synchronization for Windows VMs

### I/O Optimization

- **IOThreads**: enable VirtIO IOThreads to reduce I/O latency by up to 20%.
  Dedicates a host thread to handle virtual I/O queues
- **virtio-blk vs virtio-scsi**: use virtio-blk for best performance, virtio-scsi
  for many disks or full SCSI support (unmap, write same, passthrough)
- **NUMA pinning**: place vCPU, IOThreads, and virtual memory on the same NUMA node
  as the host storage controller. Provides 5%+ IOPS improvement on multi-socket systems

### VirtIO Drivers

Windows requires paravirtualized drivers for optimal performance:

- Set default VirtIO ISO path in Settings > VM Manager
- ISO auto-attaches as virtual CD-ROM when creating Windows VMs
- During Windows setup: load drivers from VirtIO ISO when prompted for storage
- After install: update remaining drivers via Device Manager > Update driver > Browse
  to VirtIO ISO drive
- Download latest stable VirtIO drivers ISO and verify with CHECKSUM file

### QEMU Guest Agent

Install in Windows VMs for advanced host-guest communication:

- Enables graceful shutdown/hibernation from Unraid (critical for UPS integration)
- Provides live statistics reporting
- Install from VirtIO drivers ISO: guest-agent folder > `qemu-ga-x64.msi`

## Snapshots (Unraid 7+)

Snapshots save VM state at a point in time using QCOW2 overlay files.

### Creating Snapshots

1. VMs page > expand VM details > Snapshots > Create Snapshot
2. Enter descriptive name (e.g., "Before Windows Update")
3. Memory dump option: checked = full live state (larger, slower); unchecked =
   disk-only crash-consistent (faster, smaller)

### Managing Snapshots

- **Revert**: restore to snapshot state (loses subsequent changes)
- **Block Commit**: merge overlay changes into original disk permanently
- **Block Pull**: flatten snapshot chain
- Snapshots stored alongside VM files on cache pools or array
- Metadata in `/etc/libvirt/qemu/snapshotdb/VM_name/`

### Best Practices

- Create snapshots before significant changes (updates, software installs)
- Use descriptive names
- Delete old snapshots to reclaim storage
- Snapshots are not a backup replacement

## VM Templates (Unraid 7.1+)

- Save custom VM configurations as reusable templates
- Create: Edit VM > Create/Modify template > enter name
- Use: Add VM > select from User Templates section
- Export/import templates between Unraid systems

## Cloning

Duplicate existing VMs for development or testing. Available via VM context menu.

## Advanced Options

- **Memory ballooning**: dynamic RAM allocation (not available with PCI passthrough)
- **VirtFS (9p) shares**: file system sharing between host and Linux guest
- **QEMU command-line passthrough**: custom QEMU arguments for expert tuning
- **evdev passthrough**: improved peripheral management
- **Inline XML view**: preview how GUI changes affect underlying VM configuration

## macOS VMs

Community-supported via OpenCore or custom XML configurations. Requires:
- Compatible AMD or Intel CPU
- Careful XML editing for CPU topology and device passthrough
- Community guides (e.g., macOS Sonoma walkthrough on r/unRAID)
- Not officially supported by Unraid or Apple

## VM Backup Strategy

- Back up VM XML configurations and OVMF NVRAM files via User Scripts
- Script available in the awesome-unraid-user-scripts collection
- Use VM Backup plugin for automated VM state + config backups
- Consider snapshots for quick recovery, proper backups for disaster recovery
- Back up to scratch drive (Unassigned Devices) for speed, then sync to array/offsite
