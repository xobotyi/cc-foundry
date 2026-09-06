# Addressing and Routing

What a Linux host does with a VLAN, a route, a sysctl, an MTU, or an IPv6 setting once it is written, where that differs
from the file.

## Bridges and VLANs

- **A Linux bridge with `vlan_filtering 0` is VLAN-unaware and forwards a tagged frame on every port**, including frames
  carrying a VID nobody registered. That is the VLAN leak on a hypervisor bridge, and nothing logs it. With
  `vlan_filtering 1` every frame whose VID is not in the bridge VLAN table is dropped, so turning filtering on before
  adding the VLANs drops everything, including the management session; a port with no PVID drops every untagged and
  priority-tagged frame; VID 0 frames are treated as untagged.
- **`bridge vlan add` adds a tagged member unless `untagged` or `pvid` is written.** An access port that emits tagged
  frames leaves the end host seeing nothing.
- **Proxmox VE needs `bridge-vlan-aware yes` on the bridge for a trunk**; without it a guest with a VLAN tag gets a VLAN
  sub-interface and a per-VLAN bridge created underneath, a different topology from the one written. The proxmox skill
  owns the setting.
- **MikroTik RouterOS sets `pvid=1` on every bridge port by default, including trunk ports and the bridge interface
  itself**, which adds them to VLAN 1 as untagged members. Enabling `vlan-filtering=yes` resets the bridge and drops the
  session if the VLAN table is incomplete; the vendor page tells the operator to use a serial console.

## Reverse-path filtering

- **The effective `rp_filter` is the maximum of `conf/all` and `conf/<iface>`**, never an override, and the kernel
  default is 0. systemd ships `/usr/lib/sysctl.d/50-default.conf` setting `net.ipv4.conf.default.rp_filter = 2` and
  `net.ipv4.conf.*.rp_filter = 2` while excluding `conf.all` with a leading `-`, so every interface present at boot is
  in loose mode and a write to `conf.all` succeeds and changes nothing (systemd issue 32563).
- **An rp_filter drop leaves almost no signal.** `tcpdump` shows the packet arriving and conntrack never sees it; the
  evidence is the martian-packet log line when logging is on, or the `IpInAddrErrors` counter in `nstat`.

## Policy routing

- **The routing policy database starts with three rules: 0 `local`, 32766 `main`, 32767 `default`.** A rule added at a
  priority above 32766 is consulted after `main` has answered. A rule whose table holds no matching route falls through
  to the next rule, so traffic silently uses `main`. `from` matches the source prefix and `to` the destination; a
  return-path rule needs `from`.
- **`suppress_prefixlength 0` on the `main` lookup makes its default route not count**, so a later table's default wins;
  this is the idiom wg-quick installs, and the one to write by hand for any tunnel that owns the default route.

## MTU

- **The path-MTU black hole is a connection that establishes and then stalls on volume.** Small packets pass, the
  oversized one is dropped, and the ICMP "fragmentation needed" or ICMPv6 "Packet Too Big" that would fix it is filtered
  on the path. SSH connects and freezes on long output; large HTTP responses hang.
- **MSS clamping belongs in the `forward` chain with `tcp option maxseg size set rt mtu`**, which reads the route MTU at
  run time and covers both directions. A rule matched only on the outbound interface clamps one direction.

## IPv6

- **`accept_ra` value 1 accepts router advertisements only while forwarding is off.** Turning on forwarding on a host
  with the default silently stops RA processing, and the router loses its own upstream address and default route. Value
  2 accepts them regardless; a router that gets its WAN address from RA needs it.
- **RFC 6724 gives IPv4-mapped addresses precedence 35 and ULA `fc00::/7` precedence 3.** A dual-stack host prefers IPv4
  over a ULA destination, so a service numbered only from ULA space is never reached over IPv6 and its IPv6 rules are
  never exercised.
- **RFC 4890's transit list**: a filter that drops ICMPv6 type 2 (Packet Too Big) creates the black hole above; types 1,
  3, 4, 128, and 129 are the rest of the set a transit filter must pass, and a host filter must additionally pass
  neighbor and router discovery (133 through 136) or it loses addressing.
- **A rotated delegated prefix lingers on hosts for its advertised valid lifetime** unless the router deprecates it with
  lifetime 0 (RFC 9096). Rules and records naming the old prefix keep matching nothing.
- **`use_tempaddr` defaults to 0**: no privacy extensions, stable addresses, on a server.
- **One `ListenAddress` line in `sshd_config` replaces the all-addresses default**, so `ListenAddress 0.0.0.0` alone
  removes IPv6 listening. Docker's default bridge has no IPv6 without `"ipv6": true` and `fixed-cidr-v6` in
  `daemon.json`.

## Configuration managers

- **`KeepConfiguration=` defaults to `no` outside the initrd and a network root**, so restarting systemd-networkd drops
  dynamically configured addresses and routes, including the one the SSH session uses. `DHCP=` defaults to `no`, so a
  `.network` file that matches an interface and sets no addressing leaves it up with no address. `RouteMetric=` for DHCP
  routes defaults to 1024, so two DHCP interfaces install tied default routes.
- **An interface carrying the udev property `ID_NET_MANAGED_BY=` set to anything but `io.systemd.Network` is never
  matched by a `.network` file**, whatever its `[Match]` section says. The file is present, valid, and inert.
- **`netplan try` reverts after 120 seconds by default**, and the man page's own known-issues section says a timed-out
  or cancelled try must be checked for whether the revert happened, because virtual devices it created are not
  necessarily undone.
- **Two managers on one interface** (NetworkManager beside networkd or ifupdown) produce double configuration and an
  overwritten `resolv.conf`; NetworkManager yields only through `unmanaged-devices` in its configuration.

## DHCP

- **ISC DHCP reached end of life on 2022-10-05**; distribution packages of `isc-dhcp-server` install cleanly after that
  date and looks supported. Kea is ISC's successor.
- **dnsmasq honours a `dhcp-host` reservation outside the `dhcp-range` pool but only inside a subnet some range
  defines**; with no range covering its subnet the reservation is never offered. A `dhcp-host` with no hardware address
  matches any client that claims the hostname. Adding a DHCPv6 range makes dnsmasq send router advertisements on that
  subnet. The default lease is one hour for IPv4 and one day for IPv6.
