# infrastructure Plugin

Infrastructure engineering discipline: foundational DevOps principles, Ansible automation,
container orchestration, Proxmox virtualization, Unraid NAS management, and network
architecture.

## Skills

| Skill | Purpose |
|-------|---------|
| `devops` | Foundational discipline: IaC principles, deliverable standards, change management, security posture (zero trust), observability (SLI/SLO), disaster recovery (RTO/RPO) |
| `ansible` | Ansible automation: playbook design, roles, inventory, vault, collections, execution environments, Molecule testing, variable precedence, error handling, performance |
| `containers` | Container management: Docker/Podman, Compose v2, Dockerfile optimization, Quadlet/systemd, networking, volumes, supply chain security, signal handling |
| `proxmox` | Proxmox VE: VM/LXC provisioning, storage (ZFS/Ceph/LVM), networking/SDN, clustering/HA, API automation, cloud-init, backups/PBS, PCIe passthrough |
| `unraid` | Unraid server management: arrays, Docker, VMs/GPU passthrough, shares, plugins, user scripts, backup (3-2-1), UPS/NUT, GraphQL API |
| `networking` | Network infrastructure: VLANs, firewalls (nftables), DNS, reverse proxies, VPN (WireGuard), TLS, IPv6, IDS/IPS (Suricata/CrowdSec), auth proxies (Authelia/Authentik) |

## Skill Relationships

The `devops` skill defines the discipline — what good infrastructure work looks like
regardless of tool. The other five skills (ansible, containers, proxmox, unraid, networking)
handle tool-specific conventions and patterns. The relationship mirrors `the-coder/coding`
and language plugins: `devops` runs first to establish principles, tool skills handle
implementation, then `devops` verifies the deliverable meets quality standards.

Workflow: `devops` → tool skill → `devops` (verification)

## Plugin Scope

This plugin covers infrastructure and operations tooling for homelab and self-hosted
environments. The `devops` skill provides cross-cutting principles that all tool skills
assume. Each tool skill targets a specific tool or domain within the infrastructure stack.

Skills assume the `the-coder` plugin for language-agnostic coding discipline when writing
configuration files, scripts, or automation code.

## Conventions

- Configuration examples must be production-ready, not toy examples
- Security practices are non-negotiable defaults, not optional add-ons
- Skills reference official documentation as the source of truth
- Platform-specific quirks and gotchas are documented explicitly
- The `devops` deliverable checklist applies to all infrastructure work
