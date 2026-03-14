# Execution Environments and Collections

## Execution Environments (EEs)

Container images that bundle Ansible Core, Ansible Runner, collections, and all required Python and system-level
dependencies into a single portable unit. EEs replace traditional virtual environments for running automation.

### When to Use EEs vs Local Installs

| Aspect                | Local Install               | Execution Environment           |
| --------------------- | --------------------------- | ------------------------------- |
| Dependency management | Manual, per-node            | Bundled in image                |
| Isolation             | Shared system libraries     | Fully containerized             |
| Scalability           | Hard to maintain at scale   | Same image everywhere           |
| Use case              | Simple setups, ad-hoc tasks | Enterprise, complex deps, teams |

### ansible-builder

The tool for creating custom EEs. Takes an EE definition file as input, generates a build context, and produces a
container image.

```bash
pip install ansible-builder
ansible-builder build --tag my-custom-ee:latest
```

Requires a container runtime (Podman or Docker) installed.

### EE Definition File

Configuration in YAML, typically `execution-environment.yml`. Use version 3 schema for full functionality:

```yaml
version: 3

images:
  base_image:
    name: registry.redhat.io/ansible-automation-platform-24/ee-minimal-rhel8:latest

dependencies:
  galaxy: requirements.yml    # collections to install
  python:
    - jmespath
    - netaddr
    - psutil
  system: bindep.txt          # system packages in bindep format

additional_build_files:
  - src: files/ansible.cfg
    dest: configs

additional_build_steps:
  prepend_galaxy:
    - ADD _build/configs/ansible.cfg /home/runner/.ansible.cfg
  append_final:
    - RUN echo "Custom EE build complete"
```

Key sections:

- **version:** Schema version (use 3)
- **images:** Base image providing OS and initial packages
- **dependencies:** Galaxy collections, Python packages, system packages
- **additional_build_files:** Files to copy into build context
- **additional_build_steps:** Custom commands at various build stages

### ansible-navigator

Interactive TUI for playbook development and debugging. Tightly integrated with EEs.

Key features:

- **Interactive mode:** Drill into task outputs, inspect variables without re-running with verbosity flags
- **EE switching:** Test playbooks against different EEs for compatibility
- **Artifact replay:** Saves run artifacts as JSON, shareable with teammates for collaborative debugging
- **Check mode:** Dry run results clearly marked in TUI

Configuration (`.ansible-navigator.yml`):

```yaml
ansible-navigator:
  mode: interactive
  execution-environment:
    enabled: true
    image: my-custom-ee:latest
  playbook-artifact:
    save-as: artifacts/{playbook_name}-{time_stamp}.json
```

Development workflow:

- Run playbooks in interactive mode for real-time inspection
- Use `--start-at-task` to skip ahead during iterative development
- Replay artifacts: `ansible-navigator replay artifact.json`
- Share `.ansible-navigator.yml` in project repo for team consistency

## Collections

### Structure

```
ansible_collections/{namespace}/{collection_name}/
  galaxy.yml              # build info, authors, version, dependencies
  meta/runtime.yml        # ansible-core compatibility, plugin routing
  plugins/
    modules/              # custom modules (Python)
    filter/               # custom filter plugins
    inventory/            # inventory plugins
  roles/                  # roles bundled in the collection
  playbooks/              # example playbooks
  docs/                   # documentation
  tests/                  # test suites
  LICENSE
  README.md
```

### Metadata Files

**galaxy.yml** -- build and distribution metadata:

- Description, authors, version (semantic versioning, min 1.0.0 for production)
- Dependencies on other collections
- Tags for discovery (e.g., `networking`, `security`, `cloud`)
- License (must be OSI-approved for certification)

**meta/runtime.yml** -- compatibility and routing:

- `requires_ansible` -- supported ansible-core versions
- `plugin_routing` -- redirects for renamed/moved plugins (backward compat)
- `action_groups` -- logical groupings of action plugins

### Collection Development Workflow

1. Scaffold: `ansible-galaxy collection init namespace.collection_name`
2. Add content: modules in `plugins/modules/`, roles in `roles/`
3. Pin dependencies in `galaxy.yml`
4. Test with `ansible-test` (see Testing reference)
5. Build: `ansible-galaxy collection build`
6. Publish to Galaxy or Automation Hub

### Installation and Versioning

```yaml
# requirements.yml -- pin with open ranges
collections:
  - name: community.general
    version: ">=7.0.0,<8.0.0"
  - name: amazon.aws
    version: ">=6.0.0,<7.0.0"
```

```bash
ansible-galaxy collection install -r requirements.yml
```

- Always use FQCN in playbooks: `community.general.ufw`, not `ufw`
- Scope installs per project to avoid cross-project version conflicts
- Vendor for air-gapped environments: `ansible-galaxy collection download -r requirements.yml -p ./collections/`

### FQCN Migration from Standalone Roles

When migrating roles into collections:

1. Move role content into `roles/` directory within the collection
2. Transition all module references to FQCN
3. Use `plugin_routing` in `meta/runtime.yml` for backward compatibility: redirects for plugins that were renamed or
   moved
4. Keep roles loosely coupled -- limit hard dependencies on external variables
5. Extract tasks to `tasks/main.yml`, handlers to `handlers/main.yml`, templates to `templates/`

### Collection Quality

- Run `ansible-test sanity --docker default` for coding standards
- Run `ansible-lint --profile production` for certification-grade quality
- Use `galaxy-importer` in CI to replicate automation hub import checks
- Specify `requires_ansible` in `meta/runtime.yml`
- Follow semantic versioning (minimum 1.0.0 for production)
- Include at least one standard tag in `galaxy.yml` for Automation Hub

### Certification Requirements (Automation Hub)

- All sanity tests must pass
- Semantic versioning >= 1.0.0
- OSI-approved license
- `requires_ansible` set to supported ansible-core version
- No binary files (only Python or PowerShell plugins)
- Dependencies must reference other certified collections
- At least one standard tag in `galaxy.yml`
- External Python deps listed in `requirements.txt` with open ranges (`>=`)

## Automation Mesh

Automation mesh is an overlay network that distributes automation workloads across execution nodes using peer-to-peer
connections via Receptor. It replaces the older isolated nodes model from Ansible Tower with a more flexible, resilient
architecture.

### Architecture

- **Control nodes** -- run the automation controller, manage job scheduling and RBAC
- **Execution nodes** -- where ansible-playbook actually runs inside execution environments
- **Hop nodes** -- relay traffic between control and execution nodes across network boundaries

Mesh creates peer-to-peer connections using existing network connectivity, increasing resilience against latency and
disruptions. Execution capacity scales independently from the control plane.

### Scaling Execution Capacity

Add standalone execution nodes to the mesh without re-running the main installation:

1. Download the mesh configuration bundle from the automation controller
2. Install `ansible-core` on the new execution node
3. Run the bundle playbook to register the node with the mesh

On OpenShift, add/remove nodes dynamically through the UI's Instances resource without running the installer.

### Node Types and Capacity

- More CPU cores and RAM per node = more concurrent jobs
- Container groups bypass the normal capacity algorithm -- set forks at the job template level
- Use `--limit` and instance groups to control which nodes handle which workloads

## AAP Platform Architecture (2.5/2.6)

### Components

- **Platform Gateway** -- single entry point for authentication, authorization, and the unified UI. Replaces separate
  logins for controller, hub, and EDA.
- **Automation Controller** (formerly Ansible Tower) -- job scheduling, execution history, RBAC, inventory/credential
  management
- **Event-Driven Ansible Controller** -- real-time event processing and rulebook-based automation decisions
- **Automation Hub** -- certified and supported Ansible Content Collections from Red Hat and partners
- **Private Automation Hub** -- internal collection repository for air-gapped or restricted environments
- **Automation Mesh** -- networking layer connecting controllers, gateways, and execution nodes
- **PostgreSQL** -- persistent storage for all platform data

### Deployment Models (AAP 2.5+)

Three supported deployment models:

- **RPM** (deprecated) -- traditional packages on RHEL. Will be removed in a future release.
- **Containerized** (GA in 2.5) -- components run in Podman containers on RHEL. Growth topology (single VM,
  non-production) or Enterprise topology (multi-VM, redundant).
- **Operator** -- Kubernetes-native on OpenShift. Growth (Single Node OpenShift) or Enterprise (multi-node cluster).

### Enterprise Topology

For high availability, the enterprise topology provides:

- 2x Platform Gateways behind a load balancer
- 2x Automation Controllers
- 2x Automation Hubs (HA Hub)
- 2x EDA Controllers (API + worker node separation)
- External PostgreSQL database
- HAProxy or equivalent load balancer

### Horizontal Scaling

**EDA scaling** (AAP 2.5+): Multi-node EDA with separate API nodes (user requests) and worker nodes (rulebook
activations). Scale each independently.

**Mesh scaling**: Add execution nodes to increase job capacity. On OpenShift, dynamically manage through the Instances
UI.

**Hub HA**: Multiple hub nodes behind a load balancer for content distribution resilience.

### AAP 2.6 Additions

- **Automation Dashboard** -- on-premise ROI tracking and reporting utility
- **Ansible Lightspeed Intelligent Assistant** -- AI chat in the platform UI
- **Self-Service Automation Portal** -- point-and-click interface for non-technical users
- **Refreshed UI** -- cleaner, more responsive, enhanced accessibility
- **AI-assisted inventory generation** (developer preview) -- describe topology, get validated inventory
