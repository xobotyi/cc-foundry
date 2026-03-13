# Authentication Proxies

## Authelia vs Authentik

Both are open-source identity providers for self-hosted environments, providing SSO
and MFA to protect web applications from unauthorized access.

### Authelia

- Lightweight: ~20 MB Docker image, ~30 MB RAM
- Apache 2.0 license, no paid edition
- Supports OIDC (certified), TOTP, Duo, WebAuthn, Passkeys
- Configuration via YAML only, no admin GUI
- Access rules by user, group, network, or path
- Ideal for homelabs with limited resources

### Authentik

- Full identity provider: ~690 MB container, requires PostgreSQL
- MIT license with paid Pro/Enterprise editions
- Supports OIDC, OAuth2, SAML2, LDAP, RADIUS, SCIM, Kerberos
- Web GUI with admin portal and user application dashboard
- Visual flow editor for custom login sequences
- Can replace commercial solutions (Okta, Auth0)

### Feature Comparison

| Factor | Authelia | Authentik |
|--------|----------|-----------|
| Resource usage | ~30 MB RAM | ~690 MB + PostgreSQL |
| Config style | YAML files | Web GUI + YAML |
| Protocol support | OIDC | OIDC, SAML2, LDAP, RADIUS, SCIM |
| MFA options | TOTP, WebAuthn, Passkeys, Duo | TOTP, WebAuthn + visual flow editor |
| User portal | Login page only | Full app dashboard |
| Best for | Lightweight SSO for web apps | Full IdP with SAML/LDAP needs |

### Decision

- Choose **Authelia** for lightweight, config-as-code SSO with minimal overhead
- Choose **Authentik** when SAML support, LDAP, or a user dashboard is required

## Forward Auth Integration

### How Forward Auth Works

1. Client sends request to reverse proxy
2. Reverse proxy forwards request headers to auth server
3. Auth server checks session/cookies:
   - **Authenticated**: Returns 200, proxy passes request to backend
   - **Not authenticated**: Returns 401/302, proxy redirects to login page
4. After login, auth server sets session cookie, redirects back to original URL

### Traefik ForwardAuth

Traefik uses `ForwardAuth` middleware to integrate with Authelia or Authentik:

```yaml
# Docker Compose labels for protected service
labels:
  - "traefik.http.routers.app.middlewares=authelia@docker"

# Authelia middleware definition
labels:
  - "traefik.http.middlewares.authelia.forwardauth.address=http://authelia:9091/api/authz/forward-auth"
  - "traefik.http.middlewares.authelia.forwardauth.trustForwardHeader=true"
  - "traefik.http.middlewares.authelia.forwardauth.authResponseHeaders=Remote-User,Remote-Groups"
```

For enhanced security, connect Traefik to Authelia over TLS with client certificates
to ensure only authorized proxies communicate with the auth server.

### Caddy Integration

Caddy can integrate via forward_auth directive or through Tailscale's certificate
provisioning module for internal services with browser-valid certificates.

## SSO and MFA Patterns

### Single Sign-On

- Authelia: Minimalist -- login portal and password reset only
- Authentik: Full app dashboard where users see all authorized services
- Both support cookie-based SSO across subdomains on the same domain

### Multi-Factor Authentication

Modern standards (2025+) emphasize phishing-resistant MFA:

- **FIDO2/WebAuthn**: Hardware tokens or biometric -- resistant to phishing because
  verification is bound to the domain. Preferred over TOTP.
- **TOTP**: Time-based one-time passwords (Google Authenticator, Authy). Widely
  supported but vulnerable to phishing (user can be tricked into entering code on
  a fake site).
- **Passkeys**: Device-bound credentials. Authelia supports these natively.

Prefer FIDO2/WebAuthn for high-value services. TOTP is acceptable for lower-risk
services where hardware tokens are impractical.

## Deployment Patterns

### Service Classification

Classify services by exposure level:

- **Public with own auth**: Services with strong built-in authentication (Nextcloud,
  Gitea) -- can be exposed directly with their own login
- **Public via auth proxy**: Services with weak/no auth -- gate behind
  Authelia/Authentik before exposing
- **VPN/LAN only**: Admin panels (router, Proxmox, NAS), password managers,
  sensitive data -- never expose publicly, access via VPN or management VLAN

### Cloudflare Access Alternative

Cloudflare Access provides a zero-trust layer at the edge:
- Stops traffic at Cloudflare until identity verification passes
- Supports one-time codes, OAuth2 (GitHub, Google), and custom IdPs
- Does not replace local auth proxies -- it adds an additional layer

### Integration with CrowdSec

Layer CrowdSec behind the auth proxy to monitor authentication logs and
automatically block IPs exhibiting brute-force patterns. CrowdSec's community
blocklists provide preemptive blocking of known malicious sources.
