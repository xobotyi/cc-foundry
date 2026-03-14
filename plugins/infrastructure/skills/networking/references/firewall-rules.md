# Firewall Rules

## nftables

nftables is the modern Linux firewall framework, replacing iptables. It uses a unified syntax for IPv4, IPv6, ARP, and
bridge filtering.

### Core Concepts

- **Table**: Container for chains. Has a family: `ip`, `ip6`, `inet` (both), `arp`, `bridge`, `netdev`.
- **Chain**: Container for rules. Base chains attach to Netfilter hooks; regular chains are called via `jump`/`goto`.
- **Rule**: Match expressions + verdict statement.

### Families

Use `inet` for dual-stack rules that apply to both IPv4 and IPv6. Use `ip` or `ip6` only when rules are
protocol-specific (e.g., ICMPv6 neighbor discovery).

### Chain Types and Hooks

- `filter` — Packet filtering: prerouting, input, forward, output, postrouting
- `nat` — Address translation: prerouting, input, output, postrouting
- `route` — Rerouting (mangle equivalent): output only

Hooks determine where in the packet path the chain fires:

- **input**: Packets destined for the local machine
- **forward**: Packets routed through the machine
- **output**: Packets originating from the local machine
- **prerouting/postrouting**: Before/after routing decisions

### Priority

Chain priority determines evaluation order. Lower numbers run first.

- `-400` (`conntrack defrag`) — Defragmentation
- `-300` (`raw`) — Pre-conntrack filtering
- `-200` (`conntrack`) — Connection tracking
- `-100` (`dstnat`) — DNAT (port forwarding)
- `0` (`filter`) — Standard filtering
- `100` (`srcnat`) — SNAT/masquerade

### Verdict Statements

- `accept`: Accept packet, stop evaluating current chain (but later chains at same hook still run)
- `drop`: Drop packet immediately, no further evaluation anywhere
- `reject`: Drop with ICMP error response
- `jump <chain>`: Evaluate rules in target chain, then return
- `goto <chain>`: Evaluate rules in target chain, don't return

**Critical**: `accept` in one chain does NOT prevent evaluation by later chains at the same hook with higher priority
numbers. `drop` is always final.

### Connection Tracking

Stateful filtering uses `ct state`:

```
ct state established,related accept   # Allow return traffic
ct state invalid drop                  # Drop malformed packets
ct state new tcp dport { 22, 80, 443 } accept  # Allow new connections to services
```

Always place conntrack rules early -- they handle the bulk of traffic and are fast.

### Minimal Host Firewall

```nft
table inet filter {
  chain input {
    type filter hook input priority filter; policy drop;

    ct state established,related accept
    ct state invalid drop
    iifname "lo" accept
    icmp type echo-request accept
    icmpv6 type { echo-request, nd-neighbor-solicit, nd-router-advert } accept
    tcp dport { ssh } accept
  }

  chain forward {
    type filter hook forward priority filter; policy drop;
  }

  chain output {
    type filter hook output priority filter; policy accept;
  }
}
```

### Rate Limiting

```nft
# Limit SSH connection attempts
tcp dport 22 ct state new limit rate 3/minute burst 5 packets accept

# Log and drop excess
tcp dport 22 ct state new log prefix "SSH-excess: " drop
```

### NAT / Masquerade

```nft
table ip nat {
  chain postrouting {
    type nat hook postrouting priority srcnat;
    oifname "eth0" masquerade
  }

  chain prerouting {
    type nat hook prerouting priority dstnat;
    tcp dport 8080 dnat to 192.168.1.100:80
  }
}
```

### Sets and Maps

```nft
# Named set for allowed IPs
define ADMIN_IPS = { 192.168.1.10, 192.168.1.11 }
tcp dport 22 ip saddr $ADMIN_IPS accept

# Verdict map for port-based routing
tcp dport vmap { 80 : accept, 443 : accept, 22 : jump ssh_filter }
```

### Persistence

Save and load rulesets:

```bash
nft list ruleset > /etc/nftables.conf
nft -f /etc/nftables.conf
```

Enable `nftables.service` for persistence across reboots.

## IPv6 Firewall Rules

### Dual-Stack with nftables

Use `inet` family for rules that apply to both IPv4 and IPv6. Use `ip6` only for protocol-specific rules:

```nft
table inet filter {
  chain input {
    type filter hook input priority filter; policy drop;

    ct state established,related accept
    ct state invalid drop
    iifname "lo" accept

    # IPv4 ICMP
    icmp type echo-request accept

    # ICMPv6 -- essential for IPv6 operation
    icmpv6 type { echo-request, echo-reply } accept
    icmpv6 type { nd-neighbor-solicit, nd-neighbor-advert,
                  nd-router-solicit, nd-router-advert } accept

    # Services (dual-stack)
    tcp dport { ssh } accept
  }
}
```

### ICMPv6 Filtering Policy

ICMPv6 is not optional -- blocking it breaks IPv6 networking entirely.

- Destination Unreachable (1) — Allow transit: communication maintenance
- Packet Too Big (2) — Allow transit: PMTU discovery, blocking breaks large packets
- Time Exceeded (3) — Allow transit: traceroute, path diagnostics
- Echo Request/Reply (128/129) — Allow (policy): connectivity testing
- Router Solicitation (133) — Link-local only: router discovery, never route
- Router Advertisement (134) — Link-local only: prefix advertisement, never route
- Neighbor Solicitation (135) — Link-local only: ARP equivalent for IPv6
- Neighbor Advertisement (136) — Link-local only: ARP reply equivalent

Use port-based ACLs to prevent Router Advertisement messages from entering the network from end-user ports (RA Guard).

### Dual-Stack Security Considerations

- Maintain identical firewall policies for IPv4 and IPv6
- When updating rules, apply changes to both stacks as a single coordinated process
- If IPv6 is not actively used, disable it at the interface level to prevent unintended IPv6 traffic from bypassing
  IPv4-only firewalls
- Monitor for unauthorized IPv6 tunnel traffic (6to4, Teredo) that can bypass IPv4 firewall rules

## OPNsense / pfSense

For GUI-managed firewalls (OPNsense, pfSense), the same principles apply:

- **Default deny inbound** on all interfaces
- **Explicit allow rules** for each permitted flow
- **Rules evaluate top-to-bottom**, first match wins
- **Floating rules** apply across interfaces (use sparingly)
- Place more specific rules before general ones
- **Log denied traffic** initially to catch legitimate traffic being blocked
- Review and prune rules quarterly -- unused rules are attack surface

### Post-Install Hardening

First 30 minutes after installation:

1. Change default admin password
2. Enable 2FA (OPNsense: built-in; pfSense: requires package)
3. Disable web UI access from WAN
4. Configure DNS over TLS upstream
5. Enable automatic config backups
6. Restrict RFC1918 traffic on WAN interface
7. Restrict DNS resolver to internal interfaces only -- default configurations often allow queries from all interfaces,
   turning the firewall into an open resolver (ISP abuse complaints follow)

### Troubleshooting

**Poor throughput despite fast connection**: Disable hardware offloading first -- CRC, TSO, LRO. This is the most common
cause in virtualized environments.

- OPNsense: Interfaces > Settings > disable Hardware CRC/TSO/LRO
- pfSense: System > Advanced > Networking > disable all hardware checksum offloading

Reboot and retest. If still slow, check IDS rule count -- too many active rulesets kill performance. Start with 2-3
recommended rulesets.

**Rule ordering mistakes**: In top-to-bottom first-match evaluation, a common error is placing allow-internet above
block-LAN when isolating a VLAN. The allow rule matches first, and the block never fires. Always place deny rules above
allow rules for the same traffic path.
