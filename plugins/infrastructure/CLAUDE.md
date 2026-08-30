# infrastructure Plugin

Infrastructure engineering discipline: foundational DevOps principles, Ansible automation, container orchestration,
Proxmox virtualization, Unraid NAS management, and network architecture.

## Skills

- **`devops`** — foundational discipline: IaC principles, deliverable standards, change management, security posture
  (zero trust), observability (SLI/SLO), disaster recovery (RTO/RPO)
- **`ansible`** — Ansible automation: playbook design, roles, inventory, vault, collections, execution environments,
  Molecule testing, variable precedence, error handling, performance
- **`containers`** — container management: Docker/Podman, Compose v2, Dockerfile optimization, Quadlet/systemd,
  networking, volumes, supply chain security, signal handling
- **`proxmox`** — Proxmox VE: VM/LXC provisioning, storage (ZFS/Ceph/LVM), networking/SDN, clustering/HA, API
  automation, cloud-init, backups/PBS, PCIe passthrough
- **`unraid`** — Unraid server management: arrays, Docker, VMs/GPU passthrough, shares, plugins, user scripts, backup
  (3-2-1), UPS/NUT, GraphQL API
- **`networking`** — network infrastructure: VLANs, firewalls (nftables), DNS, reverse proxies, VPN (WireGuard), TLS,
  IPv6, IDS/IPS (Suricata/CrowdSec), auth proxies (Authelia/Authentik)

## Skill Dependencies

`devops` defines the discipline, the five tool skills implement it: `devops` → tool skill → `devops` (verification).

## Plugin Scope

Skills assume the `the-coder` plugin for language-agnostic coding discipline when writing configuration files, scripts,
or automation code.

## Conventions

- Configuration examples must be production-ready, not toy examples
- Security practices are non-negotiable defaults, not optional add-ons
- Skills reference official documentation as the source of truth
- Platform-specific quirks and gotchas are documented explicitly
