# infrastructure Plugin

Infrastructure engineering discipline: foundational DevOps principles, Ansible automation, container orchestration,
Proxmox virtualization, Unraid NAS management, and network architecture.

## Skills

- **`devops`** — the discipline of an infrastructure change, above any one tool: what a change carries before apply
  (target identity, a fresh plan, the captured reverse, credential scope), how it is applied and stopped, what "applied"
  does not prove per class, which changes a revert cannot reverse, secrets and certificate lifecycle, what each verifier
  proves, backup and recovery, reconciliation controllers, and the evidence that closes a change
- **`ansible`** — Ansible as it behaves on the ansible-core line a project pins: the 2.19 templating rules, YAML parsing
  traps, idempotence and change reporting, failure and handler semantics, delegation and execution, variable precedence,
  roles and collections, connection and become, vault, and the ansible-lint and Molecule loop
- **`containers`** — container management: Docker/Podman, Compose v2, Dockerfile optimization, Quadlet/systemd,
  networking, volumes, supply chain security, signal handling
- **`proxmox`** — Proxmox VE: VM/LXC provisioning, storage (ZFS/Ceph/LVM), networking/SDN, clustering/HA, API
  automation, cloud-init, backups/PBS, PCIe passthrough
- **`unraid`** — Unraid server management: arrays, Docker, VMs/GPU passthrough, shares, plugins, user scripts, backup
  (3-2-1), UPS/NUT, GraphQL API
- **`networking`** — network infrastructure: VLANs, firewalls (nftables), DNS, reverse proxies, VPN (WireGuard), TLS,
  IPv6, IDS/IPS (Suricata/CrowdSec), auth proxies (Authelia/Authentik)

## Version References

`devops` has no version axis: it is a discipline over many tools with no shared release line. Its dated claims (the
certificate-lifetime schedule, tool status, controller defaults, the incidents its rules are drawn from) carry the date
or version in the sentence; nothing in it depends on when it is read.

`ansible` gates on the ansible-core line the project pins and names exactly one axis. The floor index lives inline in
the SKILL.md, because it decides what may be written; `references/versions/core-2.NN.md` holds one file per maintained
line, 2.18 through 2.21, each carrying what the line added, changed, removed, and deprecated with the removal target,
and the traps. Every claim in the version files is taken from the line's changelog on GitHub, not from the porting guide
alone — the 2.21 porting guide reports "no notable changes" for removals the changelog lists.

When a new ansible-core line ships: add the version reference from its changelog, add one index line naming only the
features the skill's own rules reference, update the support windows, extend the route-list range, update the skill's
`reference-inventory.json`, and drop any gate the new floor makes obsolete. The `ansible` community package maps one
major to one core line (11 → 2.18, 12 → 2.19, 13 → 2.20, 14 → 2.21); the docs release page can lag PyPI on that mapping.

## Skill Dependencies

`devops` and the tool skill are active at once across the whole change; there is no before-and-after sandwich. The
split, stated from both sides in the Integration sections: `devops` owns what a change must carry, how it is applied,
and the evidence that closes it; the tool skill (`ansible`, `containers`, `proxmox`, `unraid`, `networking`) owns how
its artifact is written and what it does, and wins on that question.

## Plugin Scope

Skills assume the `the-coder` plugin for language-agnostic coding discipline when writing configuration files, scripts,
or automation code. The Ansible Automation Platform product (controller, mesh, hub certification, the platform's
Event-Driven Ansible service, Lightspeed) is out of scope by decision: the `ansible` skill states the boundary once and
carries nothing about the product.

## Conventions

- Configuration examples must be production-ready, not toy examples
- Security practices are non-negotiable defaults, not optional add-ons
- Skills reference official documentation as the source of truth; a version-gated claim in `ansible` is verified against
  the line's changelog or porting guide fetched in the session, and a dated claim in `devops` against the operator's own
  postmortem, the tool's own documentation, or the advisory, fetched in the session — never against memory or a research
  report
- Platform-specific quirks and gotchas are documented explicitly
- `ansible` and `devops` split their references by load condition and state the condition at the point of need; there is
  no catalog block. A reference is one hop from SKILL.md
- `devops` carries no worked examples and no restated principles; every rule is a failure an agent produces without it,
  and an incident cited beside a rule is a fixed anchor, not an example to imitate
