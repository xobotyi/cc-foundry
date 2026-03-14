# DNS Architecture

## DNS Filtering: Pi-hole and AdGuard Home

Both are DNS sinkholes that block unwanted domains (ads, trackers, malware) at the network level by intercepting DNS
queries and returning NXDOMAIN for blocked domains.

### Pi-hole

- DNS sinkhole with web dashboard for monitoring and management
- Blocks ads in non-browser contexts (smart TVs, mobile apps, IoT devices)
- Can function as DHCP server (ensures all devices use Pi-hole for DNS)
- Lightweight: runs on minimal hardware (Raspberry Pi, LXC container, Docker)
- Uses blocklists (gravity) updated periodically
- FTL (Faster Than Light) engine handles DNS and DHCP with caching

### AdGuard Home

- Similar DNS sinkhole with additional features over Pi-hole:
  - Built-in DNS-over-HTTPS / DNS-over-TLS / DNS-over-QUIC server
  - Per-client settings and filtering rules
  - Built-in DHCP server
  - Parental controls and safe search enforcement
- Runs as single binary, supports Docker and Snap deployment
- Ports: 53/UDP (DNS), 80/TCP (web UI), 3000/TCP (initial setup)
- Configuration via YAML (`AdGuardHome.yaml`)

### Decision Criteria

**Pi-hole:**

- Encrypted DNS (DoH/DoT): Requires separate setup
- Per-client rules: Limited
- DHCP server: Yes
- Community/ecosystem: Larger, more blocklists
- Resource usage: Lower
- Upstream DNS encryption: Requires Unbound/dnscrypt

**AdGuard Home:**

- Encrypted DNS (DoH/DoT): Built-in
- Per-client rules: Full support
- DHCP server: Yes
- Community/ecosystem: Growing
- Resource usage: Slightly higher
- Upstream DNS encryption: Native

### Deployment Patterns

- **Single instance**: Simplest. Point router DHCP to Pi-hole/AdGuard IP as DNS.
- **Redundant pair**: Two instances on separate hosts. Both configured identically. Router DHCP advertises both as DNS
  servers. Gravity sync (Pi-hole) or config replication keeps lists consistent.
- **Per-VLAN filtering**: Different DNS servers per VLAN with different blocklists. IoT VLAN gets aggressive blocking;
  trusted VLAN gets lighter filtering.

## Split-Horizon DNS

Split-horizon (split-brain) DNS returns different answers for the same domain depending on the source network. Internal
clients resolve `app.example.com` to an internal IP; external clients resolve it to a public IP.

### Implementation Approaches

1. **Firewall DNS overrides**: OPNsense/pfSense can override specific domains for internal clients. Simple but limited
   to IP-level overrides.

2. **Separate DNS instances**: Run two DNS resolvers -- one for internal, one for external. Internal instance has local
   zone overrides. Router directs internal clients to the internal resolver.

3. **Conditional forwarding**: Configure Pi-hole/AdGuard to forward queries for your domain to an authoritative internal
   DNS server, while forwarding everything else upstream.

4. **CoreDNS with conditional zones**: CoreDNS can serve different zone files based on source network using the `view`
   plugin.

### Common Pattern

```
Internet -> Public DNS (Cloudflare/Route53) -> Public IP -> Reverse Proxy
LAN      -> Local DNS (Pi-hole/AdGuard)     -> Private IP -> Reverse Proxy
```

Both paths reach the same reverse proxy, but internal traffic stays local instead of hairpinning through the WAN.

### Gotchas

- AdGuard Home's DNS rewrites apply globally -- you cannot easily make them network-dependent with a single instance. If
  you run a self-hosted DoH instance, external queries will be rewritten with internal IPs, making services inaccessible
  from outside. Use separate instances for true split behavior.
- Wildcard DNS rewrites (`*.example.com -> 192.168.1.100`) simplify configuration when all services share a reverse
  proxy.
- Test from both internal and external perspectives after changes.
- Avoid firewall-integrated DNS blocking plugins (e.g., pfBlockerNG on pfSense). A core firewall update can silently
  break the plugin and kill all DNS resolution network-wide. Run DNS filtering as a standalone service (Pi-hole, AdGuard
  Home) on separate infrastructure.

## mDNS Across VLANs

Multicast DNS (mDNS, `.local` domains) is link-local -- it does not cross routed network boundaries. Devices on
different VLANs cannot discover each other via mDNS without a reflector/proxy.

### Avahi Reflector

Avahi is the standard mDNS/DNS-SD implementation on Linux. Enable the reflector to bridge mDNS across VLANs:

```ini
# /etc/avahi/avahi-daemon.conf
[server]
allow-interfaces=br-lan,eth1.2   # Limit to specific interfaces

[reflector]
enable-reflector=yes
```

On OpenWrt: `opkg install avahi-daemon`, then configure interfaces.

**Restrict interfaces**: By default Avahi listens on all interfaces including WAN. Always limit to the specific internal
interfaces that need mDNS bridging.

### When to Use

- IoT device discovery from trusted LAN (Chromecast, AirPlay, printers)
- Home automation controllers discovering devices across VLANs
- Do NOT reflect mDNS to/from guest or untrusted networks

## Recursive vs Authoritative DNS

- **Recursive resolver** (Unbound, Pi-hole's FTL, AdGuard Home): Takes a client query, walks the DNS hierarchy from root
  servers to authoritative servers, caches the result. This is what clients talk to.
- **Authoritative server** (PowerDNS, CoreDNS, BIND): Holds zone data and answers queries for domains it owns. Does not
  recurse.

### Homelab Pattern

Run a recursive resolver (Unbound or AdGuard Home) that:

1. Serves as the network's DNS resolver with ad blocking
2. Forwards your local domain (e.g., `home.example.com`) to a local authoritative server or uses local zone overrides
3. Resolves everything else via upstream DNS (Cloudflare 1.1.1.1, Quad9 9.9.9.9) or by doing full recursion from root
   servers

### DNS over TLS / HTTPS

Always encrypt upstream DNS queries to prevent ISP snooping:

- **DNS over TLS (DoT)**: Port 853. Supported by Unbound, AdGuard Home natively.
- **DNS over HTTPS (DoH)**: Port 443. Harder to block, looks like regular HTTPS.
- **DNS over QUIC (DoQ)**: UDP-based. Supported by AdGuard Home.

Configure your recursive resolver to use encrypted upstream, then serve plain DNS internally (encryption between
resolver and clients on the LAN is usually unnecessary).
