# Remediation

What CrowdSec, its remediation components, and fail2ban do with the configuration they are given. CrowdSec's
documentation renamed "bouncer" to "remediation component"; the CLI command is `cscli bouncers` and the config keys keep
the old word.

## CrowdSec engine

- **The 1.7 and 1.8 lines removed surfaces a 1.6-era config uses.** `cscli dashboard` is a hidden stub that errors with
  a removal notice since 1.7.0; a Docker or Podman container with no volume on `/var/lib/crowdsec/data` prints
  `No volume mounted` and exits 0 since 1.7.0, so `restart: unless-stopped` does not retry and an orchestrator sees a
  clean exit (`CROWDSEC_BYPASS_DB_VOLUME_CHECK` skips it); `cscli console status` was rewritten in 1.8.0, so parsing its
  old output breaks.
- **Only `*.yaml` and `*.yml` are read from `acquis.d/`**; a `.conf`, `.yaml.disabled`, or `.bak` file is never loaded
  and nothing says so. A missing `acquisition_path` file is skipped at debug level.
- **An empty `labels` block is a startup error; a wrong `labels.type` is never validated.** The value is a free-form
  parser filter, so the lines are read and match no parser stage, visible only as a nonzero unparsed count in
  `cscli metrics`. Some unparsed volume is normal, because parsers only parse the lines a scenario needs.
- **The default ban is `duration: 4h` from `/etc/crowdsec/profiles.yaml`, not from the scenario**; editing the scenario
  to change ban length does nothing. Profiles are walked in order and do not stop at the first match unless
  `on_success: break` is set. `blackhole` in a scenario discards overflows for its duration with a debug-level line
  only, so the scenario looks as if it stopped firing.
- **A locally edited hub item becomes `tainted`**: every upgrade skips it until `--force`, which discards the edit; and
  a tainted scenario stops sharing signals with the Central API and stops appearing in the Console.
- **Allowlists (`cscli allowlists`, 1.6.6 and later) are IP and range only**; parser whitelists remain in the 1.8 line
  for conditions on log elements such as URLs. From 1.6.9 creating or updating an allowlist deletes matching active
  decisions; before that the operator stayed banned until `cscli decisions delete`. A ban arriving through a blocklist
  bypassed the parser whitelist entirely and locked an operator out of a host whose address was whitelisted (issue
  3462).
- **`cscli decisions delete` removes the decision, and the source that created it recreates it on the next cycle**; only
  an allowlist prevents recurrence. A Console-subscribed blocklist takes up to two hours to arrive and lands under
  origin `lists`, not `CAPI`.
- **`cscli bouncers add` prints the API key once and stores a hash**; re-adding under an existing name fails with
  `already exists` rather than rotating. `BOUNCER_KEY_<name>=<key>` in the container environment registers with a chosen
  key. In agent-only Docker mode `LOCAL_API_URL` must be set to the LAPI host; a remotely registered agent is inert
  until validated with `cscli machines validate`.
- **The community blocklist is tiered by contribution**, arrives over CAPI, and does not require Console enrollment;
  enrollment gates the third-party blocklists. Traefik is served by a community plugin, not a first-party component;
  `crowdsecurity/cs-traefik-bouncer` does not exist.

## Firewall remediation component

- **The nftables chain is named `<chain>-<hook>`** inside table `crowdsec` (and `crowdsec6`), so `chain: crowdsec-chain`
  with hooks `input` and `forward` yields `crowdsec-chain-input` and `crowdsec-chain-forward`; grepping the ruleset for
  the configured name finds nothing.
- **`nftables_hooks` omitted defaults to `input` only**; forwarded traffic (Docker, a router, a bridge) is never
  filtered. The shipped template lists `input` and `forward`. An unrecognized hook name maps to the Go zero value, which
  is `prerouting`, with no error. `priority` omitted is 0, not the template's `-10`, so ordering against the operator's
  own chain at priority 0 is not guaranteed to favor the drop.
- **A banned IP with an established connection stays connected in nftables and iptables mode**; the backend only adds
  set elements and never touches conntrack (only the pf backend flushes state, from v0.0.32). An operator's
  `ct state established,related accept` at a lower priority keeps the session alive for the whole ban.
- **The component creates its table, chains, and rules once at startup and never re-checks them.** After
  `nft flush ruleset` or a firewalld or ufw reload the enforcement is gone while the component keeps logging successful
  decision syncs (issue 312). Re-adding a decision for an IP already in the set does not refresh the element's timeout,
  so the ban expires at the original time (issue 243, open).
- **`set-only: true` populates the set and creates no table, chain, or rule**; the operator's own `nft` rule must
  already reference the set or the set fills and nothing is blocked. A per-origin set `<blacklist>-<origin>` is created
  on the fly for CAPI, `lists`, and cscli decisions, so inspecting only `crowdsec-blacklists` shows a fraction of the
  bans.
- **Behind Cloudflare or any reverse proxy the firewall component blocks nothing**, because layers 3 and 4 see the
  proxy's address; decisions, sets, and dashboards all look right while traffic flows (discourse topic 2464). The nginx,
  Caddy, or Traefik component is the layer that sees `CF-Connecting-IP`.

## fail2ban

- **The default `banaction` moved out of `jail.conf` in 1.1.1 and the Debian paths file sets it to `nftables`**; 1.0.x
  and 1.1.0 hardcode `iptables-multiport`, which fails at ban time on an nftables-only host with
  `Failed to execute ban jail 'sshd' action 'iptables-multiport'` while the jail keeps running and detecting. The
  unified `nftables[type=multiport|allports]` action replaced the split actions in 0.10.5; `nftables-common` was
  removed.
- **`ignoreip` is commented out in stock `jail.conf`**; `ignoreself = true` covers the host's own addresses and never
  the operator's remote one.
- **OpenSSH 9.8 renamed the per-connection process to `sshd-session`**, and the sshd filter matched nothing until 1.1.1
  changed `_daemon` to `sshd(?:-session)?`: the jail runs, zero matches, zero bans (issue 3785). In the default
  `mode = normal`, "Connection closed by authenticating user ... [preauth]" is a `NOFAIL` and never counts toward
  `maxretry`; a key-only brute force generates no bans without `mode = ddos` or `aggressive`.
- **`backend = auto` never picked `systemd` through 1.1.0**, so a Debian or Ubuntu host without rsyslog aborted with
  `Have not found any log file for sshd jail` (issue 3292); 1.1.1 switches to `systemd` when no file matches `logpath`
  and a `journalmatch` exists. The `systemd` backend needs the python-systemd bindings and rejects `logpath`.
- **`bantime.increment` is off by default and needs the persistent SQLite database**; with `dbfile = :memory:` or after
  `dbpurgeage` (1 day) the count resets and escalation restarts. `bantime.maxtime` is empty, so the doubling series is
  capped only by the 2^20 clamp.
- **1.1.1's rewritten `iptables.conf` renames the `<chain>` and `<_ipt_for_proto-iter>` tags**, so a custom action
  derived from it fails on jail start.
