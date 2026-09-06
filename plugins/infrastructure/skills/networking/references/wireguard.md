# WireGuard

What a WireGuard interface and a wg-quick file do once up, where that differs from what the file reads. The kernel
implementation and wireguard-tools are versionless in configuration; the wireguard-tools release is named where the
script's behavior changed, because Debian 13 and Ubuntu 24.04 ship the 2021 release.

## Cryptokey routing

- **`AllowedIPs` is the outbound route selector and the inbound source ACL in one field.** Narrowing it to fix routing
  also drops inbound packets from those sources; the peer handshakes and the returns are discarded before the interface.
- **Two peers on one interface claiming the same prefix resolve silently in favor of the later one.** The kernel moves
  the prefix to the new peer, removes it from the earlier peer's list, and returns success; `wg setconf` does not detect
  it either. `wg show` afterwards lists the prefix under the winner only.
- **`wg set <iface> peer <key> allowed-ips <list>` replaces the peer's list**, and an empty string removes every allowed
  IP. The `+` and `-` incremental prefixes exist in wireguard-tools v1.0.20250521 and later only.
- **A fresh `latest handshake` proves key agreement and nothing about routes.** Handshakes are time-driven
  (`RekeyAfterTime` 120 s) whether or not any data packet is accepted; a stalled peer stops retrying after
  `RekeyAttemptTime` 90 s until traffic is offered again.
- **The `Endpoint` in the file is the initial guess.** The running device overwrites it from the source address of the
  last authenticated packet, `wg show` and the file disagree, and `wg-quick down` then `up` reverts to the stale value.
  Roaming has no extra authentication round trip; the project's stated mitigation is firewalling the socket.
- **`PersistentKeepalive` is off by default; 25 seconds is a documented convention, not a default.** A peer behind NAT
  is reachable outbound and unreachable inbound once the mapping ages out.
- **`wg setconf` replaces the whole configuration and drops every session; `wg syncconf` diffs and leaves unchanged
  peers connected.** From wireguard-tools v1.0.20260223, `wg-quick up` applies the file with `addconf`.
- **WireGuard has no TCP mode and the project states it will not add one.** Routing-loop detection is listed as an open
  limitation.

## wg-quick routing

- **A peer with `AllowedIPs` ending in `/0` and `Table` unset or `auto` switches wg-quick to policy routing.** It picks
  table 51820 (incrementing past a populated table), sets the interface fwmark to that number, adds
  `ip rule add not fwmark <table> table <table>` and `ip rule add table main suppress_prefixlength 0`, and installs the
  routes in the new table. The host's default route is superseded for every unmarked packet the moment `up` returns; the
  SSH session that ran it drops.
- **The tunnel's own encrypted packets escape the loop by the fwmark, not by a host route to the endpoint.** A config
  that clears or reuses the fwmark blackholes the transport.
- **The trigger is a literal `/0`.** The `0.0.0.0/1, 128.0.0.0/1` split does not get the policy-routing treatment; those
  land in `main` as ordinary routes beside the underlay route to the endpoint, and the tunnel comes up with a fine
  handshake and passes nothing.
- **`Table = off` skips route creation entirely**, and with it the `wg-quick-<iface>` nftables table (a `preraw` chain
  at priority -300 dropping packets to the interface's own addresses arriving elsewhere, plus the conntrack mark chains)
  that the `/0` path installs. It is the setting a routing daemon over the tunnel needs, and the anti-spoof rules go
  with it.
- **Routes install longest-prefix first**, so `[Peer]` order in the file does not decide route order.

## wg-quick MTU and hooks

- **wg-quick does not default MTU to 1420.** It takes the smallest route MTU to any peer endpoint and subtracts 80
  (sized for an IPv6 underlay, so 20 bytes conservative over IPv4); 1500 is the fallback when no route MTU can be read,
  which is why 1420 is the number usually seen. Before v1.0.20250521 the comparison was inverted and the largest
  endpoint MTU won, so a multi-peer interface got an MTU only its best-connected peer could carry; that release is not
  in Debian 13 or Ubuntu 24.04.
- **`PreUp` runs after the interface exists and before keys, addresses, MTU, DNS, and routes** in v1.0.20250521 and
  later; before that it ran before `ip link add`. `PreDown` runs while the interface exists; `PostDown` runs after
  `ip link del`, so a `PostDown` rule referencing `wg show %i fwmark` cannot work, which is why the man page pairs
  `PostUp` with `PreDown`.
- **A hook that exits non-zero aborts the bring-up and tears the interface down.** The script runs under
  `set -e -o pipefail` with a `del_if` trap held until `PostUp` completes. Hooks are `eval`-ed with `%i` substituted as
  a plain string everywhere in the line.
- **`SaveConfig = true` rewrites the file on every `down`**, so an edit made while the interface is up is discarded. The
  rewrite keeps every hook line and drops comments, blank lines, key order, and the `MTU` line when MTU was never set
  explicitly.
- **`DNS =` calls the `resolvconf` binary and nothing else.** On a systemd-resolved host without the
  `systemd-resolvconf` shim or `openresolv` the bring-up fails on "command not found" and the trap tears the interface
  down. A value that is not a dotted quad or an IPv6 address is classified as a search domain, so
  `DNS = dns.internal.example` configures a suffix and no nameserver.
- **Config keys match case-insensitively, and a key wg-quick does not recognize is passed through to `wg`**, which
  errors on a real typo but stays silent for a wg-quick-only key written under `[Peer]`. The config filename must be the
  interface name, at most 15 characters. A world-readable file draws a warning and loads anyway.
- **A missing kernel module falls back to `wireguard-go` with a stderr warning only**; a systemd unit swallows it into
  the journal and throughput drops with no other signal. A userspace implementation shows as
  `/var/run/wireguard/<iface>.sock`; the kernel module is in mainline from Linux 5.6.

## Dynamic routing over the tunnel

- **A routing daemon owns the routes with `AllowedIPs = 0.0.0.0/0, ::/0` on the peer and `Table = off`.** Without
  `Table = off` the `/0` captures the host's default route as above.
- **Multicast reaches one peer per interface**: the cryptokey table maps a destination to exactly one peer, so OSPF
  neighbor discovery over a shared multi-peer interface forms with one neighbor and no others (mailing list,
  2018-04-16). BIRD's `ptmp` interface type with explicit neighbors is the match for a multi-peer interface; `ptp`
  relies on multicast.
- **BIRD rejects an OSPF adjacency on any MTU inequality and has no `mtu-ignore` option; FRR drops only when the
  neighbor's MTU is larger and offers `ip ospf mtu-ignore`.** The adjacency sticks in ExStart or Exchange with a
  warn-level line and no other symptom.
- **FRR's `ip ospf network point-to-point` on an interface with a /32 address treats it as unnumbered and needs that
  interface's `rp_filter` at 0**, or the kernel drops the OSPF multicast before ospfd sees it.
- **BIRD 3 renamed `reload` to `reload filters`**; the old command succeeds and reloads something else. BIRD 3 also
  removed the `scope` route attribute and added a `threads` option.
