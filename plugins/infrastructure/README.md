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

The discipline of an infrastructure change, above any one tool — analogous to `the-coder/coding` for software
engineering. What a change carries before apply (target identity, a plan made against the state apply will use, the
captured reverse, the credential scope it is allowed), how it is applied and stopped, what "applied" does not prove for
systemd, daemons, firewalls, Compose, Kubernetes, GitOps controllers, Proxmox, DNS, certificates, and WireGuard, which
changes a revert cannot reverse, where secrets leak and how fast certificates now expire, what each open-source verifier
proves and cannot see, backup consistency and recovery order, and the evidence that closes a change. Built from operator
postmortems and agent incidents of 2023 through 2026, not from restated principles.

### ansible

Ansible as it behaves on the ansible-core line a project pins (2.18 through 2.21): what the 2.19 templating engine
refuses, which task results are claims rather than measurements, where a variable's value comes from, handler and
delegation semantics, vault at rest, and the ansible-lint and Molecule loop that proves a change. One reference per core
line carries the additions, removals, deprecations, and traps of that line.

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
