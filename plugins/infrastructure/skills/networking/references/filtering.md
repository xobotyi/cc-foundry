# Filtering

What a packet filter does once loaded, where that differs from what the file reads. nftables on Linux, the rule
generators that share the kernel with it, and the pf-based appliances.

## nftables evaluation

- **Every base chain registered on a hook runs, in increasing priority order, whatever the file order or table name.**
  `accept` ends the current base chain only; the packet continues into every later base chain on the same hook and can
  be dropped there. `drop`, including a base chain's `policy drop`, ends evaluation for the whole ruleset. A permissive
  table added beside the one Proxmox, Docker, or firewalld installs loads clean and changes nothing, and a Proxmox staff
  reply from September 2025 states the same rule for the PVE firewall's nftables backend.
- **A `nat` chain needs a priority above -200.** -200 is conntrack's hook; a nat chain at or below it runs before the
  connection exists, loads without error, and translates nothing. `masquerade` is meaningful only in a `postrouting` nat
  chain, because the source address comes from the output interface chosen by routing.
- **NAT is decided on the first packet of a connection.** Later packets are translated from the conntrack entry, so
  editing a NAT rule changes nothing for flows already in the state table.
- **`ip protocol`, `ip saddr`, and every other `ip` payload expression match IPv4 only**, also inside an `inet` table. A
  rule written with them silently passes IPv6. `meta l4proto` matches both families and skips IPv6 extension headers;
  `ip6 nexthdr` compares the immediate next-header byte and misses a packet carrying a fragment or routing header.
- **`reject` with no reason sends ICMP or ICMPv6 port-unreachable**, not a TCP reset. A client expecting an immediate
  refusal on TCP gets a message its path may filter.
- **`ct state invalid` is whatever conntrack could not fit to a connection**, which includes the packets of an
  asymmetric flow and out-of-window TCP. Dropping it silently kills traffic that crosses the host in one direction.
- **Interval sets need `flags interval`, and overlapping elements are refused at load unless `auto-merge` is set.**
  `auto-merge` is valid on interval sets only. An anonymous set written inline in a rule cannot be updated; a named set
  can.
- **A flowtable takes an offloaded flow off the classic path.** After the first packets, nothing at a later hook sees
  the flow: no counters, no logging, no MSS clamp. The flowtable needs a `flow add` rule to populate it, an accept rule
  for the initial packets, and the devices for both directions listed; with `ip rule` policy routing the rules must
  match the reply direction as well, because the return route is taken from the flow-creating packet.
- **Kernel gates that an agent writes past**: stateful NAT in the `inet` family needs Linux 5.2; the `ingress` hook
  exists in `netdev` from 4.2 and in `inet` from 5.10 and always needs a `device`; the empty prerouting and postrouting
  nat chains older material insists on stopped being needed at 4.18; `tcp option maxseg size set rt mtu` needs 4.14 and
  nft 0.9.

## Loading

- **`nft -f` applies a file as one kernel transaction.** A parse error anywhere leaves the previous ruleset untouched;
  there is no partial ruleset. `nft -c -f` parses without applying and knows nothing about runtime state: an interface
  name that does not exist, a set that is only populated at run time, or a higher-priority table that drops first all
  pass the check.
- **`flush ruleset` deletes every table on the host**, including the ones Docker, firewalld, netavark, libvirt, and
  fail2ban created, and none of those daemons notice. Container and guest networking stops with no error from any
  component until the owning daemon restarts. `flush table <family> <name>` empties one table and is the form that
  coexists. An Ansible role that reloaded nftables this way disconnected every container on its hosts (reported
  2025-03-06).

## Coexistence

- **`iptables -V` names the variant in parentheses**: `(nf_tables)` is iptables-nft, `(legacy)` or nothing is the
  x_tables binary. With both variants populated the kernel evaluates both rulesets and neither listing shows the whole
  picture.
- **A rule added by hand inside a table firewalld manages is gone on `firewall-cmd --reload`** or a restart; firewalld
  rebuilds its tables from its own configuration. A separate table with its own base chains survives.
- **ufw installs disabled** with incoming deny, forward deny, outgoing allow, and changes nothing until `ufw enable`.
  `ufw enable` and a service start flush its chains, which can drop the established session that ran the command.
- **A published Docker port never traverses the host `input` chain.** Publishing is DNAT in the `nat` table, so the
  packet is routed to the container and passes `forward`; `ufw deny 8080` reports success and the port answers from the
  network (docker/for-linux issue 690, open since 2019). Operator rules go in `DOCKER-USER`, which `FORWARD` jumps to
  before `DOCKER-FORWARD` and `DOCKER`; rules written into those two are rewritten by the daemon.
- **Docker Engine 28.0 blocks direct-routed access to unpublished container ports** from other hosts on the LAN, with a
  drop in the `DOCKER` chain and rules in the `raw` table's `PREROUTING`, ahead of `filter`. Per-network
  `gateway_mode_ipv4` and `gateway_mode_ipv6` (`nat`, `nat-unprotected`, `routed`, `isolated`) restore or change it, and
  a `nat-unprotected` network looks ordinary in `docker network ls`. Docker sets the `FORWARD` policy to DROP when it
  enables forwarding; `ip-forward-no-drop: true` in `daemon.json` opts out. `"iptables": false` stops rule creation and,
  per Docker's own page, breaks container networking for most users.
- **Docker Engine 29.0 added an nftables backend, experimental, opt-in with `firewall-backend: nftables`.** It creates
  `ip docker-bridges` and `ip6 docker-bridges` tables and no `DOCKER-USER` chain; operator rules go in a separate table
  with base chains on the same hook at a chosen priority. Switching a daemon from iptables to nftables does not remove
  the old `FORWARD` jump, so stale `DOCKER-USER` rules keep filtering until removed by hand or by reboot, and a daemon
  started on nftables never adds the jump, so `DOCKER-USER` rules written by habit are ignored. The request to keep the
  chain is closed as not planned (moby issue 49643).
- **Docker does not enable IPv6 on the default bridge** without `"ipv6": true` and `fixed-cidr-v6` in `daemon.json` and
  a restart. An IPv6 policy written for containers on an IPv4-only bridge matches nothing.
- **netavark uses nftables from 1.10 and by default on Fedora 41 and later.** Containers running across the driver
  switch leak their old iptables rules, which netavark does not clean up. Rootful Podman and Docker on one host
  conflict: Docker's iptables rules block Podman's outbound path.

## OPNsense and pfSense

- **Rules are evaluated floating, then interface group, then interface**, and `quick` is on by default: the first
  matching rule wins. A non-quick rule is last-match; the default deny is a non-quick rule and matches when nothing else
  did. A floating rule silently pre-empts an interface rule written later in the UI.
- **Traffic that matches no rule is blocked by the default deny without a log entry** unless default-block logging is on
  (pfSense). pfSense's anti-lockout rule on LAN sits above the operator's rules and permits the LAN network to the
  administrative ports; a deny for management access has no effect until it is disabled.
- **A rule change does not touch connections already in the state table.** A new deny appears not to work against a live
  session until states are reset.
- **pfSense ships TSO and LRO disabled and hardware checksum offloading enabled**, and the checkboxes are worded as
  "disable", so checked means off. Checksum offloading is documented as broken on Realtek and on Xen and KVM emulated
  cards; pfSense tries to disable it itself when it detects `vtnet`. OPNsense's IPS mode needs every hardware offload
  off on the capture interface.
- **Unbound on OPNsense answers on every available IPv4 and IPv6 address by default**, and DNSSEC validation is off by
  default. The resolver is reachable from any interface a firewall rule permits.
