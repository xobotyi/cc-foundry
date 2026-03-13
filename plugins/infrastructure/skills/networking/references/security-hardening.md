# Network Security Hardening

## Principles

Security is a non-negotiable default, not an optional add-on. Every recommendation here is a baseline, not an
aspiration.

## SSH Hardening

### Configuration (`/etc/ssh/sshd_config`)

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
MaxSessions 3
AllowAgentForwarding no
X11Forwarding no
PermitEmptyPasswords no
ClientAliveInterval 300
ClientAliveCountMax 2
```

Key changes from defaults:

- **Disable password auth**: Key-based only. Eliminates brute-force attacks entirely.
- **Disable root login**: Force users to authenticate as themselves, then `sudo`.
- **Restrict agent/X11 forwarding**: Reduces attack surface from compromised clients.
- **Client keepalive**: Drop idle sessions after 10 minutes (300s \* 2).

### Key Management

- Use Ed25519 keys: `ssh-keygen -t ed25519 -C "user@host"`
- Protect private keys with passphrases and use ssh-agent
- Rotate keys annually or when personnel changes
- Remove stale authorized_keys entries

### SSH Certificate Authority

For fleets larger than a handful of hosts, SSH CA eliminates authorized_keys management. Instead of distributing
individual public keys, a central CA signs short-lived certificates.

**Setup with step-ca:**

1. Initialize CA: `step ca init` (generates SSH host and user CA keys)
2. Configure hosts: add `TrustUserCAKeys /path/to/ssh_user_key.pub` to sshd_config
3. Configure clients: append SSH host CA key to `~/.ssh/known_hosts`
4. Issue certificates: `step ssh certificate user@host` (default: 16h validity)

**Key benefits over static keys:**

| Aspect       | Static Keys                          | SSH Certificates               |
| ------------ | ------------------------------------ | ------------------------------ |
| Provisioning | Update authorized_keys on every host | One-time CA key distribution   |
| Scalability  | O(users \* hosts)                    | O(1) -- CA key on each host    |
| Revocation   | Manual removal from every server     | Natural expiry (short-lived)   |
| Identity     | Bound to key file                    | Bound to identity (principals) |

**Provisioners** control who can request certificates:

- **JWK**: Password-based (simple, for personal homelabs)
- **OIDC**: SSO via Google Workspace, Okta -- enables Single Sign-On SSH

Short-lived certificates (~16h) minimize the window of exposure if a certificate is compromised. Users authenticate with
the CA at the start of their session.

## Fail2ban

Intrusion prevention that monitors logs and bans IPs exhibiting malicious behavior.

### Configuration

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
banaction = nftables-multiport  # Use nftables backend

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 24h
```

### Custom Filters

Create filters for self-hosted services (Nextcloud, Vaultwarden, etc.) that expose login pages. Monitor their auth logs
and ban repeated failures.

### Gotchas

- **Whitelist your own IPs**: Add management IPs to `ignoreip` to avoid locking yourself out.
- **Don't rely solely on fail2ban**: It's a mitigation, not a solution. Disable password auth for SSH entirely.
- **Ban action must match your firewall**: Use `nftables-multiport` for nftables, not the default iptables actions.

## IDS/IPS

### Suricata

High-performance network threat detection engine. Performs deep packet inspection using signature-based rulesets.

**Deployment:**

- OPNsense: Built-in, manageable via UI
- pfSense: Requires package installation
- Linux: Standalone installation, configure via `suricata.yaml`

**Log configuration:**

- `fast.log`: Human-readable alert format, lightweight
- `eve.json`: Rich JSON metadata, but very noisy -- enable only specific app-layer protocols to maintain readability
- Use `fast.log` for CrowdSec integration (simpler parsing)

**Performance tuning:**

- Start with 2-3 essential rulesets -- each ruleset adds CPU overhead
- 3 rulesets typically cause ~27% throughput drop on 1Gbps links
- Disable hardware offloading (CRC, TSO, LRO) if throughput is poor -- offloading conflicts with packet inspection
  engines
- Monitor false positive rate for the first week before adding more rules

### CrowdSec

Collaborative security engine. Detects threats using YAML-based scenarios, shares intelligence with a global community,
and remediates via "Bouncers."

**Architecture:**

- **Security Engine**: Parses logs, matches scenarios, makes decisions
- **Hub**: Repository of community-maintained parsers, scenarios, collections
- **Bouncers**: Enforce decisions (nftables ban, Nginx block, Traefik middleware)
- **Console**: Web dashboard for visualizing alerts and decisions

**Configuration:**

```yaml
# /etc/crowdsec/acquis.d/suricata.yaml
filenames:
  - /var/log/suricata/fast.log
labels:
  type: suricata-fast
```

**Essential post-install steps:**

1. Install collections from Hub for your services: `cscli collections install crowdsecurity/suricata`
2. Configure whitelists immediately -- add management IPs to prevent self-banning
3. Set up a Bouncer for your firewall (nftables) or reverse proxy

**CrowdSec vs fail2ban:**

| Aspect         | fail2ban                                | CrowdSec                                      |
| -------------- | --------------------------------------- | --------------------------------------------- |
| Detection      | Regex patterns on logs                  | YAML scenarios (leakspeed/capacity/blackhole) |
| Intelligence   | Local only                              | Community-shared threat data                  |
| Remediation    | iptables/nftables actions               | Pluggable Bouncers (firewall, proxy, CDN)     |
| Configuration  | jail.conf + filter.d                    | acquis.yaml + Hub collections                 |
| Scaling        | Single host                             | Multi-host with shared decisions              |
| Resource usage | Low RAM, struggles with high log volume | Configurable cache_size for memory control    |

Both can run simultaneously. CrowdSec is the stronger choice for new deployments due to community intelligence and the
separation of detection from remediation.

### Suricata + CrowdSec Integration

The recommended pattern: Suricata detects, CrowdSec decides and remediates.

1. Suricata inspects packets, generates alerts in `fast.log`
2. CrowdSec Security Engine reads `fast.log` via `acquis.yaml`
3. CrowdSec matches alerts against installed scenarios
4. On match, CrowdSec creates a "decision" (ban, captcha, throttle)
5. Bouncer enforces the decision at the firewall or proxy level

**Notifications:** Integrate with Pushover for mobile alerts on CrowdSec decisions. Configure in
`/etc/crowdsec/profiles.yaml` with application and user tokens.

## Firewall Hardening

### Default Deny

Every interface starts with `policy drop` for inbound traffic. Explicitly allow only what's needed. This applies to both
the host firewall (nftables) and the network firewall (OPNsense/pfSense).

### Outbound Filtering

Most homelabbers allow all outbound traffic. This is convenient but dangerous -- a compromised service can exfiltrate
data or contact C2 servers.

Minimum outbound policy:

- Allow DNS only to your designated DNS servers (prevents DNS exfiltration and ensures all queries go through your
  filtering resolver)
- Allow HTTP/HTTPS outbound (for updates and legitimate traffic)
- Block all other outbound from IoT and untrusted VLANs
- Log denied outbound traffic to detect compromise indicators

Per-VLAN outbound rules:

- **Management**: Full outbound (admin access for updates and management)
- **Trusted/Lab**: HTTP/HTTPS + DNS to internal resolver + specific ports as needed
- **IoT**: HTTP/HTTPS + DNS to internal resolver only -- block everything else. IoT devices have no legitimate reason
  for arbitrary outbound
- **Guest**: HTTP/HTTPS + DNS only -- complete isolation from internal networks
- **DMZ**: Restrict to required service ports -- a compromised DMZ service with full outbound access can be used as a
  pivot point

### Restrict Management Access

- Firewall web UIs: Accessible only from management VLAN
- Switch management interfaces: Management VLAN only
- IPMI/iLO/iDRAC: Isolated management VLAN, never on production network
- SSH: Key-based, from management VLAN or via VPN only

## Network Monitoring

### SNMP

Simple Network Management Protocol for monitoring network devices (switches, routers, APs). Most managed switches
support SNMPv2c or SNMPv3.

- **SNMPv2c**: Community-string authentication (essentially a password in plaintext). Acceptable on isolated management
  VLANs only.
- **SNMPv3**: Authentication and encryption. Use when SNMP traffic crosses network boundaries.

### Prometheus + Grafana Stack

- **snmp_exporter**: Scrapes SNMP data from network devices, exposes as Prometheus metrics. Use generator to build
  config from MIBs.
- **blackbox_exporter**: Probes endpoints (ICMP ping, HTTP, DNS, TCP) to monitor reachability and certificate validity.
- **node_exporter**: Host-level metrics (CPU, memory, disk, network interfaces).
- **Grafana dashboards**: Visualize network metrics. Community dashboards exist for common setups.

### What to Monitor

| Metric                            | Source                      | Why                                  |
| --------------------------------- | --------------------------- | ------------------------------------ |
| Interface traffic (bytes/packets) | SNMP / node_exporter        | Capacity planning, anomaly detection |
| Error/discard counters            | SNMP                        | Failing cables, duplex mismatch      |
| DNS query rate and latency        | Pi-hole/AdGuard metrics     | Detect DNS issues or abuse           |
| Certificate expiry                | blackbox_exporter           | Prevent outages from expired certs   |
| Firewall rule hit counts          | nftables counters           | Identify unused rules, detect scans  |
| VPN peer status                   | WireGuard/Tailscale metrics | Detect tunnel failures               |
| Uptime/reachability               | blackbox_exporter ICMP      | Service availability                 |

### Service Health and Auto-Restart

Critical network services (DNS resolvers, reverse proxies, VPN endpoints) can die silently. Without auto-restart, a
failed DNS resolver causes household-wide internet outages until manually noticed.

- **Monit**: Lightweight process monitor. Checks service health and restarts automatically. OPNsense includes Monit
  built-in.
- **systemd watchdog**: For services managed by systemd, configure `WatchdogSec=` and `Restart=on-failure` in the unit
  file.
- **Docker restart policies**: Use `restart: unless-stopped` for containerized network services.

Monitor auto-restart events -- frequent restarts indicate an underlying issue, not a healthy system.

### Log Aggregation

Centralize logs from all network devices and services:

- **Syslog**: Most network devices support syslog output. Point them at a central collector.
- **Loki + Promtail**: Lightweight log aggregation that integrates with Grafana.
- **Graylog**: Full-featured log management with alerting.

Review firewall deny logs weekly during initial setup to catch legitimate traffic being blocked. Reduce review frequency
once rules stabilize.

## DHCP Security

### Reservations Over Static IPs

Prefer DHCP reservations over static IP configuration on devices:

- **Centralized management**: All IP assignments visible in one place (DHCP server)
- **Easier changes**: Update the reservation, renew the lease -- no SSH to the device
- **Consistency**: Devices get the same IP every time via MAC binding
- **DNS integration**: DHCP servers can auto-register hostnames in local DNS

Static IPs are appropriate for: the DHCP server itself, the DNS server, the default gateway, and infrastructure that
must function before DHCP is available.

### DHCP Snooping

On managed switches, enable DHCP snooping to prevent rogue DHCP servers from hijacking client configurations. Mark
switch uplink ports as trusted; all other ports as untrusted.

## General Practices

- **Update firmware**: Switches, routers, APs, firewalls. Unpatched network devices are a common entry point.
- **Backup configurations**: Before any change, backup. Store backups off-device (NAS, git repo, cloud storage).
- **Change default credentials**: Every device, every service. No exceptions.
- **Disable unused services**: SNMP v1/v2 on WAN, UPnP, WPS, remote management on consumer devices.
- **Document your network**: Maintain a network diagram. Update it when changes are made. Future-you will thank
  present-you.
