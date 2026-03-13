# Reverse Proxy

## Role in Self-Hosted Architecture

A reverse proxy is the single entry point for all HTTP/HTTPS services. It terminates
TLS, routes requests by hostname to backend services, and eliminates the need to expose
multiple ports to the network.

```
Client -> Reverse Proxy (443) -> service-a:8080
                               -> service-b:3000
                               -> service-c:8443
```

## Caddy

Automatic HTTPS by default. Minimal configuration. Ideal when you want TLS to "just
work" without thinking about certificate management.

### Key Characteristics

- **Automatic HTTPS**: Obtains and renews certificates from Let's Encrypt/ZeroSSL
  automatically. No configuration needed for publicly-accessible domains.
- **Caddyfile syntax**: Declarative, minimal. Site address implies HTTPS.
- **Wildcard certificates**: Supported via DNS challenge with provider plugins
  (e.g., `caddy-dns/cloudflare`).
- **Automatic HTTP->HTTPS redirect**: Enabled by default.
- **On-Demand TLS**: Obtain certificates at request time for unknown domains.

### Caddyfile Structure

```caddyfile
{
    email admin@example.com              # Global options block
    acme_dns cloudflare {env.CF_TOKEN}   # DNS challenge for wildcards
}

# Reverse proxy with automatic HTTPS
app.example.com {
    reverse_proxy localhost:8080
}

# Multiple upstreams with load balancing
api.example.com {
    reverse_proxy app-01:8080 app-02:8080 {
        lb_policy round_robin
        health_uri /health
        health_interval 30s
    }
}

# Wildcard with host matching
*.example.com {
    tls {
        dns cloudflare {env.CF_TOKEN}
    }

    @grafana host grafana.example.com
    handle @grafana {
        reverse_proxy grafana:3000
    }

    @prom host prometheus.example.com
    handle @prom {
        reverse_proxy prometheus:9090
    }

    handle {
        respond "Unknown service" 404
    }
}
```

### Key Directives

- `reverse_proxy`: Proxy requests to upstreams. Supports load balancing, health
  checks, header manipulation, buffering.
- `file_server`: Serve static files.
- `handle` / `handle_path`: Group directives by path or matcher.
- `import`: Reuse snippets or include external config files.
- `tls`: Override TLS settings (internal CA, DNS challenge, client certs).
- `encode`: Enable gzip/zstd compression.

### Upstream Syntax

```
reverse_proxy localhost:8080            # Single upstream
reverse_proxy app:8080 app2:8080        # Multiple upstreams
reverse_proxy unix//run/app.sock        # Unix socket
reverse_proxy srv+https://my.service    # SRV record lookup
```

### Snippets for Reuse

```caddyfile
(security-headers) {
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}

app.example.com {
    import security-headers
    reverse_proxy localhost:8080
}
```

## Traefik

Dynamic, container-aware reverse proxy. Discovers services automatically via Docker
labels, Kubernetes ingress, or file-based configuration.

### Key Characteristics

- **Dynamic configuration**: Detects Docker containers, Kubernetes services, and file
  changes without restart.
- **Docker integration**: Labels on containers define routing rules.
- **Middleware chain**: Composable middleware for auth, rate limiting, headers, etc.
- **Dashboard**: Built-in monitoring dashboard.
- **Let's Encrypt integration**: Automatic certificate management with HTTP and DNS
  challenges.

### Docker Labels Pattern

```yaml
services:
  app:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      - "traefik.http.services.app.loadbalancer.server.port=8080"
```

### Static Configuration (traefik.yml)

```yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /etc/traefik/acme.json
      dnsChallenge:
        provider: cloudflare

providers:
  docker:
    exposedByDefault: false
  file:
    directory: /etc/traefik/dynamic/
```

## Nginx Proxy Manager

GUI-based reverse proxy management built on Nginx. Lowest learning curve.

### Key Characteristics

- **Web UI for everything**: Add proxy hosts, SSL certificates, access lists, and
  redirections via browser.
- **Let's Encrypt integration**: One-click certificate provisioning and renewal.
- **Access lists**: IP-based allow/deny lists via UI.
- **Custom Nginx config**: Advanced users can inject raw Nginx configuration.
- **Best for**: Users who prefer GUI management and don't need container-aware
  dynamic routing.

## Decision Criteria

| Factor | Caddy | Traefik | Nginx Proxy Manager |
|--------|-------|---------|---------------------|
| Config style | Caddyfile (declarative) | YAML + Docker labels | Web UI |
| Auto HTTPS | Default behavior | Via cert resolvers | One-click |
| Docker-aware | Plugin | Native | No |
| Learning curve | Low | Medium | Lowest |
| Wildcard certs | DNS challenge plugin | DNS challenge | DNS challenge |
| Performance | Excellent | Excellent | Excellent (Nginx) |
| Middleware/plugins | Moderate ecosystem | Rich middleware | Limited (raw Nginx) |
| Best for | Simple setups, auto-TLS | Docker/K8s environments | GUI preference |

### Recommendations

- **Docker-heavy environment**: Traefik. Dynamic discovery eliminates config management.
- **Simplicity-first**: Caddy. Automatic HTTPS, minimal config, easy to reason about.
- **GUI management**: Nginx Proxy Manager. Point-and-click for non-CLI users.
- **Maximum control**: Raw Nginx or Caddy with JSON config for complex routing needs.

## Cloudflare Tunnels

Cloudflare Tunnels expose internal services to the internet without opening inbound
firewall ports. The `cloudflared` daemon initiates outbound connections to Cloudflare's
edge network, which routes incoming traffic back through the tunnel.

### Architecture

```
Internet -> Cloudflare Edge -> cloudflared (outbound conn) -> Local Service
```

### Common Patterns

- **Direct exposure**: `cloudflared` routes directly to a local service port.
  Simplest, but each service needs separate tunnel configuration.
- **Tunnel to reverse proxy**: Route the tunnel into Traefik/Caddy/NPM.
  The local proxy handles routing, SSL termination, and auth middleware.
  More flexible -- one tunnel serves all services.
- **With auth layer**: Layer Authelia/Authentik behind the tunnel for SSO/MFA,
  or use Cloudflare Access at the edge for zero-trust gating.

### Cloudflare Access (Zero Trust)

Cloudflare Access adds identity verification at the edge before traffic reaches
the tunnel:
- One-time codes via email
- OAuth2 (GitHub, Google, Microsoft)
- Custom IdP integration
- Stops all traffic until identity is verified -- service is invisible to
  unauthenticated scanners

### Limitations and Risks

- **Not a security layer**: A tunnel makes services accessible, not secure. Weak
  credentials and unpatched software remain exploitable.
- **ToS for media**: Streaming services (Jellyfin, Plex) through Cloudflare CDN
  may violate Terms of Service if caching is enabled. Disable caching for media
  subdomains.
- **Non-HTTP edge cases**: Proxying non-HTTP protocols (SSH, databases) through
  tunnels can introduce unexpected behavior. Use VPN for non-web protocols.
- **Management complexity**: Automating tunnel creation via API or Docker container
  requires custom scripting for updates and migrations.

### What NOT to Expose via Tunnels

- **Admin panels**: Router, Proxmox, NAS management -- keep on VPN/LAN
- **Password managers**: Vaultwarden and similar -- too sensitive for public access
- **LAN-only tools**: IoT hubs, printer dashboards -- assume trusted network
- **Sensitive data portals**: Private document systems, personal databases

For these services, use Tailscale/WireGuard VPN for remote access instead.

## Auth Proxy Integration

When using a reverse proxy with authentication middleware:

### Traefik + Authelia

```yaml
# Protected service with ForwardAuth middleware
services:
  app:
    labels:
      - "traefik.http.routers.app.middlewares=authelia@docker"
      - "traefik.http.routers.app.rule=Host(`app.example.com`)"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
```

### Service Classification

- **No auth needed**: Public content (blogs, documentation, status pages)
- **Own auth sufficient**: Services with strong built-in auth (Nextcloud, Gitea)
- **Auth proxy required**: Services with weak/no auth (dashboards, internal tools)
- **VPN only**: Admin interfaces, sensitive data -- never proxy publicly
