# Caddy

What a Caddyfile does once adapted and loaded, where that differs from how it reads. Caddy 2.x throughout; the minor is
named where a behavior changed.

## Adapter and routing

- **Directives run in a hard-coded order, not the order written.** The adapter sorts by the built-in directive table,
  then matcher specificity, then file order; `route` is the only block that keeps written order. A plugin directive has
  no position in the table and must be placed with the `order` global option or inside `route`, or it never runs.
- **`handle` blocks are mutually exclusive at one nesting level**: only the first matching one runs, and a `handle` with
  no matcher is the fallback. `route` blocks all run. Converting one to the other changes how many blocks a request
  hits.
- **A path matcher is an exact match.** `/foo` matches only `/foo`; `/foo*` also matches `/foobar`; `/foo/*` is usually
  what was meant. An unmatched handler falls through to the next directive and the request ends at a 404 or the wrong
  backend.
- **When several site blocks match, the most specific address wins and the request never cascades** into another block.
  A catch-all block written as a fallback is never reached for an address a more specific block claims.
- **`caddy adapt` succeeding is syntax only**; `caddy validate` (or `adapt --validate`) also provisions every module and
  catches a missing certificate file. `caddy run` starts on a config that adapted with warnings.

## Proxying

- **`reverse_proxy` passes every incoming header through, including `Host`**, and only sets or augments
  `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`. From 2.11.0 the `Host` header is rewritten to the
  upstream address automatically when the upstream scheme is `https://`; `header_up Host {hostport}` opts out.
- **Incoming `X-Forwarded-*` values are discarded unless the client is in `trusted_proxies`**, and no proxy is trusted
  by default. Behind a CDN the real client address is lost and every request logs the CDN's. `trusted_proxies` belongs
  in the `servers` global option; set only on the handler it does not enable client-IP parsing.
- **`trusted_proxies` alone parses `X-Forwarded-For` left to right**, where the leftmost value is client-supplied.
  `trusted_proxies_strict` parses right to left and is off by default. Cloudflare appends to a client-supplied
  `X-Forwarded-For` rather than replacing it, so the leftmost value is whatever the client sent.
- **`reverse_proxy` honors `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` from the environment** unless `network_proxy` is
  set; upstream traffic in a container inherits a forward proxy silently.
- **Every WebSocket is force-closed on config reload** unless `stream_close_delay` is set.
- **`forward_auth` copies a header only when the auth response contains it.** On 2.10.0 through 2.11.1 the client's own
  header of the same name survived when the auth service omitted it (CVE-2026-30851); a `forward_auth` block needs the
  inbound identity headers stripped explicitly, and the forward-auth reference carries the rule.

## TLS

- **Automatic HTTPS is inferred from the site address**: an `http://` prefix, a port other than 443, an IP or
  `localhost`, or a manually loaded certificate disables it, with no log line saying so. `auto_https off` disables
  certificate automation and the redirect; it does not turn a domain site block into a plain-HTTP site, the address
  does.
- **`tls client_auth` with no `trust_pool` defaults to mode `require`**: a client certificate is demanded and not
  verified, and any self-signed certificate passes. The default is `require_and_verify` only once a `trust_pool` is
  given.
- **On-demand TLS must be both enabled and restricted**, and the restriction (`on_demand_tls` with `ask` or
  `permission`) is global, not per site. Unrestricted, any SNI value triggers a certificate order.
- **DNS-01 needs a provider module built in with `xcaddy`**, and when the DNS challenge is enabled the other challenges
  are disabled by default, so there is no fallback if the provider is unreachable. `propagation_delay` defaults to 0 and
  `propagation_timeout` to 2 minutes; a slow provider fails the order and reads like an outage.
- **From 2.10 a configured wildcard is used for its subdomains** instead of per-subdomain certificates;
  `tls force_automate` overrides it. From 2.8 ZeroSSL is added as a fallback issuer only when the `email` global option
  is set.
- **Certificate errors never block startup.** Caddy retries in the background with exponential backoff and moves through
  challenge types and issuers; the process serves with whatever certificate it has and exits 0. A config reload aborts
  in-flight ACME transactions, so a reload loop never finishes an order.

## Process

- **`caddy reload` with an unchanged config is a no-op** unless `--force`; replacing a certificate file on disk and
  reloading does not reload the certificate.
- **`SIGUSR1` reloads the file only for `caddy run` without `--resume` and only until any config change arrives through
  the admin API**, including `caddy reload`. After that the signal is ignored with a log warning, and a deploy script
  that sends it reports success and changes nothing.
- **Every config pushed to the admin API is autosaved**, and `--resume` loads that autosave regardless of `--config`.
- **Exit code 1 means failed startup that will recur**; the documentation says not to restart automatically.
- **Renames with deprecation warnings in 2.8**: `basicauth` to `basic_auth`, `skip_log` to `log_skip`.
