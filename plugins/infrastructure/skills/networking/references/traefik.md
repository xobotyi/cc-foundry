# Traefik

What a Traefik configuration does once loaded. Traefik v3 throughout; v2 syntax is named only where it fails on v3. Only
the 3.7 line has security support: 3.6 ended 2026-08-16 and 2.11 ended 2026-09-07.

## v2 syntax on v3

- **v3 parses v2 rule syntax only with `core.defaultRuleSyntax: v2`** in the static configuration or `ruleSyntax` per
  router, and both options are deprecated since v3.4 for removal at the next major. A v2 rule that fails to parse leaves
  the router unbuilt and the host unrouted.
- **Every v3 matcher takes one value**: ``Host(`a`) || Host(`b`)``, not ``Host(`a`, `b`)``. `Path` and `PathPrefix` lost
  placeholder support (``Path(`/route/{id}`)`` matches nothing), `PathPrefix` lost regular expressions, and every
  `*Regexp` matcher uses Go syntax. `Headers` and `HeadersRegexp` became `Header` and `HeaderRegexp`; `IPWhiteList`
  became `IPAllowList`.
- **Keys that prevent startup on v3**: `providers.docker.swarmMode` (Swarm is `providers.swarm`), `tls.caOptional`
  anywhere, the Marathon and Rancher providers, the non-OpenTelemetry tracing exporters, and the removed Headers options
  `sslRedirect`, `sslHost`, `featurePolicy`, `forceSlash`, `preferServerCipherSuites`.
- **`Content-Type` is not auto-detected in v3**; a backend that omits it needs the `ContentType` middleware or browsers
  download instead of render.

## Static versus dynamic

- **`certificatesResolvers` is static configuration and is silently ignored in a dynamic file**; routers referencing it
  serve the self-signed `TRAEFIK DEFAULT CERT`. Defining a resolver makes no router use it; each router or entry point
  must reference it by name.
- **A router with no `entryPoints` attaches to every entry point**, so a router meant for 443 also answers on 80 in the
  clear and a middleware chain written for one entry point covers the other.
- **Router priority defaults to the character length of the rule.** Adding a matcher reorders routing, and a longer
  unprotected rule wins over a shorter protected one; `priority: 0` means "use rule length".
- **TLS options are mapped to host names, not routers.** Two routers on one entry point serving one host with different
  `tls.options` conflict, and the conflict falls back to `default`, dropping a `clientAuth` requirement with no error
  (GHSA-g55h-rg46-x9c5). `core.strictTLSOptions` (3.7.11 and later, off by default) marks the conflicting routers in
  error instead.

## Docker provider

- **`exposedByDefault` is `true`** and the default rule is ``Host(`{{ normalize .Name }}`)``, so every container on the
  watched daemon is routed at a hostname nobody wrote down, with no middleware.
- **When a container exposes several ports Traefik uses the lowest**, which is the metrics or debug port as often as the
  application; `loadbalancer.server.port` names it.
- **Declaring a TCP router for a container suppresses the automatic HTTP router.**

## Forwarded headers and ForwardAuth

- **`forwardedHeaders.trustedIPs` is unset by default on every entry point**, so `X-Forwarded-*` from an untrusted
  source is stripped and the real client address behind a CDN is lost; `forwardedHeaders.insecure: true` trusts
  everything, including the client. `X-Forwarded-Prefix` joined the stripped set only in v3.2.1.
- **ForwardAuth `authRequestHeaders` unset sends every request header to the auth server**, cookies and `Authorization`
  included. `authResponseHeaders` copies the listed headers and replaces conflicting ones, in their exact canonical
  names only. `trustForwardHeader` is deprecated (v3.6.14) and its unset behavior is inconsistent across the
  `X-Forwarded-*` set.
- **Header names that alias to the same backend variable pass through by default.** Go canonicalizes on dashes only, so
  `X-Auth-User`, `X_Auth_User`, and `X.Auth.User` are three headers to Traefik and one `HTTP_X_AUTH_USER` to a CGI,
  WSGI, PHP, or nginx backend. `aliasHeadersStrategy` (v3.7.12, replacing `underscoreHeadersStrategy` from v3.6.20)
  defaults to `keep`; `delete` or `reject` closes the smuggling path a ForwardAuth middleware otherwise leaves open.
  Traefik logs a startup warning per entry point that has no strategy set.

## Paths

- **Request paths are sanitized by default from v3.3.6** (`/../`, `/./`, `//` collapse) and percent-encoding is
  normalized unconditionally from v3.4.1. Encoded restricted characters (`%2F`, `%5C`, `%00`, `%3B`, `%3F`, `%23`,
  `%25`) are rejected by default in v3.6.4 and allowed again from v3.6.7 through `encodedCharacters`.
- **``Host(`*`)`` became a catch-all in v3.7.7**; before that it matched single-label hosts only. `Host` gained
  single-label wildcard matching (`*.example.com`) in v3.7.0, v3 syntax only.
- **From v3.7.13 the `Upgrade: h2c` and `HTTP2-Settings` request headers are not forwarded**; a cleartext HTTP/2 backend
  is declared with the `h2c://` scheme.

## ACME

- **The DNS-01 propagation keys were renamed in v3.3**: `acme.dnsChallenge.delayBeforeCheck` became
  `propagation.delayBeforeChecks` and `disablePropagationCheck` became `propagation.disableChecks`; the old keys are
  ignored with a log line, so a configured delay stops applying after the upgrade. The defaults are `0s` and `false`.
- **`acme.certificatesDuration` (default 2160 hours) is used exclusively to compute renewal dates**, never the
  certificate's own `notAfter`. Under a short-lived profile the assumed 90-day lifetime renews far too late.
- **`acme.keyType` defaults to `RSA4096`.** ACME storage is a file and is documented as not distributed; replicas
  sharing one `acme.json` race.
- **Traefik retries through a Let's Encrypt 429** every few seconds and prolongs the ban (issue 11912).
- **OCSP stapling runs only for a certificate that carries a responder URL**; Let's Encrypt certificates carry none, so
  the `ocsp` option does nothing for them and logs nothing.

## API

- **`api.insecure` publishes the dashboard on the `traefik` entry point (port 8080) with no authentication** the moment
  it is set; `api: true` enables `api.dashboard` as a side effect.
