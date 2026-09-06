---
name: networking
description: >-
  Write and review network configuration for self-hosted Linux infrastructure: what an nftables ruleset, a resolver
  zone, a reverse-proxy site, a forward-auth chain, a WireGuard or Tailscale tunnel, or an IDS rule does once loaded,
  where that differs from what the file reads. Not how a change is applied or verified.
when_to_use: >-
  Invoke whenever network configuration is touched at all — writing or reviewing an nftables, firewalld, ufw, OPNsense,
  or pfSense ruleset, a VLAN, bridge, route, or sysctl, an Unbound, Pi-hole, AdGuard Home, dnsmasq, or systemd-resolved
  config, a Caddyfile, a Traefik or nginx config, an ACME or TLS setting, an Authelia or authentik integration, a
  WireGuard, Tailscale, Headscale, or cloudflared config, or a Suricata, CrowdSec, or fail2ban setup. Also invoke on
  the symptoms: a rule that loads clean and filters nothing, a published Docker port reachable through a denying
  firewall, an internal name that resolves to its public address or to NXDOMAIN, a proxy that logs the CDN's address
  or trusts a client-supplied identity header, a tunnel with a fresh handshake and no traffic, a banned IP that stays
  connected, or an IDS that alerts and drops nothing. Covers what the artifact does; applying it and proving its
  effect belongs to devops, container networking modes to containers, the hypervisor bridge to proxmox.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Three biases decide most calls:

- **Evaluation order belongs to the engine, not the file.** nftables runs every base chain on a hook by priority and
  only `drop` is final; Caddy sorts directives by a built-in table; nginx discards inherited `proxy_set_header` the
  moment one is set lower; Traefik ranks routers by rule length; Authelia and cloudflared take the first match. Read the
  engine's order before trusting the file's.
- **Who is trusted is a list, and every tool ships a different one.** Caddy trusts no proxy for `X-Forwarded-*`, HAProxy
  and Cloudflare append the client's, Unbound refuses every client but localhost, AdGuard Home on `0.0.0.0` answers the
  internet, Avahi reflects to every interface, Tailscale on Linux accepts no routes, NetBird pushes them unapproved.
  Name the list in the config; never assume its direction.
- **Every filter has a second path around it.** IPv6 beside an `ip` rule in an `inet` table; a published container port
  beside the host `input` chain; a flowtable beside the later hooks; a reachable origin beside Cloudflare Access; an
  established connection beside a CrowdSec ban; a default-bridge container beside the LAN resolver. Close the second
  path or state that it is open.

## Filtering

- **`accept` ends only the current base chain; `drop` ends the ruleset.** A permissive table added beside the one
  Proxmox, Docker, or firewalld installs loads clean and changes nothing. A `nat` chain at priority -200 or below runs
  before conntrack and translates nothing.
- **`ip` payload expressions match IPv4 only, also inside `inet`.** `ip protocol tcp` passes every IPv6 packet;
  `meta l4proto tcp` matches both and skips IPv6 extension headers.
- **`flush ruleset` deletes every table on the host**, Docker's, firewalld's, and netavark's included, and no daemon
  notices until restart. `flush table <family> <name>` is the scoped form. `nft -c -f` parses; it knows nothing about
  interface names, runtime-populated sets, or a higher-priority table that drops first.
- **A published Docker port never traverses the host `input` chain**; it is DNAT and passes `forward`. Operator rules go
  in `DOCKER-USER` on the iptables backend. Under the nftables backend (Engine 29.0, experimental) there is no
  `DOCKER-USER` chain and no jump to it; a daemon switched between backends keeps the stale jump. Engine 28.0 blocks
  direct-routed access to unpublished ports through the `raw` table.
- **On OPNsense and pfSense the order is floating, then group, then interface, and `quick` first-match is the default.**
  A rule change does not touch the state table, so a new deny does nothing to a live session until states are reset, and
  the default deny logs nothing unless told to.

Read [`${CLAUDE_SKILL_DIR}/references/filtering.md`] when writing or reading an nftables ruleset, a host that also runs
Docker, Podman, firewalld, or ufw, or an OPNsense or pfSense rule; it carries the evaluation, loading, coexistence, and
appliance rules and the kernel versions each feature needs.

## Addressing and routing

- **A Linux bridge with `vlan_filtering 0` forwards tagged frames on every port.** That is the VLAN leak on a hypervisor
  bridge. With filtering on, a port with no PVID drops every untagged frame, and turning filtering on before adding the
  VLANs drops the management session.
- **The effective `rp_filter` is the maximum of `conf/all` and the interface**, and systemd's shipped sysctl file sets
  every present interface to 2 while excluding `conf/all`, so a write to `all` succeeds and changes nothing. An
  rp_filter drop shows in `tcpdump` and never in conntrack.
- **`accept_ra` at its default stops processing router advertisements when forwarding is turned on**; a router that gets
  its WAN address from RA needs value 2. A dual-stack host prefers IPv4 over a ULA destination (RFC 6724), so a ULA-only
  service never exercises its IPv6 rules.
- **A path-MTU black hole is a connection that establishes and stalls on volume.** The fix is passing ICMPv6 type 2 and
  ICMP fragmentation-needed on the path, and MSS clamping in `forward` with `rt mtu` for both directions.
- **`KeepConfiguration=` defaults to `no`**, so restarting systemd-networkd drops DHCP addresses and routes with the SSH
  session on them; `netplan try` reverts after 120 seconds and its own man page says to check whether it did.

Read [`${CLAUDE_SKILL_DIR}/references/routing.md`] when writing a VLAN, bridge, route, policy rule, sysctl, MTU, IPv6,
networkd, netplan, or DHCP setting; it carries the bridge, reverse-path, policy-routing, IPv6, and manager rules.

## DNS

- **Docker rewrites a container's `resolv.conf`.** Loopback nameservers inherited from the host are removed, and when
  nothing is left Google's resolvers are substituted, so on a systemd-resolved host every default-bridge container
  bypasses the LAN filter. A `--dns 127.0.0.53` override resolves inside the container's namespace and always fails.
- **The resolved stub owns `127.0.0.53:53` by default**, and only the stub-mode symlink routes clients through resolved;
  uplink mode bypasses it. Another daemon binding the wildcard on port 53 fails until `DNSStubListener=no`.
- **Unbound refuses every client but localhost until `access-control` allows it, listens on localhost until `interface:`
  names another, and changes interfaces only on restart.** `home.arpa` is a default static zone, so a zone or forwarder
  under it is shadowed until declared with another type or `nodefault`; `do-not-query-localhost` defaults to `yes`, so a
  forwarder on `127.0.0.1` gets SERVFAIL.
- **Pi-hole v6 is a different surface from v5.** Every container variable was renamed to `FTLCONF_<section>_<key>`,
  nineteen were removed, an unknown one is ignored, an env-supplied setting is read-only in the UI, `/etc/dnsmasq.d` is
  ignored unless `misc.etc_dnsmasq_d` is set, and the web server falls back to 8080 when 80 is taken. FTL 6.3 renamed
  `dns.domain` to `dns.domain.name`.
- **AdGuard Home overwrites an edit made to `AdGuardHome.yaml` while running**, `allowed_clients` set makes
  `disallowed_clients` ignored, and `bind_hosts: ['0.0.0.0']` with neither is an open resolver whose first signal is an
  abuse notice.
- **Private naming**: `.local` is mDNS and some hosts never ask the LAN resolver for it; `home.arpa` is unsigned by
  design; no public CA issues for `.lan`, `.home`, `.internal`, or any unregistered suffix, so internal TLS needs a
  registered domain or a private CA. A wildcard covers one label and not the bare domain.
- **Avahi's reflector reflects to every interface it joined**, and it joins every interface except loopback and
  point-to-point unless `allow-interfaces` scopes it.

Read [`${CLAUDE_SKILL_DIR}/references/dns.md`] when touching resolved, a container's DNS, search domains, private
naming, caching, or mDNS, and [`${CLAUDE_SKILL_DIR}/references/resolvers.md`] when writing Unbound, Pi-hole, AdGuard
Home, dnsmasq, CoreDNS, or Knot Resolver configuration; the second carries the per-daemon defaults, the local-zone
types, the renamed keys, and the upstream syntax.

## Proxies and TLS

- **Header trust differs per proxy.** Caddy discards inbound `X-Forwarded-*` unless the sender is in `trusted_proxies`,
  and even then parses `X-Forwarded-For` left to right unless `trusted_proxies_strict` is set; Traefik strips unless
  `forwardedHeaders.trustedIPs` names the sender; nginx's realip module replaces nothing until `set_real_ip_from` is
  set; HAProxy's `option forwardfor` and Cloudflare append the client's value. Read `CF-Connecting-IP` behind
  Cloudflare, never the first `X-Forwarded-For`.
- **Caddy sorts directives by a built-in table**, `handle` blocks are mutually exclusive, a path matcher is exact, and a
  site block never cascades. `auto_https off` does not make a domain site block serve HTTP; the address does.
  `tls client_auth` with no `trust_pool` demands a certificate and verifies nothing. A `caddy reload` with an unchanged
  file is a no-op, and `SIGUSR1` is ignored once the admin API has been used.
- **Traefik v3 rejects v2 rule syntax** unless `core.defaultRuleSyntax: v2`, itself deprecated. `certificatesResolvers`
  in a dynamic file is ignored and the default self-signed certificate is served; a router with no `entryPoints`
  attaches to all of them; priority is rule length; `exposedByDefault` is `true`; a header whose name aliases to the
  same backend variable passes through by default. Renewal is computed from `acme.certificatesDuration`, never from the
  certificate.
- **nginx `proxy_set_header` at any level discards every inherited one**, `proxy_pass` with a URI replaces the matched
  prefix and without one passes the request URI unchanged, and a literal upstream hostname is resolved once at start
  unless `resolve` (open source from 1.27.3) or a variable plus `resolver` is used.
- **ACME as written**: HTTP-01 is port 80 only, validation prefers AAAA and retries IPv4 only on a timeout, a wildcard
  is one label and not the apex, DNS-01 propagation waits default near zero, and rate limits are token buckets a retry
  loop drains. ARI overrides the client's renewal window. The lifetime schedule, the profile facts, and the rate-limit
  numbers are in the devops skill's `references/secrets.md`.

Read [`${CLAUDE_SKILL_DIR}/references/caddy.md`], [`${CLAUDE_SKILL_DIR}/references/traefik.md`], or
[`${CLAUDE_SKILL_DIR}/references/nginx.md`] when writing that proxy's configuration; read
[`${CLAUDE_SKILL_DIR}/references/acme.md`] when a challenge, wildcard, propagation, profile, or client storage setting
is in play; read [`${CLAUDE_SKILL_DIR}/references/cloudflare.md`] when Cloudflare or a `cloudflared` tunnel is in the
path, because `Full` mode validates nothing on the origin and a dashboard-managed tunnel ignores the local ingress file.

## Identity at the proxy

- **The backend must receive identity headers from the proxy only, and the proxy must strip inbound ones explicitly.**
  Caddy's `forward_auth copy_headers` copies a header only when the auth response carries it, and Traefik replaces the
  canonical dash form only, so `X_Auth_User` from a client reaches a CGI or PHP backend as the same variable. Trusting a
  whole Docker network is not enough; Authelia's page says any container on it can then authenticate to any application.
- **Authelia's endpoint depends on the proxy**: `/api/authz/forward-auth` for Traefik, Caddy, and HAProxy,
  `/api/authz/auth-request` for nginx. `/api/verify` answers as the `Legacy` implementation in 4.38 and later, so a
  stale config keeps working while options added in 4.38 and later cannot be used with it. Access control is first-match
  with `default_policy` `deny`; `resources` are unanchored regular expressions; a host not covered by `session.cookies`
  is denied automatically.
- **authentik trusts forwarded headers only from `AUTHENTIK_LISTEN__TRUSTED_PROXY_CIDRS`** (2026.8 and later), private
  ranges by default, replaced rather than extended by a set value. Only `/outpost.goauthentik.io/*` is routed to the
  outpost, and each proxy needs a second route for it or the login callback 404s.

Read [`${CLAUDE_SKILL_DIR}/references/forward-auth.md`] when wiring Authelia, authentik, or oauth2-proxy to a proxy; it
carries the per-proxy header lists, the rule-ordering traps, the secrets rules, and the injection advisories.

## Tunnels

- **`AllowedIPs` is the outbound route and the inbound source ACL in one field**, and two peers on one interface
  claiming the same prefix resolve silently in favor of the later one. A fresh `latest handshake` proves key agreement
  and nothing about routes.
- **A `/0` in any peer's `AllowedIPs` with `Table` unset switches wg-quick to policy routing** and supersedes the host's
  default route the moment `up` returns; the `/1` split does not get that treatment and blackholes instead.
  `Table = off` is the setting for a routing daemon over the tunnel.
- **wg-quick does not default MTU to 1420**; it computes the smallest endpoint route MTU minus 80, took the largest
  before wireguard-tools v1.0.20250521, and Debian 13 and Ubuntu 24.04 ship the 2021 release. `SaveConfig = true`
  rewrites the file on every `down`, keeping hooks and dropping comments. `DNS =` calls `resolvconf` and nothing else.
- **Tailscale on Linux accepts no advertised routes until `--accept-routes`**, an advertised route reaches nobody until
  approved, `tailscale up` with any flag demands the complete set and `--reset` silently defaults the rest,
  `autogroup:internet` is the only thing that authorizes exit-node use, and tagging a device disables its key expiry.
  Headscale rejects a client below its capability floor, blocks minor-version skips from 0.29, and redefined `*` to the
  tailnet ranges in the same release.
- **A `cloudflared` tunnel managed from the dashboard ignores the local ingress file**, the last local rule must be a
  catch-all, and a tunnel leaves a host with a public address as reachable as before.

Read [`${CLAUDE_SKILL_DIR}/references/wireguard.md`] when writing a WireGuard or wg-quick file or routing a daemon over
it, and [`${CLAUDE_SKILL_DIR}/references/tailscale.md`] when writing a Tailscale policy or `up` invocation, a Headscale
configuration, or a NetBird route; cloudflared is in the cloudflare reference above.

## Detection and remediation

- **Suricata's shipped `HOME_NET` is the three RFC 1918 ranges**, so a sensor on a public prefix loads every rule and
  alerts on nothing. Rules ship as `alert`; IPS drops nothing without `drop.conf`. `suricata-update` does not reload the
  engine unless `--reload-command` is set. Offloads that merge frames (GRO, LRO, TSO) must be off on the capture
  interface, AF_PACKET IPS needs a symmetric interface pair and drops nothing on a box that routes instead of bridges,
  and an NFQUEUE with no listener drops the link when Suricata stops.
- **CrowdSec's firewall component creates its rules once at startup**, so a ruleset flush or a firewalld reload removes
  the enforcement while decision syncs keep logging success; `nftables_hooks` omitted means `input` only; a banned IP
  with an established connection stays connected; behind Cloudflare it blocks nothing because it sees only Cloudflare's
  addresses. The ban duration is in `profiles.yaml`, not the scenario. `cscli dashboard` is gone since 1.7.0 and a
  container without a data volume exits 0.
- **fail2ban's `banaction` defaulted to `iptables-multiport` through 1.1.0** and fails silently on an nftables-only
  host; 1.1.1 moved the default to `nftables`. The sshd filter matched nothing after OpenSSH 9.8's `sshd-session` rename
  until 1.1.1; `ignoreip` is commented out, and `ignoreself` never covers the operator's remote address.

Read [`${CLAUDE_SKILL_DIR}/references/suricata.md`] when writing a Suricata config or ruleset or enabling IPS, and
[`${CLAUDE_SKILL_DIR}/references/remediation.md`] when configuring CrowdSec, a remediation component, or fail2ban.

## Application

When **writing** network configuration, apply these rules silently; do not narrate a rule while following it. Where the
target's existing configuration contradicts one, follow it for the change at hand and flag the divergence once. Name the
tool version an edit assumes when the syntax differs across a boundary named here: Pi-hole v6, Traefik v3, Docker Engine
28 and 29, wireguard-tools v1.0.20250521, Headscale 0.28 and 0.29, CrowdSec 1.7, fail2ban 1.1.1, Unbound 1.23.

When **reviewing** network configuration, cite the line, state what it does once loaded, and give the corrected line
inline. Do not lecture.

## Integration

The **devops** skill governs the change: what it must carry before apply, how it is applied, and the evidence that
closes it, including the read-only effect checks for a firewall, a resolver, a certificate, and a WireGuard peer in its
`references/effect.md`. This skill governs what a ruleset, zone, tunnel, or proxy configuration does once loaded, and
wins on that question. The **containers** skill owns container networking modes and Compose; the host-firewall side of a
published port is here. The **proxmox** skill owns the hypervisor bridge setting; Linux bridge semantics are here. The
**coding** skill governs the shape of the work. All are active at once.
