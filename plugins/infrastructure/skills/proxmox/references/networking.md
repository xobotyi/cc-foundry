# Networking

Proxmox VE networking connects guests to each other and external networks via Linux bridges, VLANs, bonds, and
Software-Defined Networking (SDN). Network configuration is defined in `/etc/network/interfaces` and applied with
`ifreload -a`.

## Network Model

Every Proxmox node has at least one Linux bridge (`vmbr0`) connecting guest virtual NICs to a physical NIC. Guests
attach to bridges, not directly to physical interfaces.

```
Physical NIC (eno1) --- Bridge (vmbr0) -+- VM 100 (virtio)
                                        +- VM 101 (virtio)
                                        +- CT 200 (veth)
```

## Linux Bridges

- **One bridge per network segment.** Create additional bridges for isolated networks or different VLANs.
- **VLAN-aware bridges** (recommended): A single bridge handles multiple VLANs via 802.1Q tagging, eliminating the need
  for separate bridges per VLAN. The VLAN-aware checkbox must be **explicitly enabled** — it is off by default.
  ```
  auto vmbr0
  iface vmbr0 inet static
      address 10.0.0.1/24
      bridge-ports eno1
      bridge-stp off
      bridge-fd 0
      bridge-vlan-aware yes
      bridge-vids 2-4094
  ```
- **Traditional bridges** (legacy): One bridge per VLAN, using VLAN sub-interfaces. More complex to manage at scale.

### OVS vs Linux Bridge

**Open vSwitch (OVS)** is an alternative to the native Linux bridge:

- Automatically VLAN-aware (no checkbox needed)
- Supports VXLAN and RSTP natively
- May resolve 10GbE+ throughput bottlenecks reported with native Linux bridge
- Preferred for complex SDN layouts

The native Linux bridge is simpler and adequate for most deployments. Consider OVS when hitting performance limits at
10GbE+ or needing advanced SDN features.

## VLANs

VLANs (802.1Q) segment network traffic at Layer 2 without additional physical cabling.

**Best practices:**

- Use **VLAN-aware bridges** — simpler than per-VLAN bridges, configured once
- Assign VLANs per guest in the VM/container network configuration (tag field)
- Place the **management interface on a dedicated VLAN** — never share the management network with guest traffic
- Use a **trunk port** on the physical switch connected to the Proxmox host, allowing all required VLAN tags — frames
  with unrecognized VLAN IDs are silently dropped
- Common VLAN layout: | VLAN | Purpose | |------|---------| | 1 (native) | Management / host access | | 10 |
  Server/infrastructure | | 20 | User/client network | | 30 | IoT/untrusted devices | | 50 | Storage (Ceph, NFS, iSCSI)
  | | 100 | DMZ / public-facing services |

**Troubleshooting VLANs:**

- Verify no mismatch between Proxmox VLAN tagging and switch native/untagged VLAN — mismatches cause double-tagging and
  dropped frames
- Ensure switch trunk allows all VLANs configured on the Proxmox side
- When moving management to a VLAN, verify bridge still allows management traffic before disconnecting

## Network Bonding

Bonding combines multiple physical NICs for redundancy and/or throughput.

- **`balance-rr` (0)** — round-robin; throughput (requires switch support)
- **`active-backup` (1)** — active-backup; redundancy without switch config
- **`balance-xor` (2)** — XOR; balanced with switch LAG
- **`802.3ad` (4)** — LACP; best throughput + redundancy (requires switch LACP)
- **`balance-alb` (6)** — adaptive load balancing; throughput without switch config

**Best practices:**

- Use **LACP (802.3ad)** when the switch supports it — best combination of redundancy and throughput
- Use **active-backup** when switch configuration is not possible
- Bond before bridging: `physical NICs -> bond -> bridge -> guests`
- Use separate bonds for different traffic types (management, storage, guest)

**Corosync bonding caveats:**

- **Avoid** `balance-rr`, `balance-xor`, `balance-tlb`, `balance-alb` for Corosync — these modes cause asymmetric
  connectivity when an interface fails but link state stays up, leading to mass fencing
- **LACP with fast rate:** If using 802.3ad for Corosync, set `bond-lacp-rate fast` on both node and switch. Default
  slow rate has 90s failover — HA fences after ~60s. Fast rate reduces failover to ~3 seconds
- **active-backup** is safest for Corosync but may not fail over if the backup link detection is delayed

## Software-Defined Networking (SDN)

SDN in Proxmox VE creates virtual network zones that span the cluster without requiring physical VLAN configuration on
switches.

### Zones

- **Simple** — L2, Linux bridge; single-node isolated networks
- **VLAN** — L2, 802.1Q tags; multi-node with physical VLAN support
- **QinQ** — L2, double-tagged VLANs; stacking VLANs over existing infrastructure
- **VXLAN** — L2/L3, UDP overlay; multi-node without physical VLAN changes
- **EVPN** — L2/L3, BGP + VXLAN; advanced routing, multi-tenancy

### VNets

VNets are virtual networks within a zone. Each VNet gets a name and optional VLAN tag or VXLAN ID, and appears as a
bridge-like interface for guest assignment.

### SDN Configuration Gotchas

- **Staged changes:** SDN changes are **not live** — they are staged and require clicking **Apply** at the Datacenter
  level to take effect cluster-wide
- **VXLAN MTU:** VXLAN encapsulation adds a 50-byte header. Set VNet MTU to **1450** (default auto setting). With IPSEC
  encryption, reduce to **1370** (IPv4: -60 bytes, IPv6: -80 bytes). The physical network MTU must accommodate the
  overhead — if physical MTU is 1500, VNet MTU must be 1450 or lower
- **DHCP prerequisite:** Automatic DHCP within an SDN VNet requires a **gateway** configured on the subnet — without it,
  DHCP silently fails
- **Multiple EVPN exit nodes:** Asymmetric routing causes Linux to drop packets. Disable reverse path filtering:
  ```
  # /etc/sysctl.conf (or /etc/sysctl.d/zzz-network.conf)
  net.ipv4.conf.all.rp_filter=0
  net.ipv4.conf.default.rp_filter=0
  ```
  Note: `default` must be set before interfaces are created (use a `zzz-` prefix sysctl file to ensure late loading)

### PVE 9.0: Fabrics

PVE 9.0 introduces **Fabrics** — automated routing between cluster nodes using FRRouting (FRR) with OpenFabric
(IS-IS-based, optimized for spine-leaf topologies) or OSPF. Fabrics simplify underlay network configuration for Ceph
full-mesh and EVPN/VXLAN zone deployments.

### SDN Best Practices

- Use **VXLAN zones** for overlay networking across nodes without switch changes
- Use **EVPN** for advanced multi-tenant setups with BGP routing
- Apply SDN configuration changes via the GUI or `pvesh` — changes require explicit "Apply" to take effect cluster-wide
- Use SDN for tenant isolation in multi-tenant environments
- SDN is ideal when physical switch VLAN configuration is impractical or impossible

## Dedicated Networks

Separate traffic types onto dedicated networks for performance and security:

- **Management / Corosync** — dedicated VLAN or NIC; 1GbE sufficient
- **Ceph cluster** — dedicated NIC(s); 10GbE minimum, 25GbE+ recommended
- **Ceph public** — dedicated NIC(s); 10GbE minimum
- **VM/CT guest traffic** — shared bridge; depends on workload
- **Migration** — dedicated or shared; 10GbE recommended for fast migration
- **Backup** — shared or dedicated; depends on backup window

**Critical:** Never combine Corosync cluster traffic with high-bandwidth Ceph or migration traffic on a single 1GbE
link. Corosync requires latency under 5ms — network contention causes cluster instability, false fencing, and potential
data loss. Ceph rebalance traffic (after disk/node failure) can saturate even 10GbE links with NVMe OSDs.

## Firewall Lockout Prevention

Enabling the Proxmox firewall blocks all traffic by default except ports 8006 and 22 from the **local network only**.

**Before enabling the firewall:**

1. Create an IPSet named `management` with trusted admin IPs — Proxmox auto-generates management access rules from this
   set
2. Add explicit rules for ports 8006 (GUI), 22 (SSH), 3128 (SPICE) from remote IPs
3. Keep an active SSH session open as a safety net
4. Enable firewall at datacenter level first, then host, then per-interface

**VM firewall:** Each virtual NIC has its own firewall enable flag — the firewall must be enabled both globally and on
each interface for rules to apply.
