# infrastructure Plugin

Infrastructure engineering discipline: foundational DevOps principles, Ansible automation, container orchestration,
Proxmox virtualization, Unraid NAS management, and network architecture.

## Skills

- **`devops`** — foundational discipline: IaC principles, deliverable standards, change management, security posture
  (zero trust), observability (SLI/SLO), disaster recovery (RTO/RPO)
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

`devops` defines the discipline, the five tool skills implement it: `devops` → tool skill → `devops` (verification).
`ansible` names the split in its Integration section: `devops` owns what a deliverable must satisfy and how a change is
verified; `ansible` owns what a play, role, or inventory does and wins on that question.

## Plugin Scope

Skills assume the `the-coder` plugin for language-agnostic coding discipline when writing configuration files, scripts,
or automation code. The Ansible Automation Platform product (controller, mesh, hub certification, the platform's
Event-Driven Ansible service, Lightspeed) is out of scope by decision: the `ansible` skill states the boundary once and
carries nothing about the product.

## Conventions

- Configuration examples must be production-ready, not toy examples
- Security practices are non-negotiable defaults, not optional add-ons
- Skills reference official documentation as the source of truth; a version-gated claim in `ansible` is verified against
  the line's changelog or porting guide fetched in the session, never against memory or a research report
- Platform-specific quirks and gotchas are documented explicitly
- `ansible` splits its references by load condition and states the condition at the point of need; there is no catalog
  block. A reference is one hop from SKILL.md
