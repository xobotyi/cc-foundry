# Resolvers

What Unbound, Pi-hole, AdGuard Home, dnsmasq, CoreDNS, and Knot Resolver do with the configuration they are given, where
that differs from what the author assumed. Host-side plumbing, naming, and caching are in
[`${CLAUDE_SKILL_DIR}/references/dns.md`].

## Unbound

- **`access-control` refuses everything except localhost when no netblock matches**, and the most specific netblock
  wins, so statement order is irrelevant. `interface:` defaults to localhost, so a config that only adds
  `access-control` serves nobody, and interfaces change only on restart, never on `kill -HUP` or a reload.
- **`home.arpa`, `resolver.arpa`, `service.arpa`, `onion`, `test`, `invalid`, and the AS112 reverse zones are default
  local zones.** `home.arpa` is `static`, so a `forward-zone` or `local-data` for names under it is shadowed and answers
  NXDOMAIN until the zone is declared with another type or `nodefault`. `resolver.arpa` and `service.arpa` joined the
  list in 1.23.0.
- **`local-zone` type decides what unmatched names do.** `static` answers NODATA or NXDOMAIN for anything not in
  `local-data`; `transparent` resolves unmatched names normally but returns NOERROR/NODATA for an unmatched type on a
  matched name, which a client reads as "no IPv6"; `typetransparent` resolves unmatched types too; `redirect` answers
  the whole subtree from the apex and may hold no data beneath it, and its CNAME target is resolved upstream only.
  `local-data` with no `local-zone` creates a `transparent` zone implicitly.
- **Reverse lookups for RFC 1918 space return NXDOMAIN by default** (the AS112 zones); `unblock-lan-zones: yes` lets
  them upstream and usually needs `insecure-lan-zones: yes` beside it, or the answer fails validation instead.
- **`do-not-query-localhost` defaults to `yes`**, so a `forward-zone` pointing at a filter on `127.0.0.1` gets SERVFAIL
  for every query until it is set to `no`.
- **`private-address` has no default entries; once set, matching addresses are stripped from answers** and the validator
  may mark them bogus. A legitimate internal name answered by a forwarder comes back empty unless its zone is in
  `private-domain` or the record is in `local-data` (openwrt/packages issue 22202).
- **`forward-first` defaults to `no`.** Off, one unreachable internal forwarder means SERVFAIL for the zone; on,
  internal names leak to public recursion and return NXDOMAIN. A `forward-host` inside the zone it forwards is a
  circular dependency the man page warns about by name; use `forward-addr`.
- **`forward-tls-upstream: yes` without `tls-cert-bundle` authenticates nothing**, and a `forward-addr` without the
  `#name` suffix accepts any certificate name. Encrypted and unauthenticated, with no startup warning.
- **`auto-trust-anchor-file` needs write access to the file and its directory, inside the chroot**, or RFC 5011 tracking
  stops silently and validation later fails wholesale. `unbound-anchor` exits 1 on its normal first-run success path
  (anchor updated or builtin used) and 0 when nothing was needed, so an `ExecStartPre=` without a leading `-` aborts the
  service.
- **`domain-insecure` is the switch for an unsigned internal zone under a signed public parent**; without it a
  split-horizon zone whose parent has a DS record returns SERVFAIL to validating clients.
- **`unbound-checkconf` is a syntax check** and says nothing about referenced files, chroot paths, or zone semantics.
- **1.23.0 changed defaults**: `serve-expired-client-timeout` to 1800 ms and `serve-expired-ttl` to 86400 s, and
  `module-config` is not rewritten for a build with EDNS client subnet from 1.23.0 on, which needs
  `module-config: "subnetcache validator iterator"` written explicitly. 1.25.0 added `tls-protocols` (default
  `TLSv1.2 TLSv1.3`) and treats a cached record at TTL 0 as expired.
- **Only the newest minor is supported**; NLnet Labs backports nothing, and the previous major's last minor gets one
  year after a major bump.

## Pi-hole

Pi-hole v6 (2025-02-18 and later) is a different configuration surface from v5, and a v5 config loads on v6 without a
warning.

- **Every v5 container variable was renamed to `FTLCONF_<section>_<key>`**: `WEBPASSWORD` is
  `FTLCONF_webserver_api_password`, `DNSMASQ_LISTENING` is `FTLCONF_dns_listeningMode`, `PIHOLE_DNS_` is
  `FTLCONF_dns_upstreams`, `DNS_BOGUS_PRIV` is `FTLCONF_dns_bogusPriv`, `PIHOLE_DOMAIN` is `FTLCONF_dns_domain`,
  `DHCP_*` is `FTLCONF_dhcp_*`. `ServerIP`, `DNS1`, `DNS2`, `WEB_BIND_ADDR`, `VIRTUAL_HOST`, and every
  `CONDITIONAL_FORWARDING*` variable were removed with no replacement. An unknown variable is ignored, so a v5
  `WEBPASSWORD` yields a container that starts healthy with a random password printed once in its log.
- **A setting supplied by environment is read-only in the web interface and the CLI**, and unsetting the variable
  reverts to the default, not to a value saved before.
- **`pihole.toml` replaces `setupVars.conf` and `pihole-FTL.conf`**, and `/etc/dnsmasq.d/` is ignored unless
  `misc.etc_dnsmasq_d` is true; single directives go in `misc.dnsmasq_lines`. A mounted custom dnsmasq file has no
  effect and produces no warning.
- **FTL embeds the web server on ports 80 and 443** and falls back to 8080 when 80 is taken, silently; the default
  `webserver.port` is `80,443s`. The PHP API is gone.
- **Listening modes**: `LOCAL` (the default) answers only sources on a subnet the host has an interface in, so on a
  Docker bridge LAN clients are dropped without a reply; `ALL` binds every interface and the docs call it the way to
  become an open resolver; `SINGLE` and `BIND` name one interface, and FTL 6.2 set `dns.interface` to `eth0` by default,
  which binds nothing on a host whose NIC is `enp3s0`.
- **Conditional forwarding is one string, `dns.revServers`**:
  `"<enabled>,<ip-address>[/<prefix-len>],<server>[#<port>][,<domain>]"`, several entries separated by `;`. A malformed
  entry fails validation and the setting stays off. `dns.bogusPriv` defaults to `true`, so LAN PTR lookups return
  NXDOMAIN until a reverse server is configured. `dns.upstreams` empty means no external name resolves.
- **FTL 6.3 renamed `dns.domain` to `dns.domain.name`** and added `dns.domain.local`; FTL 6.1 turned on 0x20 case
  encoding by default, which broke some upstreams (cloudflared among them) until `no-0x20-encode` was added to
  `misc.dnsmasq_lines`.
- **Gravity tables are rebuilt from scratch on every `pihole -g`**; anything written directly into the `gravity` table
  is gone at the next update.

## AdGuard Home

- **An edit to `AdGuardHome.yaml` while the service runs is lost**; the daemon overwrites the file. Stop it, edit,
  start. `schema_version` migrates forward on start and never backward.
- **`dns.upstream_mode` (`load_balance`, `parallel`, `fastest_addr`) replaced `all_servers` and `fastest_addr`** in
  0.107.44; old keys migrate once.
- **Upstream syntax carries the split-horizon routing**: `[/example.local/]10.0.0.1` routes one domain and its
  subdomains, `[//]10.0.0.1` routes only names without dots, `[/name/]#` sends a name back to the default upstreams.
  `[//]` written where `[/domain/]` was meant silently routes only unqualified names. `bootstrap_dns` is required
  whenever an upstream is named by hostname, or nothing resolves at start.
- **`allowed_clients` set makes `disallowed_clients` ignored.** `bind_hosts: ['0.0.0.0']` with neither is an open
  resolver, and the first signal is the hosting provider's abuse notice (AdGuardHome discussion 6393).
- **ClientID works only over DoH, DoT, and DoQ**, never plain DNS, and the SNI form needs a wildcard certificate; MAC as
  a client identifier works only when AdGuard Home is the DHCP server. A plain-DNS client falls back to the default
  profile silently.
- **DNS rewrites are global filtering rules** (`$dnsrewrite` outranks other rules); the only per-client scope is the
  `$client` modifier, and a persistent client with "use global settings" unchecked received the public answer instead of
  the rewrite (issue 7803, closed not planned).
- **Port 443 carries both the admin UI and DoH**, and 853 both DoT and DoQ; behind a reverse proxy `trusted_proxies`
  decides whether DoH clients keep their own addresses or all appear as the proxy.

## dnsmasq

- **Domain matching is per label**: `/google.com/` matches `google.com` and `www.google.com` but not `supergoogle.com`;
  a leading `*` matches all three.
- **Four look-alike forms differ**: `server=/domain/10.0.0.1` forwards; `server=/domain/#` uses the standard servers;
  `server=/domain/` with nothing after it, and its synonym `local=/domain/`, declares the domain local and answers
  NXDOMAIN for unmatched names; `address=/domain/10.0.0.1` answers A and AAAA for the domain and every subdomain without
  forwarding, and `address=/domain/#` returns `0.0.0.0` and `::`. A missing trailing address turns a forward into a
  sink.
- **dnsmasq binds the wildcard address even with `interface=` set** and discards what it should not answer, so it
  collides with systemd-resolved's stub on port 53 unless `bind-interfaces` or `bind-dynamic` is set. `interface=` adds
  loopback automatically; `listen-address=` alone does not, so local queries from the host time out.
- **`stop-dns-rebind` rejects any upstream answer in a private range**, including the answer of a conditional forwarder
  for the LAN; `rebind-domain-ok=/domain/` exempts a zone and `rebind-localhost-ok` exempts loopback. `bogus-priv` also
  relaxes DNSSEC for private reverse zones.
- **`local-ttl` defaults to 0**, so clients never cache local answers; `cache-size` defaults to 150 names.
- **dnsmasq has no DNS-over-TLS or DNS-over-HTTPS upstream**; the man page has no TLS surface. Encrypted upstream for
  dnsmasq or Pi-hole is a separate process on loopback, and `tls://` in an upstream is a syntax error. 2.90 set the
  default UDP packet size to 1232 and added the DNSSEC resource limits for KeyTrap.

## CoreDNS and Knot Resolver

- **CoreDNS plugin order comes from `plugin.cfg` at build time, not from the Corefile.** Reordering `hosts` and `file`
  in the Corefile changes nothing. The `hosts` plugin swallows every query without `fallthrough`, returning NXDOMAIN
  while `forward` sits unused. `view` needs one server block per view, and a catch-all block declared before a filtered
  one shadows it.
- **Knot Resolver 6 replaced the Lua config with YAML and a manager process**; the unit is `knot-resolver.service` and
  the file `/etc/knot-resolver/config.yaml`. A `kresd.conf` snippet is not loaded. View selection picks one rule by
  subnet specificity and leaves ties undefined.
