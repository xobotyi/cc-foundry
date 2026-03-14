# VLAN Segmentation

## Design Principles

VLANs logically separate traffic on shared physical infrastructure. Segment by function and trust level, not by device
type.

### Standard Homelab Segments

- VLAN 10 — Management (High trust): hypervisors, switches, routers, IPMI/iLO
- VLAN 20 — Trusted / Lab (High trust): VMs, Docker hosts, Kubernetes nodes
- VLAN 30 — IoT (Low trust): smart home, cameras, sensors, media players
- VLAN 40 — Guest (No trust): guest Wi-Fi, visitor devices
- VLAN 50 — Storage (High trust): NAS, iSCSI targets, backup servers
- VLAN 99 — DMZ (Medium trust): publicly exposed services

Adapt to your environment. The specific VLAN IDs don't matter -- consistency does.

### Inter-VLAN Firewall Rules

Creating VLANs without firewall rules is security theater. Each VLAN boundary needs explicit policy:

- **Management -> All**: Allow (admin access to all segments)
- **Trusted -> IoT**: Allow (control smart devices from trusted network)
- **IoT -> Trusted**: Deny except established/related (IoT initiates nothing upstream)
- **IoT -> Internet**: Allow with DNS filtering (devices phone home; block known bad)
- **Guest -> Internet**: Allow (internet only, no local access)
- **Guest -> Any local**: Deny (complete isolation from internal networks)
- **Storage -> Trusted**: Allow established/related only (responds to requests)
- **DMZ -> Internal**: Deny (compromised DMZ cannot pivot inward)

### Hardware Requirements

VLAN implementation requires VLAN-aware (managed) networking equipment:

- **Router/Firewall**: Must support VLAN tagging -- OPNsense, pfSense, OpenWrt, or enterprise gear. The router
  terminates VLANs and enforces inter-VLAN policy.
- **Managed switches**: Must support 802.1Q VLAN tagging. Consumer "unmanaged" switches pass all traffic without VLAN
  awareness. TP-Link Omada, UniFi, MikroTik are common homelab choices.
- **Access points**: Must support VLAN tagging per SSID to map wireless networks to their respective VLANs (e.g.,
  "Guest" SSID -> VLAN 40, "IoT" SSID -> VLAN 30).

### Trunk vs Access Ports

- **Trunk ports**: Carry multiple VLANs tagged with 802.1Q headers. Used between switches, between switch and router,
  and between switch and hypervisor.
- **Access ports**: Carry a single untagged VLAN. Used for end devices that don't understand VLAN tags (most clients,
  printers, IoT devices).
- **Native VLAN**: The untagged VLAN on a trunk port. Set this to an unused VLAN (not VLAN 1) to prevent VLAN hopping
  attacks.

### Common Mistakes

- **VLAN 1 as production**: VLAN 1 is the default on most switches and carries untagged traffic. Use it only for switch
  management or not at all.
- **No inter-VLAN firewall rules**: VLANs without firewall rules provide zero security benefit -- they only separate
  broadcast domains.
- **Flat management access**: Management interfaces (switch web UIs, IPMI, iLO) should live on a dedicated management
  VLAN, not on the same network as user devices.
- **Over-segmentation**: Every VLAN adds complexity. Start with 3-4 VLANs and add more only when you have a clear
  security or performance reason.

## Layer 2 Security

VLANs provide logical separation but are vulnerable to Layer 2 attacks. Managed switches must be configured with these
protections:

### DHCP Snooping

Prevents rogue DHCP servers from hijacking client configurations:

- **Trusted ports**: Uplinks and ports connected to legitimate DHCP servers
- **Untrusted ports**: All user-facing ports (default)
- Switch builds a binding table mapping MAC -> IP -> port from observed DHCP exchanges
- Drops unauthorized DHCP offer/ack messages on untrusted ports
- Rate-limit DHCP requests to prevent starvation attacks

DHCP snooping is a prerequisite for Dynamic ARP Inspection and IP Source Guard.

### Dynamic ARP Inspection (DAI)

Prevents ARP poisoning / Man-in-the-Middle attacks:

- Intercepts all ARP requests and responses
- Validates IP-to-MAC pairings against the DHCP snooping binding table
- Drops ARP packets that don't match -- prevents an attacker from claiming another device's IP address
- Requires DHCP snooping enabled first
- For devices with static IPs (servers, gateways): add static entries to the binding table

### Port Security

Limits MAC addresses per port to prevent CAM table overflow attacks:

- Set maximum MAC addresses per port (typically 1-3 for end devices)
- **Violation actions**: Shutdown (disable port), Restrict (drop + log), Protect (drop silently)
- **Sticky MACs**: Dynamically learned MACs saved to config, persist across reboots
- Prevents attackers from flooding the switch with random MACs, which forces it into hub mode (forwarding all traffic to
  all ports)

### VLAN Hopping Prevention

- **Disable DTP**: Set all user-facing ports to `switchport mode access` -- prevents devices from negotiating a trunk
- **Unused ports**: Shut down or assign to an isolated dead VLAN
- **Native VLAN**: Use a dedicated unused VLAN for native VLAN on trunks, never VLAN 1
- **Explicit trunking**: Configure trunk ports manually, never auto-negotiate

### STP Protections

- **BPDU Guard**: Enable on access ports -- disables the port if it receives STP BPDU frames (prevents rogue switches
  from manipulating spanning tree)
- **Root Guard**: Prevents unauthorized switches from becoming the STP root bridge
- **Loop Guard**: Detects unidirectional link failures that could cause loops
