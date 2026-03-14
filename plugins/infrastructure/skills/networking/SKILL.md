---
name: networking
description: >-
  Network infrastructure for self-hosted environments: VLANs, firewalls (nftables,
  OPNsense, pfSense), DNS (Pi-hole, AdGuard Home, split-horizon), reverse proxies
  (Caddy, Traefik, Nginx Proxy Manager), VPN (WireGuard, Tailscale), TLS/SSL
  certificate management, DHCP, and security hardening. Invoke when task involves
  any interaction with network configuration — designing, implementing, debugging,
  reviewing, or planning network architecture.
---

# Networking

Security is a non-negotiable default, not an optional add-on. Every network design decision must account for trust
boundaries.

## References

Extended configuration examples, comparison tables, and detailed patterns for the rules below live in
`${CLAUDE_SKILL_DIR}/references/`.

- `vlan-segmentation.md` — VLAN design, trunk/access ports, inter-VLAN policy, Layer 2 security: segment table, firewall
  rule matrix, hardware requirements, DHCP snooping, DAI, port security, L2 attack mitigation
- `firewall-rules.md` — nftables syntax, OPNsense/pfSense hardening, IPv6 firewall rules: chain types/hooks/priorities,
  connection tracking, NAT, rate limiting, sets/maps, ICMPv6 policy, dual-stack rules
- `dns-architecture.md` — Pi-hole, AdGuard Home, split-horizon, mDNS, Unbound, DoH/DoT: tool comparison, deployment
  patterns, Avahi reflector config, recursive vs authoritative, encrypted DNS, IPv6 DNS
- `reverse-proxy.md` — Caddy, Traefik, Nginx Proxy Manager, Cloudflare tunnels: Caddyfile examples, Traefik Docker
  labels, decision matrix, snippet patterns, tunnel patterns, auth proxy integration
- `vpn-tunnels.md` — WireGuard, Tailscale, Headscale, site-to-site, HA with OSPF: config examples, topology comparison,
  subnet router, hybrid WG+TS, HA failover with BIRD/OSPF
- `tls-certificates.md` — Let's Encrypt, ACME, wildcard certs, acme.sh: challenge types, ACME client comparison,
  certificate storage patterns, TLS config
- `security-hardening.md` — SSH, fail2ban, CrowdSec, IDS/IPS, monitoring, hardening: sshd_config, SSH CA, fail2ban vs
  CrowdSec, Suricata IDS, Prometheus stack, monitoring metrics, IPv6 hardening
- `auth-proxies.md` — Authelia, Authentik, forward auth, SSO patterns: Authelia vs Authentik comparison, ForwardAuth
  with Traefik/Caddy, SSO/MFA patterns, deployment guidance

## VLAN Segmentation

### Segment by Trust Level

Separate traffic into functional zones based on trust, not device count:

- **Management** (VLAN 10): Hypervisors, switches, routers, IPMI/iLO -- highest trust
- **Trusted/Lab** (VLAN 20): VMs, containers, workstation -- high trust
- **IoT** (VLAN 30): Smart devices, cameras, sensors -- low trust, restricted
- **Guest** (VLAN 40): Visitor devices -- zero trust, internet only
- **Storage** (VLAN 50): NAS, iSCSI, backup targets -- high trust, limited access
- **DMZ** (VLAN 99): Publicly exposed services -- medium trust, no inward access

Start with 3-4 VLANs. Add more only with a clear security or performance reason. Over-segmentation adds complexity
without proportional benefit. Separate production self-hosted services from experimental lab services -- prevent
experimentation from causing downtime for household-facing apps.

### Inter-VLAN Policy

VLANs without firewall rules provide zero security benefit. Every VLAN boundary needs explicit allow/deny policy.
Default deny between all VLANs, then explicitly allow required flows. Always permit established/related return traffic.

### Infrastructure Requirements

- Managed (VLAN-aware) switches with 802.1Q support
- Router/firewall capable of VLAN termination and inter-VLAN routing
- Access points with per-SSID VLAN tagging
- Set native VLAN on trunks to an unused VLAN (not VLAN 1)

## Firewalls

### nftables

Modern Linux firewall replacing iptables. Use `inet` family for dual-stack rules.

Core structure: **tables** contain **chains**, chains contain **rules**. Base chains attach to Netfilter hooks (`input`,
`forward`, `output`, `prerouting`, `postrouting`).

Minimal host firewall:

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

Key rules:

- Place `ct state established,related accept` early in input/forward chains -- handles bulk of traffic efficiently
- Drop `ct state invalid` packets explicitly
- Use `policy drop` on input and forward chains (default deny)
- Use `policy accept` on output chains (restrict outbound only when needed)
- `accept` is not final across chains -- later chains at the same hook still evaluate. `drop` is always final.
- Use `counter` on rules during development to verify traffic is hitting them
- Persist rules: `nft list ruleset > /etc/nftables.conf`, enable `nftables.service`

### OPNsense / pfSense

GUI-managed firewalls. Rules evaluate top-to-bottom, first match wins. Place more specific rules (e.g., block-LAN) above
general rules (e.g., allow-internet) -- rule ordering mistakes are the most common cause of VLAN isolation failures.

Post-install hardening (first 30 minutes):

1. Change default admin password
2. Enable 2FA (OPNsense: built-in; pfSense: package)
3. Disable web UI access from WAN
4. Configure DNS over TLS upstream
5. Enable automatic config backups
6. Restrict RFC1918 on WAN interface
7. Restrict DNS resolver to internal interfaces only (default allows queries from all interfaces -- open resolvers get
   abuse complaints)

OPNsense has faster security patches and built-in 2FA. pfSense has a larger community knowledge base. Security posture
depends more on configuration than platform choice.

Throughput problems after install: disable hardware offloading (CRC, TSO, LRO) first -- this is the most common culprit
in virtualized environments. If still slow, check IDS rulesets -- too many active rules kill performance. Start with 2-3
rulesets, add more only as needed.

## IPv6

### Dual-Stack Configuration

Run IPv4 and IPv6 concurrently. Dual-stack doubles the attack surface -- maintain identical security policies for both
protocols. Use `inet` family in nftables for rules that apply to both stacks; use `ip6` only for IPv6-specific rules
(ICMPv6, neighbor discovery).

### ICMPv6 Firewall Policy

ICMPv6 is essential for IPv6 operation -- blocking all ICMPv6 breaks the network. Apply granular filtering:

- **Must allow transit**: Destination Unreachable (Type 1), Packet Too Big (Type 2), Time Exceeded (Type 3) -- required
  for PMTU discovery and communication
- **Link-local only**: Router/Neighbor Solicitation and Advertisement (Types 133-136) -- critical for local discovery,
  must never cross network boundaries
- **Drop invalid**: Drop ICMPv6 from unexpected sources or with malformed headers

### Address Assignment

- **SLAAC**: Stateless, no server needed. Devices auto-configure from router advertisements. Simple but less control.
- **DHCPv6**: Stateful, centralized address management. Provides DNS server addresses. Use for servers requiring fixed
  addresses.
- **Privacy extensions**: Randomize interface identifiers to prevent tracking. Enable for external communications,
  disable internally (rotating addresses break logging and service correlation).

### DNS and IPv6

Add AAAA records only after IPv6 connectivity is verified and working. Premature AAAA records cause timeouts when IPv6
is not properly configured. In dual-stack environments, test both A and AAAA resolution paths.

## IDS/IPS

### Suricata

Network threat detection engine. Performs deep packet inspection and generates alerts based on rulesets. OPNsense
includes Suricata built-in; pfSense requires a package.

Performance impact: enabling 3 rulesets causes ~27% throughput drop. Start with 2-3 essential rulesets, add more only as
needed. Disable hardware offloading (CRC, TSO, LRO) first if throughput is poor -- offloading conflicts with packet
inspection.

### CrowdSec

Collaborative security engine that replaces or augments fail2ban. Key differences from fail2ban:

**fail2ban:** Detection via regex on local logs; local-only intelligence; iptables/nftables ban remediation; configured
via jail.conf.

**CrowdSec:** Detection via YAML scenarios with leakspeed/capacity; community-shared threat data; Bouncers for
remediation (firewall, Nginx, Traefik); configured via acquis.yaml + Hub collections.

Install CrowdSec collections from the Hub for specific services (SSH, Nginx, Suricata). Configure whitelists immediately
to prevent banning your own IPs.

### Suricata + CrowdSec Integration

Suricata detects threats via packet inspection and logs to `fast.log`. CrowdSec parses these logs via `acquis.yaml` and
makes blocking decisions. This separates detection (Suricata) from remediation (CrowdSec bouncers) -- each tool does
what it does best.

## DNS

### DNS Filtering

Pi-hole and AdGuard Home are DNS sinkholes that block unwanted domains at the network level. Point DHCP-advertised DNS
at the sinkhole.

- **Pi-hole**: Lighter resource usage, larger community/blocklist ecosystem
- **AdGuard Home**: Built-in encrypted DNS (DoH/DoT/DoQ), per-client rules, YAML config

Deploy redundant pairs on separate hosts for resilience. Sync blocklists between instances. Avoid using
firewall-integrated DNS blocking plugins (e.g., pfBlockerNG) -- a core firewall update can silently break the plugin and
kill all DNS resolution. Run DNS filtering as a separate service.

### Split-Horizon DNS

Return different DNS answers based on client network. Internal clients resolve to private IPs; external clients resolve
to public IPs. Implementation:

- Wildcard DNS rewrite in Pi-hole/AdGuard (`*.example.com -> 192.168.1.100`) for internal resolution to reverse proxy
- Separate DNS instances for internal vs external (cleanest separation -- avoids AdGuard Home's global rewrite problem
  where a self-hosted DoH instance rewrites external queries with internal IPs)
- Conditional forwarding for local domains to internal authoritative server

### mDNS Across VLANs

mDNS (`.local`) is link-local and does not cross routed boundaries. Use Avahi with `enable-reflector=yes` to bridge mDNS
between specific VLANs (e.g., trusted LAN discovering IoT devices). Restrict interfaces -- never reflect to guest or
WAN.

### Upstream Encryption

Always encrypt DNS queries upstream (DNS over TLS or HTTPS) to prevent ISP snooping. Configure the recursive resolver to
use encrypted upstream; serve plain DNS internally.

## Reverse Proxy

Single entry point for all HTTP/HTTPS services. Terminates TLS, routes by hostname, eliminates per-service port
exposure.

### Tool Selection

| Factor         | Caddy            | Traefik              | Nginx Proxy Manager |
| -------------- | ---------------- | -------------------- | ------------------- |
| Config style   | Caddyfile        | YAML + Docker labels | Web UI              |
| Auto HTTPS     | Default behavior | Via cert resolvers   | One-click           |
| Docker-aware   | Plugin           | Native               | No                  |
| Learning curve | Low              | Medium               | Lowest              |
| Best for       | Simple setups    | Docker/K8s stacks    | GUI preference      |

- **Docker-heavy**: Traefik -- discovers containers automatically
- **Simplicity-first**: Caddy -- automatic HTTPS, minimal config
- **GUI management**: Nginx Proxy Manager -- point-and-click

### Architecture Pattern

```
Client --[HTTPS]--> Reverse Proxy --[HTTP]--> Backend Services
```

Only the reverse proxy needs TLS certificates. Backend services run plain HTTP on internal networks. One wildcard
certificate covers all services.

### Wildcard Certificates

Use DNS-01 ACME challenge for wildcard certs (`*.example.com`). Required for internal services not reachable from the
internet. Caddy and Traefik handle this natively with DNS provider plugins.

## Authentication Proxies

### Authelia vs Authentik

Both provide SSO and MFA for self-hosted services. Choose based on resource constraints and protocol needs:

- **Authelia**: Lightweight (~20 MB image, ~30 MB RAM). YAML-configured, no GUI. Supports OIDC, TOTP, WebAuthn,
  Passkeys. Best for homelabs with limited resources needing web SSO.
- **Authentik**: Full identity provider (~690 MB, requires PostgreSQL). Web GUI with user dashboard. Supports OIDC,
  SAML2, LDAP, RADIUS, SCIM. Best when SAML support or a user portal is needed.

### Forward Auth Pattern

Reverse proxies intercept requests and forward headers to the auth server before reaching the backend. Traefik uses
`ForwardAuth` middleware; Caddy uses similar mechanisms. The auth server validates the session and returns 200 (allow)
or 401 (redirect to login).

### Deployment

Gate user-facing services behind auth proxies. Keep admin panels (router, Proxmox, NAS) on VPN or management VLAN only
-- do not expose through public auth proxies. Prefer phishing-resistant MFA (FIDO2/WebAuthn) over TOTP where possible.

## Cloudflare Tunnels

### When to Use

Cloudflare Tunnels expose internal services without opening inbound ports. Useful behind CGNAT or when port forwarding
is impossible. The `cloudflared` daemon initiates outbound connections to Cloudflare's edge.

### Architecture Pattern

```
Internet -> Cloudflare Edge -> cloudflared -> Reverse Proxy -> Backend
```

Route tunnels into a local reverse proxy (Traefik/Caddy) for SSL termination and routing. Layer Authelia/Authentik or
Cloudflare Access for identity gating.

### When NOT to Use

- **Admin panels**: Router, hypervisor, NAS UIs -- keep on VPN/LAN only
- **Sensitive data services**: Password managers, private document portals
- **LAN-only tools**: Printer dashboards, IoT hubs with weak/no auth
- **High-bandwidth media**: Jellyfin/Plex through CDN may violate ToS -- disable caching for media subdomains if used

A tunnel makes services accessible, not secure. Weak credentials, missing MFA, or unpatched software remain exploitable
regardless of the tunnel.

## VPN

### WireGuard

Kernel-level VPN protocol. ~4,000 lines of code. Fast, simple, no cipher negotiation.

- Hub-and-spoke topology for remote access VPN
- Site-to-site between fixed endpoints with static IPs
- Requires manual port forwarding (UDP 51820) and key management
- ~5 MB RAM (kernel module)
- Use when: zero external dependencies required, resource-constrained devices, traditional VPN gateway needed

### Tailscale

Mesh VPN built on WireGuard. Automatic key management, NAT traversal, DNS.

- Full mesh topology -- devices connect directly peer-to-peer
- Zero-config: SSO login, no port forwarding, no config files
- MagicDNS for automatic device name resolution
- Subnet routers expose local networks without per-device installation
- ~30-50 MB RAM (userspace daemon)
- Use when: multiple devices across networks, NAT traversal needed, want managed ACLs and DNS

### Topology Resilience

Hub-and-spoke has a single point of failure: if the hub goes down, the entire VPN is unreachable. Mesh (Tailscale) is
resilient -- nodes remain connected to each other even if one fails. Choose topology based on failure tolerance, not
just convenience.

### Hybrid Pattern

Run both: Tailscale for day-to-day remote access (mesh, zero-config), WireGuard as backup VPN gateway for full-tunnel
routing or when Tailscale's coordination server is unreachable.

### OpenVPN

Legacy. Slower, larger attack surface. Choose only when TCP-based tunneling is required to bypass UDP-blocking
firewalls. For all new deployments, use WireGuard or Tailscale.

## TLS/SSL Certificates

### ACME and Let's Encrypt

Free, automated certificate issuance. Certificates valid 90 days, renew at 60.

Challenge types:

- **HTTP-01**: CA fetches token from port 80. For public-facing servers.
- **DNS-01**: Client creates TXT record. Required for wildcards and internal services.
- **TLS-ALPN-01**: CA connects to port 443. When only 443 is available.

### Recommended Approach

Let the reverse proxy handle all certificate management. Caddy and Traefik do this automatically. For standalone cert
management, use acme.sh (shell-only, no dependencies, many DNS providers).

### TLS Configuration

- Minimum TLS 1.2, prefer TLS 1.3
- Enable HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Enable OCSP stapling when supported
- Don't manually configure cipher suites unless you have a specific reason -- modern defaults are optimal
- Monitor certificate expiry (Prometheus blackbox_exporter, Uptime Kuma)

## Security Hardening

### SSH

- Disable password authentication -- key-based only (Ed25519)
- Disable root login -- authenticate as user, then `sudo`
- Restrict agent/X11 forwarding
- Use CrowdSec or fail2ban as a mitigation layer (not a substitute for key-based auth)
- For fleet management: use SSH Certificate Authority (step-ca) instead of distributing authorized_keys. SSH CA issues
  short-lived certificates (~16h), eliminating stale key accumulation. Configure `TrustUserCAKeys` in sshd_config to
  point at the CA public key.

### Network Hardening Checklist

- Default deny inbound on all firewall interfaces
- Filter outbound traffic -- a compromised service with unrestricted outbound can exfiltrate data or contact C2 servers.
  At minimum: allow DNS only to designated DNS servers, allow HTTP/HTTPS for updates, block all other outbound from IoT
  and untrusted VLANs
- Restrict management interfaces to management VLAN only
- Enable DHCP snooping on managed switches -- prevents rogue DHCP servers
- Enable Dynamic ARP Inspection (DAI) -- prevents ARP poisoning (requires DHCP snooping binding table)
- Enable port security -- limits MAC addresses per port, prevents CAM table overflow attacks
- Disable DTP on all user-facing ports -- prevents VLAN hopping
- Enable BPDU Guard on access ports -- prevents STP manipulation
- Prefer DHCP reservations over static IPs for centralized management
- Change all default credentials (every device, no exceptions)
- Update firmware on all network devices regularly
- Backup configurations before any change, store off-device
- Disable unused services (UPnP, WPS, SNMP v1/v2 on WAN)
- For IPv6: maintain identical firewall policies for both stacks, allow required ICMPv6 types, disable IPv6 if not
  actively used
- Document network topology and keep diagrams current

### Monitoring

Deploy Prometheus + Grafana for network observability:

- **snmp_exporter**: Switch/router metrics via SNMP
- **blackbox_exporter**: Endpoint probing, certificate monitoring
- **node_exporter**: Host-level metrics
- Centralize logs with syslog or Loki+Promtail
- Use Monit or systemd watchdog to auto-restart critical services (DNS resolvers, reverse proxies) -- silent failures
  cause household-wide outages
- Review firewall deny logs weekly during initial setup

## Application

When **designing** network architecture: propose segmented designs with explicit trust boundaries. Default to
security-first configurations. Present trade-offs between complexity and security.

When **implementing** configurations: produce production-ready config files, not toy examples. Include comments
explaining non-obvious choices. Test connectivity after changes.

When **debugging** network issues: start at layer 2 (link/VLAN), work up through layer 3 (routing/firewall), then layer
7 (application/proxy). Check firewall deny logs first -- they reveal 80% of connectivity issues. Key tools:

- `ping` / `traceroute` -- reachability and path verification
- `dig` / `nslookup` -- DNS resolution from specific resolvers
- `ss -tlnp` / `netstat` -- listening ports and socket state
- `tcpdump` / `tshark` -- packet captures for traffic flow analysis
- `nft list ruleset` -- verify active firewall rules match intent
- `avahi-browse -a` -- verify mDNS discovery across VLANs
- `curl -v` -- HTTP/HTTPS connectivity with TLS details

When **reviewing** network configurations: flag missing inter-VLAN firewall rules, default credentials, disabled
encryption, overly permissive access, and missing monitoring. State what's wrong and how to fix it.

## Integration

The **containers** skill covers Docker/Podman networking (bridge, host, macvlan). This skill covers the network
infrastructure those containers sit on. When a task involves both container networking and VLAN/firewall design, both
skills apply.

The **ansible** skill handles automation of network configuration deployment. Use this skill for what to configure,
ansible for how to deploy it.

**Security is not optional. Every default must be secure. Convenience follows.**
