# DNS on the Host

What the resolver plumbing on a Linux host does once configured: the stubs, the loops, the naming rules, the caches, and
mDNS. Per-daemon behavior is in [`${CLAUDE_SKILL_DIR}/references/resolvers.md`].

## systemd-resolved

- **`/etc/resolv.conf` has four modes and only the stub mode routes clients through resolved.** A symlink to
  `/run/systemd/resolve/stub-resolv.conf` points clients at `127.0.0.53`; a symlink to
  `/run/systemd/resolve/resolv.conf` is uplink mode listing the real upstreams, and clients that read the file bypass
  resolved and lose its per-link routing, cache, and DNSSEC. resolved reads a hand-written `/etc/resolv.conf` for
  upstreams only when it is not one of those symlinks.
- **`127.0.0.54` is a second stub in proxy mode**: no DNSSEC validation, no LLMNR, no mDNS. A container or DNAT pointed
  at it loses those silently.
- **The stub listener defaults to on and takes `127.0.0.53:53`**, so another resolver binding the wildcard address on
  port 53 fails with "address already in use"; `DNSStubListener=no` in `resolved.conf` frees it. With `MulticastDNS=`
  on, resolved binds 5353 on every address and contends with Avahi.
- **`CacheFromLocalhost=` defaults to `no`**: answers from an upstream on `127.0.0.1` or `::1` are not cached, so
  resolved in front of a local Pi-hole or Unbound is not a cache layer. `ResolveUnicastSingleLabel=` defaults to false,
  so a bare hostname is never sent to unicast DNS unless a search domain applies.
- **resolved's generated `resolv.conf` sets `search .`** when no other search domain is known (systemd 247 and later); a
  script that reads the local domain from `search` reads `.`.
- **`DNSOverTLS=opportunistic` authenticates nothing** and falls back to plaintext when the server appears not to
  support TLS; the man page names it as vulnerable to downgrade. Strict mode validates the certificate against the name
  given after `#` in `DNS=`; `DNS=1.1.1.1` with `DNSOverTLS=yes` and no name is validated against the IP only.
- **`systemd-resolve` was renamed `resolvectl` in systemd 239** and the old name keeps working, so a script written
  against it never reports its own staleness.

## Docker

- **Docker rewrites a container's `resolv.conf`.** On the default bridge, loopback nameservers inherited from the host
  are removed because they only work in the host's namespace, and when nothing is left Docker substitutes `8.8.8.8`,
  `8.8.4.4`, and their IPv6 equivalents. On a systemd-resolved host every default-bridge container queries Google
  directly, bypassing the LAN filter, with only a daemon log line. A user-defined network gets the embedded resolver at
  `127.0.0.11`, which forwards to the host's servers from the host's namespace; a `--dns 127.0.0.53` override is
  resolved from the container's own namespace and always fails.
- **`127.0.0.11` has no IPv6 equivalent** and works in IPv6-only containers; the default bridge has no embedded DNS at
  all, so service names do not resolve there.

## glibc and search paths

- **`resolv.conf` uses at most three `nameserver` lines**, and `ndots` is silently capped at 15, `timeout` at 30,
  `attempts` at 5. A fourth server is ignored without an error. `ndots` defaults to 1; Kubernetes writes `ndots:5`, so
  every short external name is first tried against each search domain and shows up as NXDOMAIN noise upstream.
- **NetworkManager rewrites a regular `/etc/resolv.conf` and leaves a symlink alone** (`rc-manager=symlink`), so a
  hand-written file is overwritten at the next connection event and a symlink to a hand-written file is not.

## Private naming

- **`home.arpa` (RFC 8375) is deliberately unsigned and must not be forwarded to the global DNS.** A validating resolver
  cannot be handed a secure zone there, and a query that escapes to a public resolver returns NXDOMAIN. Unbound ships it
  as a default static local zone; see the resolvers reference.
- **`.local` is mDNS (RFC 6762).** A query for a `.local` name MUST go to the multicast address, so macOS and
  systemd-resolved never ask the LAN resolver for it; a unicast `.local` zone works on some hosts and not others.
- **No public CA issues for `.lan`, `.home`, `.internal`, or any unregistered suffix**: issuance was prohibited from
  2015-11-11 and existing certificates revoked from 2016-10-01 (CA/Browser Forum). A wildcard for internal services
  needs a registered domain or a private CA.
- **A wildcard certificate covers one label and not the bare domain**; `*.example.com` serves `a.example.com`, not
  `example.com` and not `a.b.example.com`.

## Caching

- **A negative answer is cached for the lesser of the SOA `MINIMUM` field and the SOA record's own TTL (RFC 2308).** A
  name queried before its record exists stays NXDOMAIN network-wide for that period, whatever the new record's TTL.
- **A TTL floor desynchronises the cache from the zone.** Unbound's own page says values above about an hour "can lead
  to trouble", and its `cache-min-ttl` applies to negative answers as well unless `cache-min-negative-ttl` is set.
- **A validating resolver answers SERVFAIL, not the rewrite, for a signed name a filter rewrote or stripped.** Only the
  resolver log or a permissive mode distinguishes that from an outage.

## mDNS

- **Avahi's reflector reflects to every interface it has joined**, and with `allow-interfaces` unset it joins every
  interface except loopback and point-to-point. `enable-reflector=yes` on a router exposes each VLAN's services to all
  the others unless `allow-interfaces` scopes it; `reflect-filters` (present in 0.8) limits reflection to named service
  types, and `reflect-ipv` bridges v4 and v6, which the man page calls not recommended.
- **A responder SHOULD ignore a query from an off-link source (RFC 6762 §5.5)**, so a routed or reflected mDNS query can
  be dropped by the responder with no error anywhere.
- **Port 5353 is contested between Avahi and systemd-resolved** on a host where `MulticastDNS=` is on in resolved.
