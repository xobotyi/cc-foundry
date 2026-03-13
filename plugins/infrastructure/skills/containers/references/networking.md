# Container Networking

## Network Driver Selection

| Driver                  | Isolation       | Performance | Use Case                                    |
| ----------------------- | --------------- | ----------- | ------------------------------------------- |
| `bridge` (user-defined) | Container-level | Good        | Default for single-host apps                |
| `bridge` (default)      | Container-level | Good        | Quick testing only — no DNS                 |
| `host`                  | None            | Native      | Performance-critical (no NAT overhead)      |
| `macvlan`               | Full L2         | Native      | Containers need LAN presence (unique MAC)   |
| `ipvlan` (L2)           | Full L2         | Native      | Like macvlan but shared MAC (switch limits) |
| `ipvlan` (L3)           | Full L3         | Native      | Routed container networking                 |
| `none`                  | Complete        | N/A         | Security-sensitive isolated workloads       |

## Bridge Networks (Default Choice)

### User-defined vs default bridge

Always use user-defined bridge networks — never the default `docker0` bridge.

| Feature        | Default bridge  | User-defined bridge            |
| -------------- | --------------- | ------------------------------ |
| DNS resolution | No (IP only)    | Yes (by container name)        |
| Isolation      | Shared with all | Per-network                    |
| Hot-connect    | No              | Yes (`docker network connect`) |
| Custom subnets | No              | Yes                            |

### Create and use

```bash
docker network create mynet
docker run --network mynet --name app myimage
docker run --network mynet --name db postgres:17
# "app" can reach "db" by name
```

```yaml
# compose.yml — automatic per-project network
services:
  app:
    networks:
      - backend
  db:
    networks:
      - backend

networks:
  backend:
```

## Host Networking

```bash
docker run --network host myimage
```

Container shares the host's network namespace — no port mapping needed, no NAT overhead. Use when:

- Application binds to many dynamic ports (media servers)
- Maximum network performance is required
- Container needs access to host network interfaces

Not available on Docker Desktop (macOS/Windows) — only Linux.

## Macvlan Networks

Containers appear as physical devices on the LAN with unique MAC addresses.

```bash
docker network create -d macvlan \
    --subnet=192.168.1.0/24 \
    --gateway=192.168.1.1 \
    -o parent=eth0 \
    macnet

docker run --network macnet --ip 192.168.1.100 myimage
```

Use when containers need to be directly addressable on the physical network (IoT gateways, DHCP servers, legacy apps).

**Gotcha:** The host cannot communicate with macvlan containers through the parent interface. Create a macvlan
sub-interface on the host for host-to-container communication.

## IPvlan Networks

Similar to macvlan but containers share the parent interface's MAC address.

```bash
# L2 mode (default) — same subnet as host
docker network create -d ipvlan \
    --subnet=192.168.1.0/24 \
    --gateway=192.168.1.1 \
    -o parent=eth0 \
    ipvnet

# L3 mode — routed, no broadcast/multicast
docker network create -d ipvlan \
    --subnet=10.10.0.0/24 \
    -o parent=eth0 \
    -o ipvlan_mode=l3 \
    ipvl3net
```

Use L2 when switch limits MAC count. Use L3 for routed container networking.

## Port Publishing

```bash
# Map host:container
docker run -p 8080:80 myimage

# Bind to specific interface
docker run -p 127.0.0.1:8080:80 myimage

# Random host port
docker run -p 80 myimage
```

```yaml
services:
  app:
    ports:
      - "8080:80"           # host:container
      - "127.0.0.1:9090:80" # localhost only
```

- Bind to `127.0.0.1` when the service should not be externally accessible
- Docker port mapping bypasses `iptables`/`ufw` firewall rules by default — published ports are accessible from outside
  the host regardless of firewall configuration
- Use `DOCKER_IPTABLES=false` or configure `daemon.json` to prevent this

## DNS and Service Discovery

- User-defined bridge networks provide automatic DNS — containers resolve each other by name
- The embedded DNS server (`127.0.0.11`) forwards external lookups to host-configured DNS servers
- `--dns` flag overrides DNS servers per container
- `--network-alias` adds additional DNS names for a container
- Compose services are resolvable by service name within shared networks

## Multi-network Patterns

```yaml
services:
  proxy:
    networks:
      - frontend

  app:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend

networks:
  frontend:
  backend:
    internal: true
```

- `proxy` can reach `app` but not `db`
- `db` has no external network access (`internal: true`)
- `app` bridges both networks

## Common Networking Mistakes

### Services binding to localhost

A service inside a container that binds to `127.0.0.1` is unreachable from other containers — `localhost` refers to the
container's own isolated network namespace. Services must listen on `0.0.0.0`.

### Docker iptables bypass

Docker automatically installs iptables rules for port publishing. These rules bypass `ufw`, `firewalld`, and other host
firewalls — published ports are accessible from the network regardless of firewall configuration.

Mitigations:

- Bind published ports to `127.0.0.1` and use a reverse proxy
- Set `"iptables": false` in `/etc/docker/daemon.json` (requires manual network rule management)
- Use `internal: true` on backend networks

### DNS failures on default bridge

The default `docker0` bridge network does not provide DNS resolution — containers can only reach each other by IP.
Always use user-defined networks for service discovery.

If external DNS fails, check `/etc/resolv.conf` inside the container. Override with `--dns` per container or in
`daemon.json`.

### Stale DNS after container recreation

Docker's embedded DNS caches entries briefly. After recreating a container, old IPs may persist. Use
`docker network disconnect` / `connect` or restart dependent containers to refresh DNS.

### Port conflicts

`-p 80:80` fails if port 80 is already in use on the host. With host networking, multiple containers cannot share the
same port. Use a reverse proxy to multiplex services on a single published port.

## Reverse Proxy Pattern

In production, only the reverse proxy publishes ports. All backend services stay on internal networks:

```yaml
services:
  proxy:
    image: caddy:2
    ports:
      - "443:443"
      - "80:80"
    networks:
      - edge

  app:
    networks:
      - edge
      - backend

  db:
    networks:
      - backend

networks:
  edge:
  backend:
    internal: true
```

Benefits:

- Centralized TLS termination
- Rate limiting and access logs in one place
- Backend services invisible to the network
- Single point of port management
