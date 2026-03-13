# Clustering and High Availability

Proxmox VE clustering connects multiple nodes into a unified management domain with shared configuration, live
migration, and optional high availability (HA) for automatic failover of guests.

## Cluster Fundamentals

### Corosync

Corosync provides the cluster communication layer — membership, messaging, and quorum. All cluster nodes must be able to
reach each other via Corosync.

**Configuration rules:**

- Use a **dedicated network** for Corosync traffic — never share with Ceph, guest, or high-bandwidth traffic on a single
  1GbE link
- Configure **redundant Corosync links** (two separate networks) for fault tolerance
- Corosync uses UDP multicast or unicast — unicast is required in most cloud/VLAN setups
- Default Corosync port: 5405-5412 (UDP)
- Latency between nodes must be low (<2ms recommended) — Corosync is latency-sensitive
- Use **static IP addresses** for cluster addresses, not hostnames — DNS resolution delays or changes can cause cluster
  communication failures
- If using **LACP bonds** for Corosync, set `bond-lacp-rate fast` on both node and switch. Default slow rate has a
  90-second failover time — HA resources fence the node after ~60 seconds of lost quorum, so slow LACP triggers
  unnecessary fencing
- Avoid `balance-rr`, `balance-xor`, `balance-tlb`, and `balance-alb` bond modes for Corosync — they are known to cause
  problems in failure scenarios

### Quorum

A cluster requires a **majority of votes** (quorum) to operate. Without quorum, the cluster enters read-only mode to
prevent split-brain.

| Nodes | Votes | Quorum | Tolerated failures  |
| ----- | ----- | ------ | ------------------- |
| 2     | 2     | 2      | 0 (without QDevice) |
| 3     | 3     | 2      | 1                   |
| 4     | 4     | 3      | 1                   |
| 5     | 5     | 3      | 2                   |

### Two-Node Clusters

Two-node clusters have no fault tolerance by default — losing one node means losing quorum. Solutions:

- **QDevice (recommended):** An external lightweight daemon (`corosync-qdevice`) running on a third machine provides a
  tie-breaking vote. The QDevice host does not need to be a Proxmox node — any Linux machine works.
  ```
  pvecm qdevice setup <qdevice-ip>
  ```
- **Manual quorum override (dangerous):** `pvecm expected 1` forces the remaining node to operate without quorum. Only
  use during planned maintenance, never as a permanent solution.

### Adding and Removing Nodes

**Adding a node:**

```
# On the new node:
pvecm add <existing-node-ip>
```

- The new node must have a fresh Proxmox installation — never join a node with existing VMs/containers to an existing
  cluster
- Ensure network connectivity (Corosync, SSH) between all nodes before joining

**Removing a node:**

1. Migrate all guests off the node
2. On the node being removed: `pvecm nodes` to verify membership
3. Shut down the node
4. On a remaining node: `pvecm delnode <nodename>`
5. Remove SSH keys and known_hosts entries

## High Availability (HA)

HA automatically restarts guests on another node when their host fails. It requires shared storage (Ceph, NFS, iSCSI) or
replicated storage (ZFS replication).

### How HA Works

1. **Watchdog** monitors node health via hardware watchdog timer
2. **Fencing** ensures a failed node is completely stopped before services restart elsewhere — this prevents
   simultaneous writes to shared storage (split-brain)
3. **HA Manager** (CRM) detects the failure and migrates affected HA resources to surviving nodes according to group and
   priority settings

### Fencing

Fencing is the mechanism that guarantees a failed node is truly offline. Without reliable fencing, HA is **unsafe** —
restarting a VM on another node while the original is still running causes data corruption.

**Fencing methods:**

- **Hardware watchdog** (default): Linux kernel software watchdog (`softdog`) or IPMI hardware watchdog resets the
  failed node
- **IPMI/iLO/iDRAC:** Out-of-band management interface power-cycles the failed node
- **External fencing agents:** Custom scripts for PDU/UPS power control

**Rules:**

- Verify the watchdog is active: `ha-manager status` should show watchdog OK
- Test fencing before relying on HA: simulate a node failure and verify the node actually reboots/shuts down
- Never disable fencing — HA without fencing is a data corruption risk

### HA Groups

HA groups define which nodes can run specific resources and set failover priority.

```
ha-group create mygroup -nodes "node1:2,node2:1,node3:1" -nofailback 0
```

- **Priority** (higher = preferred): Node with highest priority runs the resource under normal conditions
- **Failback** (`nofailback: 0`): Resource migrates back to the preferred node when it recovers. Set `nofailback: 1` to
  prevent automatic failback.
- **Restricted groups:** Only nodes in the group can run the resource. If all group nodes are down, the resource stays
  down rather than running on an ungrouped node.

### HA Resource Configuration

```
ha-manager add vm:100 -group mygroup -state started -max_restart 3 -max_relocate 2
```

| Parameter      | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `state`        | `started`, `stopped`, `disabled`, `ignored`                 |
| `max_restart`  | Maximum restart attempts on the same node before relocating |
| `max_relocate` | Maximum relocations to other nodes before giving up         |
| `group`        | HA group defining eligible nodes and priorities             |

### HA Requirements Checklist

- [ ] Shared or replicated storage accessible from all HA nodes
- [ ] Minimum 3 nodes (or 2 nodes + QDevice) for quorum
- [ ] Working fencing mechanism tested and verified
- [ ] Dedicated Corosync network with redundant links
- [ ] HA groups configured with appropriate priorities
- [ ] Guest configuration stored on shared/replicated storage (automatic with pmxcfs)

## Migration

### Live Migration (VMs only)

- Requires shared storage or replicated local storage
- RAM contents transferred over the network while VM continues running
- Brief pause at cutover (typically milliseconds to seconds)
- Not possible with PCIe passthrough devices
- Use dedicated migration network for large-memory VMs

### Offline Migration

- Works for both VMs and containers
- Guest is stopped, disk data transferred, guest started on target node
- Required for LXC containers (no live migration support)
- Works with local non-replicated storage (disk is copied)

### Migration Best Practices

- Use a **dedicated high-bandwidth network** (10GbE+) for migration traffic
- Set migration network in datacenter options: `migration: network=10.0.1.0/24`
- For large VMs, consider **storage migration** (move disk between storage backends) rather than node migration
- Test migration before relying on it for HA — verify network throughput and storage accessibility

## Cluster Maintenance

### Rolling Updates

Update cluster nodes **one at a time** — never simultaneously. The HA stack uses a request-acknowledge protocol between
the Cluster Resource Manager (CRM) and Local Resource Manager (LRM). During an update, the LRM requests a service freeze
from the CRM; if the CRM is also being updated, the request cannot be acknowledged, and the watchdog may fence the node.

**Procedure:**

1. Migrate HA resources off the target node (or let HA handle it)
2. Update the node: `apt update && apt dist-upgrade`
3. Reboot if a kernel update was applied
4. Verify the node is fully functional: `pvecm status`, `ha-manager status`
5. Proceed to the next node only after confirmation
