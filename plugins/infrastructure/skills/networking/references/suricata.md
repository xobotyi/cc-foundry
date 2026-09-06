# Suricata

What a Suricata configuration and ruleset do once loaded, in IDS and in IPS mode. The 8.0 line is named where it changed
the surface from 7.0.

## Detection

- **The shipped `HOME_NET` is the three RFC 1918 ranges and `EXTERNAL_NET` is `!$HOME_NET`.** A host on a public prefix
  falls into `EXTERNAL_NET`, most rules are written `$EXTERNAL_NET -> $HOME_NET`, and the engine starts, loads every
  rule, and raises zero alerts. `HTTP_SERVERS` and `SMTP_SERVERS` inherit `$HOME_NET` and break the same way.
- **Ruleset rules ship as `alert`, so IPS mode drops nothing until `drop.conf` converts selected signatures**;
  `suricata-update` rewrites the action at download time from the specifiers in that file, and no file means no drops.
  `suricata-update` does not reload Suricata unless `--reload-command` is configured, and skips the command when no
  output file changed: new rules on disk, old rules in memory.
- **A rule reload builds a second detection engine beside the live one**, so memory rises for the duration; the
  `unix-command` socket in `auto` mode exists only in live capture, so `suricatasc -c reload-rules` has nothing to
  connect to in an offline run.
- **`community-id` is off in the shipped eve-log config**, so correlation with Zeek or another sensor fails until it is
  enabled. In 8.0 `stats.whitelist` was renamed `stats.score` in eve output, unknown values in a rule's `requires`
  keyword stop the rule loading where 7.0 ignored them, and the checksum keywords evaluate the real checksum even with
  `stream.checksum-validation: no`, so rules that never fired start firing on offloaded transmit traffic.
- **`delayed-detect` is commented out**, so signatures load before capture starts and an inline link is down for the
  load duration.

## Capture

- **Any NIC offload that produces frames larger than the wire datagram (GRO, LRO, TSO) drops packets in inline mode and
  breaks `dsize` and TCP state tracking in IDS mode.** With checksum offload on, transmitted packets read as invalid and
  rules are skipped. A sensor on a Proxmox bridge produced tens of thousands of "invalid checksum" and "truncated
  packet" alerts until offloads were turned off on the host and the guest (forum topic 5770).
- **AF_PACKET IPS needs a symmetric pair**: `copy-mode: ips` and `copy-iface` on both interfaces, a different
  `cluster-id` per interface, equal MTU on both, and `stream.inline` at `auto` or `yes`. The copy is interface to
  interface, so a box that routes between the two interfaces instead of bridging logs `[Drop]` for every matching packet
  while the packets keep passing (forum topic 5343); routed IPS needs NFQUEUE.
- **8.0 changed AF_PACKET defaults**: `defrag` off for inline mode with `cluster_flow`, `tpacket-v3` on for non-inline
  modes and off for inline and tap (the shipped yaml says it "causes severe latency" there), and the block size raised
  from 32k to 128k. `threading.cpu-affinity` changed from a list to a dictionary, with the list form accepted as well,
  so a half-converted file parses and pins unintended threads.
- **With NFQUEUE, packets in a queue with no listener are dropped**; the nftables `bypass` flag turns the queue rule
  into accept and removes the blocking capability with it. The shipped `nfq:` block has `fail-open` commented out, so a
  default install takes the link down the moment Suricata stops.
- **AF_PACKET XDP needs in-tree kernel drivers**; Intel's downloadable drivers lack the hooks, and the XDP program
  persists after the daemon exits so an IPS bypass map keeps redirecting.
- **`suricatasc` and `suricatactl` were rewritten in Rust in 8.0** and are not Python modules from 8.0 on.

## OPNsense

- **IPS mode needs a netmap-capable interface**, on the parent interface when VLANs are in use (netmap attaches to the
  physical device, so IPS on the VLAN child inspects nothing), with every hardware offload disabled under Interfaces
  then Settings; unsupported NICs need emulated mode. Native netmap on FreeBSD covers `cxgbe`, `em`, `iflib` (`igb` and
  `em`), `ix`, `ixl`, `re`, and `vtnet`; everything else is emulated and slower.
