# infrastructure

Infrastructure management discipline for Claude Code. Provides domain-specific guidance for Ansible automation,
container orchestration, Proxmox virtualization, Unraid NAS management, and network architecture.

## The Problem

Infrastructure work — writing Ansible playbooks, configuring Docker containers, managing Proxmox clusters, setting up
network segments — requires deep domain knowledge that generic coding assistants lack. Without it, AI agents produce
configurations that work in demos but fail in production: insecure defaults, missing error handling, no idempotency
guarantees, naive networking assumptions.

## The Solution

Six skills: one foundational discipline skill defining what good infrastructure work looks like, and five
domain-specific skills targeting concrete tools and technologies. All enforce production-grade conventions,
security-first defaults, and ground their guidance in official documentation.

## Skills

### devops

Foundational infrastructure discipline — analogous to `the-coder/coding` for software engineering. Defines
infrastructure-as-code principles, deliverable quality standards (idempotent, reproducible, documented), change
management patterns (rolling/blue-green/canary), security posture (zero trust, least privilege), observability (SLI/SLO,
DORA metrics), and disaster recovery (RTO/RPO tiering). Runs in a sandwich pattern: devops -> tool skill -> devops
(verification).

### ansible

Ansible automation: playbook design, role structure, inventory management (static/dynamic/ multi-cloud), vault
encryption, collections development, execution environments (ansible-builder/navigator), Molecule testing (5 drivers, CI
matrix), variable precedence, error handling (block/rescue/always), performance optimization (Mitogen, SSH pipelining,
fact caching), and content signing (ansible-sign).

### containers

Container management: Docker and Podman runtimes, Compose v2 orchestration, Dockerfile optimization (multi-stage,
BuildKit cache mounts), Quadlet/systemd integration, networking modes (bridge/host/macvlan/ipvlan), volume strategies,
supply chain security (SBOM, cosign, SLSA provenance), signal handling (PID 1, tini/dumb-init), and structured logging.

### proxmox

Proxmox VE administration: VM and LXC provisioning, storage backends (ZFS/Ceph/LVM-Thin), networking and SDN (VLAN-aware
bridges, VXLAN/EVPN), clustering and high availability (Corosync, fencing, QDevice), API automation (pvesh, Terraform,
cloud-init), backup strategies (vzdump, PBS with encryption and deduplication), PCIe/GPU passthrough (IOMMU, vGPU,
Looking Glass), and security (firewall, RBAC, ACME certificates).

### unraid

Unraid server management: array configuration (parity, cache/SSD pools, write modes), Docker containers (macvlan/ipvlan,
Compose, reverse proxy), VM management (GPU passthrough, IOMMU, performance tuning), shares and permissions, plugin
ecosystem (Community Applications), user scripts, backup strategy (3-2-1 with Borgmatic/Kopia/Restic), UPS/NUT
integration, and programmatic access (GraphQL API, MCP management agent).

### networking

Network infrastructure for self-hosted environments: VLAN segmentation and Layer 2 security, firewalls (nftables,
OPNsense/pfSense), DNS architecture (Pi-hole, AdGuard Home, split-horizon, DoH/DoT), reverse proxies (Traefik, Caddy,
Cloudflare tunnels), VPN (WireGuard with HA/OSPF, Tailscale), TLS/SSL (Let's Encrypt, ACME), IPv6 dual-stack, IDS/IPS
(Suricata, CrowdSec), authentication proxies (Authelia, Authentik), and SSH certificate authority.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install infrastructure
```
