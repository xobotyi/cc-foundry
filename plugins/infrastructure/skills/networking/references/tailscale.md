# Tailscale, Headscale, NetBird

What a Tailscale policy file, a `tailscale up` invocation, a Headscale configuration, or a NetBird route does once
applied.

## Tailscale policy

- **A policy written with `acls` stays valid and Tailscale commits to keeping it valid**; `grants` is a superset that
  adds `app` capabilities, `via` route steering, and `srcPosture`, and the two may coexist in one file. Migration is a
  feature question, not a validity one. Tailscale does not validate the contents of an `app` capability beyond it being
  JSON, so a misspelled parameter loads and does nothing.
- **`autogroup:member` excludes tagged devices**, which carry a tag identity and fall under `autogroup:tagged`; a tagged
  server never matches a member rule. `autogroup:self` is destination-only and undefined for a tag source;
  `autogroup:internet` and `autogroup:self` are destination-only, `autogroup:shared` source-only.
- **`autogroup:internet` is the only thing that authorizes exit-node use.** Naming the exit node device as a `dst`
  permits connections to the device, such as SSH, and not internet through it; the exit-node page calls this a common
  point of confusion. Replacing the default policy with a custom one that omits `autogroup:internet` revokes exit-node
  use tailnet-wide.
- **Applying a tag removes the device's user ownership and disables its key expiry by default.** A device authenticated
  with an auth key cannot have its tags removed from the client. Node key expiry defaults to 180 days, which is also the
  maximum, and at expiry connections stop until reauthentication.
- **An expired subnet router, exit node, or app connector keeps its routes installed on every peer**, on purpose, so
  removing them cannot leak traffic to an untrusted network; the routes become blackholes until the node is
  reauthenticated.

## tailscale up and routes

- **`tailscale up` with any flag requires the complete set of desired settings** and refuses when an omitted flag would
  change a setting, with an error that prints the full command to rerun. `--reset` converts that refusal into an apply
  and resets every unspecified setting to its default, which is the real flag-reset hazard. `tailscale set` changes only
  the settings named.
- **`--advertise-exit-node` and `--advertise-routes` write the same preference**, so an `up` naming only one clobbers
  the other.
- **`--accept-routes` defaults to off on Linux** and on for Windows, iOS, Android, and macOS; a Linux client ignores
  every advertised subnet until it is set. Advertised routes reach nobody until approved in the admin console or covered
  by an `autoApprovers` entry, because approval and access rules are separate mechanisms.
- **Route selection is longest-prefix with no fallback**: when the router for a more specific route goes offline,
  traffic to that prefix is dropped rather than sent to a less specific route another router serves. A standby router
  that accepts routes sends traffic for its own directly connected subnet through the primary.
- **A subnet router without `net.ipv4.ip_forward=1` warns and proceeds**; `tailscale up` does not fail, and the warning
  is `IP forwarding is disabled, subnet routing/exit nodes will not work.`
- **A device using an exit node loses its own LAN unless `--exit-node-allow-lan-access` is set, and uses the exit node
  as its resolver for every domain**, overriding global and split DNS unless a nameserver is marked for use with exit
  nodes.
- **`--accept-dns=false` stops the `resolv.conf` rewriting but `100.100.100.100` keeps answering** as long as MagicDNS
  is on in the tailnet; the resolver runs inside `tailscaled`. Tailscale overwrites `/etc/resolv.conf` only when
  MagicDNS and `--accept-dns` are on and no DNS manager is detected, and reports `Linux DNS config not ideal` when a
  pinned file, a competing manager, or a container defeats it.
- **Tailscale SSH needs a network access rule and a separate `ssh` block entry**; a connection with only the `ssh` block
  is refused. Funnel listens only on 443, 8443, and 10000, only over TLS, and only on `ts.net` names; Serve and Funnel
  cannot share a port, and the last command sets the visibility. Serve injects `Tailscale-User-Login` and related
  headers and strips inbound ones; Funnel traffic and traffic from tagged devices carry none, so a backend trusting
  those headers authenticates nobody under Funnel.
- **The free plan meters tagged resources, not devices**; an agent that tags every host hits the plan limit.

## Headscale

- **Headscale rejects a client below its minimum capability version at the handshake** with
  `unsupported client version`; 0.27 needs Tailscale v1.64, 0.28 v1.74, 0.29 v1.80. The stated target is the last ten
  Tailscale client releases.
- **0.29 blocks skipping a minor version and blocks downgrades**; the upgrade path is one minor at a time. A compose
  file that moves the data mount generates a fresh `noise_private.key` and every registered client fails with
  `noise handshake failed: decrypting machine key` (issue 2870).
- **0.29 redefined `*` in a policy to the tailnet ranges `100.64.0.0/10` and `fd7a:115c:a1e0::/48`** instead of
  everything; matching all addresses needs `autogroup:danger-all`, source-only. `proto:icmp` narrowed to ICMPv4 in the
  same release; ICMPv6 needs `proto:ipv6-icmp` or `58`. Collision suffixes in MagicDNS names changed from a random hash
  to `-1`, `-2`, so a hard-coded FQDN can break on upgrade.
- **Supported autogroups are `internet`, `member`, `tagged`, `self`, `nonroot`, `danger-all`**; a policy using the
  `funnel` capability, `ipsets`, `autogroup:admin`, or `autogroup:owner` is rejected at load, and `srcPosture` is
  unsupported. `grants` are supported from 0.29. Every user token in the policy must carry `@` (`john@`, since 0.26),
  and a token matching more than one database user is rejected in 0.29.
- **0.28 made tags and user ownership mutually exclusive**, moved pre-auth keys to IDs with a bcrypt-hashed
  `hskey-auth-` format shown once, removed `headscale nodes move`, and stopped accepting `*` as an SSH destination.
- **`base_domain` must differ from, and not be a parent suffix of, the `server_url` host**, or Headscale refuses to
  start, because Tailscale takes over the base domain and the control server becomes unreachable. `dns.base_domain` is
  mandatory with MagicDNS, `dns.override_local_dns` defaults to true and then requires `dns.nameservers.global`, and
  `randomize_client_port` moved from the server config (rejected at start since 0.29) to the policy file.
- **`trusted_proxies` arrived in 0.29**; before it, `X-Forwarded-For` and its siblings were honored from any client.
  PostgreSQL is supported and documented as highly discouraged, with SQLite the only actively developed backend.
- **The embedded DERP requires an HTTPS `server_url` and a `stun_listen_addr`**, cannot serve Tailscale's captive portal
  check, and as the only region is a single point of failure.

## NetBird

- **A NetBird route needs no approval**: it is distributed to every peer in its assigned groups as soon as it exists,
  with masquerade on by default. This is the inverse of Tailscale's approve-then-inject model.
- **Clients below v0.29 need the legacy port set** (TCP 33073, 10000, 33080 and UDP 49152 through 65535) after the
  server consolidates onto 80 and 443, or they fail silently after a firewall tightening. The quickstart ships an
  embedded identity provider; an external one is not a requirement of the quickstart.
