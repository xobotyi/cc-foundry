# VPN Tunnels

## WireGuard

Modern VPN protocol. ~4,000 lines of code in the Linux kernel module. Fast, simple, cryptographically opinionated (no
cipher negotiation).

### Core Concepts

- **Interface**: A virtual network interface (`wg0`) with a private key and listen port.
- **Peer**: A public key + allowed IPs + optional endpoint. Each peer is identified solely by its public key.
- **Allowed IPs**: Acts as both routing table and ACL. Only traffic matching a peer's allowed IPs is sent to/accepted
  from that peer.
- **Cryptokey routing**: Packets are routed based on peer public keys, not IP addresses.

### Key Generation

```bash
umask 077
wg genkey | tee privatekey | wg pubkey > publickey
```

Or generate a preshared key for additional post-quantum security:

```bash
wg genpsk > presharedkey
```

### Configuration

```ini
# /etc/wireguard/wg0.conf
[Interface]
PrivateKey = <server-private-key>
Address = 10.0.0.1/24
ListenPort = 51820
# Optional: run commands on up/down
PostUp = nft add rule inet filter input udp dport 51820 accept
PostDown = nft delete rule inet filter input udp dport 51820 accept

[Peer]
PublicKey = <client-public-key>
PresharedKey = <optional-preshared-key>
AllowedIPs = 10.0.0.2/32
# For site-to-site, include remote subnets:
# AllowedIPs = 10.0.0.2/32, 192.168.2.0/24
```

### Management

```bash
wg-quick up wg0        # Bring interface up
wg-quick down wg0      # Bring interface down
wg show                # Show current peers and stats
systemctl enable wg-quick@wg0  # Persist across reboots
```

### Persistent Keepalive

When a peer is behind NAT, set `PersistentKeepalive = 25` to keep the NAT mapping alive. Without it, incoming packets
may not reach the peer after idle periods. Only enable when needed -- it makes WireGuard slightly more chatty.

### Topologies

- **Hub-and-spoke (star)**: All clients connect to a central server. Simple, but all traffic routes through the hub. Use
  for remote access VPN.
- **Site-to-site**: Two servers with static IPs connect networks. AllowedIPs includes the remote subnet. Requires port
  forwarding (UDP 51820) on both sides.
- **Full mesh**: Every peer connects to every other peer. Complex to manage manually -- this is where Tailscale excels.

### Use When

- Site-to-site tunnels between fixed endpoints with static IPs
- Traditional VPN gateway (full-tunnel routing through home network)
- Zero dependency on external services required
- Resource-constrained devices (routers, embedded systems) -- kernel module uses ~5 MB
- Maximum control over every aspect of the tunnel

## Tailscale

Mesh VPN built on WireGuard. Adds automatic key management, NAT traversal, ACLs, and DNS. The coordination server
handles the control plane; data flows peer-to-peer.

### Architecture

- **Coordination server**: Exchanges public keys and network state between devices. Run by Tailscale Inc., or self-host
  with Headscale.
- **DERP relays**: Fallback when direct connections fail. Encrypted end-to-end -- relays cannot read traffic.
- **Direct connections**: Tailscale uses STUN and other NAT traversal techniques to establish direct WireGuard tunnels
  between peers whenever possible.

### Key Features

| Feature        | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| MagicDNS       | Automatic DNS names for all devices (`hostname.tailnet-name.ts.net`)                |
| ACLs           | Policy engine for access control, defined in JSON/HuJSON                            |
| Exit nodes     | Route all traffic through a specific device (one-click toggle)                      |
| Subnet routers | Advertise local subnets to the tailnet without installing Tailscale on every device |
| Taildrop       | Peer-to-peer file transfer between tailnet devices                                  |
| SSH            | Tailscale SSH eliminates SSH key management                                         |
| Funnel         | Expose services to the public internet via Tailscale's infrastructure               |

### Subnet Router Pattern

Instead of installing Tailscale on every device in a network, run a subnet router:

```bash
# On the subnet router device:
tailscale up --advertise-routes=192.168.1.0/24,192.168.2.0/24

# Enable IP forwarding:
echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf
```

Then approve the routes in the Tailscale admin console.

### Headscale (Self-Hosted)

Open-source reimplementation of the Tailscale coordination server. Full control over the control plane, but you manage
the infrastructure. Tailscale clients connect to your Headscale instance instead of Tailscale's servers.

### Use When

- Multiple devices across different networks need mesh connectivity
- NAT traversal required (CGNAT, hotel WiFi, mobile networks)
- Want DNS-based service discovery without manual configuration
- Need access controls without writing iptables rules
- Sharing access with other users via SSO

## WireGuard vs Tailscale Decision

| Factor              | WireGuard                    | Tailscale                    |
| ------------------- | ---------------------------- | ---------------------------- |
| Topology            | Hub-and-spoke                | Full mesh                    |
| NAT traversal       | Manual port forwarding       | Automatic                    |
| Key management      | Manual                       | Automatic                    |
| Config complexity   | High (per-peer config files) | Zero-config (SSO login)      |
| External dependency | None                         | Coordination server          |
| RAM overhead        | ~5 MB (kernel module)        | ~30-50 MB (userspace daemon) |
| DNS                 | Manual setup                 | MagicDNS (automatic)         |
| ACLs                | iptables / nftables          | Built-in policy engine       |
| Cost                | Free (GPLv2)                 | Free up to 100 devices       |

### Topology Resilience

Hub-and-spoke has a **single point of failure**: if the hub goes down, the entire VPN is unreachable. Mesh (Tailscale)
is resilient -- if one node fails, all other nodes remain connected to each other. Mesh can also be faster for
device-to-device traffic because it avoids routing through a central bottleneck.

Choose topology based on failure tolerance requirements, not just convenience.

### Hybrid Pattern

Common to run both:

- **Tailscale** for day-to-day remote access to services (mesh, zero-config)
- **WireGuard** as backup VPN gateway for full-tunnel routing or when Tailscale's coordination server is unreachable

## High Availability Site-to-Site

For multi-location homelabs requiring redundancy, deploy parallel WireGuard routers with dynamic routing for automatic
failover.

### Architecture

```
Site A                          Site B
Router 1 ---[WG tunnel]--- Router 3
Router 2 ---[WG tunnel]--- Router 4
    |                           |
  OSPF                        OSPF
    |                           |
 LAN Router                  LAN Router
```

Two independent WireGuard tunnels provide redundancy. OSPF tracks link state and reroutes traffic within seconds if one
tunnel fails.

### WireGuard Configuration for OSPF

Key differences from standard WireGuard config:

- **`AllowedIPs = 0.0.0.0/0, ::/0`**: Pass all packets to the peer, letting the routing daemon decide where traffic goes
- **`Table = off`**: Prevent `wg-quick` from adding static routes that conflict with OSPF's dynamic routing
- Each router pair shares a private transit subnet (e.g., `10.99.13.0/24`)

### BIRD Routing Daemon

Use BIRD 2.x for OSPF between WireGuard routers:

- Assign unique Router IDs (by convention, matching the router's IP)
- Define OSPF areas for each tunnel pair
- Export site subnets to share with the remote site
- Filter out transit subnets (WireGuard link IPs) from propagation to LAN
- Alternative: use iBGP instead of OSPF for LAN router integration

### Failover Behavior

When a WireGuard link fails:

1. OSPF detects link-state change (dead interval, typically 40s)
2. OSPF updates routing table on all routers
3. LAN routers reroute traffic through the surviving tunnel
4. Convergence within seconds of detection

### DNS Across Sites

- Use conditional forwarding: Site A's DNS forwards `*.site-b.lan` queries to Site B's DNS server
- Use a real domain (not `.lan` or `.local`) for wildcard SSL certificate support
- Tailscale alternative: MagicDNS automatically resolves hostnames across the entire tailnet without manual DNS
  configuration

## OpenVPN

Legacy. Slower, more complex, larger attack surface than WireGuard. Only choose OpenVPN when you specifically need
TCP-based tunneling to bypass restrictive firewalls that block UDP. For all new deployments, use WireGuard or Tailscale.
