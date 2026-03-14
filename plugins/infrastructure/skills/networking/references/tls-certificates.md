# TLS/SSL Certificate Management

## Let's Encrypt and ACME

Let's Encrypt is a free, automated Certificate Authority. The ACME protocol (RFC 8555) automates domain validation and
certificate issuance.

### How ACME Works

1. **Account creation**: ACME client generates a key pair and registers with the CA.
2. **Domain validation**: CA issues challenges to prove domain ownership.
3. **Certificate issuance**: Client sends a CSR, CA verifies authorization, issues cert.
4. **Renewal**: Same process, automated. Certificates are valid for 90 days; renew at 60 days.
5. **Revocation**: Client signs revocation request with account key.

### Challenge Types

- HTTP-01: CA fetches `http://<domain>/.well-known/acme-challenge/<token>` — public-facing servers with port 80 open
- DNS-01: Client creates `_acme-challenge.<domain>` TXT record — wildcard certs, internal servers, no port 80
- TLS-ALPN-01: CA connects to port 443 with special ALPN protocol — when only port 443 is available

### DNS Challenge for Internal Services

Internal/homelab services typically use DNS-01 challenges because:

- Services may not be publicly accessible (no port 80/443 from internet)
- Wildcard certificates require DNS-01 (no alternative)
- One wildcard cert (`*.home.example.com`) covers all services

### Wildcard Certificates

A wildcard certificate (`*.example.com`) covers all single-level subdomains:

- Matches: `app.example.com`, `grafana.example.com`
- Does NOT match: `app.sub.example.com` (two levels deep)
- Does NOT match: `example.com` (bare domain -- get a separate cert or SAN)

### ACME Clients

- Caddy — Built-in: zero-config HTTPS by default
- Traefik — Built-in: via `certificatesResolvers` config
- certbot — Standalone: original LE client, many plugins
- acme.sh — Standalone: shell-only, no dependencies, many DNS providers
- lego — Standalone: Go binary, CLI and library

### acme.sh with DNS Provider

```bash
# Install
curl https://get.acme.sh | sh

# Set DNS provider credentials (Cloudflare example)
export CF_Email="you@example.com"
export CF_Key="your-global-api-key"

# Issue wildcard certificate
acme.sh --issue -d "*.example.com" --dns dns_cf

# Auto-renewal is configured via cron by the installer
```

### Certificate Storage Patterns

- **Reverse proxy manages certs**: Caddy/Traefik handle issuance and renewal internally. Simplest approach -- the proxy
  is the single point of TLS termination.
- **Centralized cert management**: acme.sh or certbot obtains certs, stores them on shared storage or distributes via
  automation (Ansible). Multiple services reference the same certificate files.
- **Per-service certs**: Each service manages its own certificate. Avoid this in homelabs -- it's error-prone and hard
  to monitor.

### Recommended Approach

Use the reverse proxy as the sole TLS termination point:

```
Client --[HTTPS]--> Reverse Proxy --[HTTP]--> Backend Services
```

- Only the reverse proxy needs certificates
- Backend services run plain HTTP on internal networks
- One place to manage TLS configuration, ciphers, and renewals
- Wildcard cert on the reverse proxy covers everything

### Certificate Monitoring

Monitor certificate expiry. If auto-renewal fails silently, services break when certs expire. Options:

- Prometheus `ssl_exporter` or `blackbox_exporter` (probe HTTPS endpoints)
- `certbot renew --deploy-hook` to trigger alerts on failure
- Uptime monitoring tools (Uptime Kuma) that check certificate validity

### TLS Configuration

When configuring TLS manually:

- **Minimum TLS version**: 1.2 (disable TLS 1.0 and 1.1)
- **Prefer TLS 1.3**: Better performance (fewer round trips) and stronger security
- **HSTS header**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **OCSP stapling**: Enable when supported (reduces client-side certificate checks)
- Don't configure cipher suites manually unless you have a specific reason -- modern defaults (Go's crypto/tls, OpenSSL
  3.x) are already optimal
