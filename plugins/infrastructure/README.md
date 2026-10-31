<div align="center">

# infrastructure

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757.svg)](https://code.claude.com/docs/en/plugins)
[![XERJ Corpus Hub contributor](https://hub.xerj.org/contributors/xobotyi/badge.svg)](https://hub.xerj.org/contributors/xobotyi)

</div>

Infrastructure changes handled like production work, from the plan to the evidence that closes them, across Ansible,
containers, Proxmox, and network configuration.

## The Problem

Infrastructure work — writing Ansible playbooks, configuring Docker containers, managing Proxmox clusters, setting up
network segments — requires deep domain knowledge that generic coding assistants lack. Without it, AI agents produce
configurations that work in demos but fail in production: insecure defaults, missing error handling, no idempotency
guarantees, naive networking assumptions.

## The Solution

Five skills: one foundational discipline skill defining what good infrastructure work looks like, and four
domain-specific skills targeting concrete tools and technologies. All enforce production-grade conventions,
security-first defaults, and ground their guidance in official documentation.

## Installation

```
/plugin install infrastructure --marketplace xobotyi/cc-foundry
```

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

### networking

What a network configuration does once loaded, where that differs from what the file reads. An nftables `accept` ends
one chain while `drop` ends the ruleset, and `flush ruleset` takes Docker's tables with it; a published container port
never meets the host `input` chain, and Docker's nftables backend has no `DOCKER-USER` chain at all; systemd's shipped
sysctl file makes a write to `rp_filter` on `conf.all` a no-op; Docker rewrites a container's `resolv.conf` toward
Google when the host runs systemd-resolved; Unbound ships `home.arpa` as a static zone and refuses to query localhost by
default; Pi-hole v6 renamed every container variable and ignores `/etc/dnsmasq.d`; Caddy sorts directives by its own
table and trusts no proxy, Traefik attaches a router with no entry point to all of them and computes renewal from a
configured duration, nginx drops every inherited `proxy_set_header` the moment one is set lower; a forward-auth proxy
must strip inbound identity headers itself; wg-quick computes MTU from the endpoint route and captures the default route
on a `/0`; Tailscale on Linux accepts no routes until told to; Suricata's shipped `HOME_NET` makes a sensor on a public
prefix alert on nothing, and CrowdSec's firewall component writes its rules once and never checks them again. Fourteen
references, one per tool or concern, each loaded only when that artifact is in hand. Built from the tools' own
documentation, man pages, source, and advisories, verified page by page.

## License

MIT
