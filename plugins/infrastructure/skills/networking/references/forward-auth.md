# Forward Auth

What an Authelia or authentik integration does once the proxy and the identity provider are wired, and the rule that
keeps a backend from trusting an identity header a client wrote.

## The header-injection rule

- **The backend must receive identity headers from the proxy only, and the proxy must strip inbound ones.** Authelia's
  own page states the proxy must ensure only Authelia sets these headers and any other headers are never forwarded to
  the backend; the backend trusts the TCP source of the proxy, not of Authelia; and trusting an entire Docker network is
  not considered secure, because any container on it can then authenticate to any application on it. A proxy container
  needs a static address on the network it shares with the application.
- **Caddy's `forward_auth copy_headers` copies a header only when the auth response contains it**, and on 2.10.0 through
  2.11.1 a client-supplied header of the same name survived when the auth service omitted it (CVE-2026-30851). Traefik's
  `authResponseHeaders` replaces conflicting headers in their canonical dash form only, and `aliasHeadersStrategy`
  defaults to `keep`, so `X_Auth_User` passes to a backend that reads it as the same variable. Write the inbound strip
  explicitly in every proxy.
- **The identity headers are for the proxy-to-backend hop, never for the browser**; a proxy that copies them into the
  response leaks the authenticated identity to the client.
- **authentik rejected policy evaluation entirely on an unparsable `X-Forwarded-For`** such as `a` before 2024.8.3 and
  2024.6.5 (GHSA-7jxf-mmg9-9hg7); oauth2-proxy evaluated skip-auth rules against a client-supplied `X-Forwarded-Uri`
  under `--reverse-proxy` before 7.15.2, which added `--trusted-proxy-ip`.

## Authelia

- **The authz endpoint depends on the proxy, not on preference.** `ForwardAuth` at `/api/authz/forward-auth` serves
  Traefik, Caddy, HAProxy, and Skipper and reads `X-Forwarded-Method`, `X-Forwarded-Proto`, `X-Forwarded-Host`,
  `X-Forwarded-URI`, and `X-Forwarded-For`; `AuthRequest` at `/api/authz/auth-request` serves nginx `auth_request` and
  reads `X-Original-Method` and `X-Original-URL`; `ExtAuthz` serves Envoy. `/api/verify` exists as the `Legacy`
  implementation in 4.38 and later and keeps answering, so a stale config works while options added in 4.38 and later,
  such as `scheme_basic_cache_lifespan`, cannot be used with it. A wrong `X-Forwarded-Proto` or `X-Forwarded-Host`
  changes which rule matches and where the redirect goes.
- **The `AuthRequest` implementation cannot redirect on its own**; nginx's `auth_request` module has no support for it,
  so the `error_page 401` block in the nginx configuration is what turns a bare 401 into a login redirect.
- **Access control is first-match and `default_policy` defaults to `deny`.** A broad `bypass` or `one_factor` rule above
  a stricter one exempts what the stricter one was written for. `bypass` cannot carry a `subject` criterion, and a rule
  with a subject sends the user to authentication as soon as its other criteria match, so a `bypass` for the same
  resource must be ordered first. `resources` are unanchored Go regular expressions over path and query, matched
  case-sensitively; a pattern for `/api` also matches `/public/api-docs`.
- **Every rule domain must be the session cookie domain or a subdomain of it**, and from 4.38 the session configuration
  is a `session.cookies` list: a host not covered by an entry is denied automatically. The cookie domain may not be a
  Public Suffix List entry such as `duckdns.org`, or the browser refuses the cookie and login loops. The default session
  provider is in-memory, so every restart logs everyone out.
- **A secret given through an `AUTHELIA_*_FILE` variable and through any other method stops Authelia from starting**;
  only keys ending in `key`, `secret`, `password`, `token`, or `certificate_chain` load as secrets; and sections that
  are lists of objects (access-control rules, OIDC clients) cannot be configured from the environment at all, so a rule
  supplied that way is silently absent and `default_policy` applies. The reset-password secret is
  `identity_validation.reset_password.jwt_secret`, not a top-level `jwt_secret`.
- **Authelia's own migration page carries nothing for 4.38 or later**; the key changes of those releases are in the
  release blog posts only.
- **Cloudflare in front of Authelia forges `X-Forwarded-For` out of the box** by appending rather than replacing;
  Authelia's forwarded-headers page names Cloudflare and gives a header-transform rule as the fix.

## authentik

- **From 2026.8 authentik trusts forwarded headers only from `AUTHENTIK_LISTEN__TRUSTED_PROXY_CIDRS`**, which defaults
  to RFC 1918 plus loopback and link-local and is replaced, not extended, by a set value. A proxy on a public address
  stops being trusted after the upgrade; the symptoms are HTTPS requests interpreted as HTTP, an endless loading
  indicator from blocked mixed content, and the proxy's address in the logs. An outpost's version must match the
  server's.
- **Single-application mode routes only `/outpost.goauthentik.io/*` to the outpost**; the application's own traffic goes
  to the upstream, and if that path is not routed the login callback 404s. Domain-level mode shares one provider across
  a parent domain and cannot apply per-application policies.
- **Each proxy needs a second route for the outpost path**: Traefik's published snippet adds a router at a higher
  priority matching the path with no middleware; Caddy's snippet must be wrapped in `route` because directive sorting
  otherwise sends the outpost path to the application, and its `copy_headers` names are case-sensitive or arrive empty;
  nginx needs an `auth_request_set` plus `proxy_set_header` pair per header, larger `proxy_buffers` because the identity
  headers are big, and a `Host` on the outpost location matching the external URL.
- **`authentik_host` is the outpost-to-server URL and `authentik_host_browser` the user-facing one**; one internal URL
  for both sends the browser to an address it cannot reach.
- **With header authentication intercepted, authentik consumes a valid `Authorization` header and strips it before
  forwarding**; an application that needs its own credentials never sees them.
