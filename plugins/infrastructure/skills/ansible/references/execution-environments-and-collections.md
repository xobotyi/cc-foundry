# Execution Environments and Collections

## Execution Environments (EEs)

Container images that bundle Ansible Core, Ansible Runner, collections, and all
required Python and system-level dependencies into a single portable unit. EEs
replace traditional virtual environments for running automation.

### When to Use EEs vs Local Installs

| Aspect | Local Install | Execution Environment |
|--------|---------------|----------------------|
| Dependency management | Manual, per-node | Bundled in image |
| Isolation | Shared system libraries | Fully containerized |
| Scalability | Hard to maintain at scale | Same image everywhere |
| Use case | Simple setups, ad-hoc tasks | Enterprise, complex deps, teams |

### ansible-builder

The tool for creating custom EEs. Takes an EE definition file as input,
generates a build context, and produces a container image.

```bash
pip install ansible-builder
ansible-builder build --tag my-custom-ee:latest
```

Requires a container runtime (Podman or Docker) installed.

### EE Definition File

Configuration in YAML, typically `execution-environment.yml`. Use version 3
schema for full functionality:

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

Interactive TUI for playbook development and debugging. Tightly integrated
with EEs.

Key features:
- **Interactive mode:** Drill into task outputs, inspect variables without
  re-running with verbosity flags
- **EE switching:** Test playbooks against different EEs for compatibility
- **Artifact replay:** Saves run artifacts as JSON, shareable with teammates
  for collaborative debugging
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
- Vendor for air-gapped environments:
  `ansible-galaxy collection download -r requirements.yml -p ./collections/`

### FQCN Migration from Standalone Roles

When migrating roles into collections:
1. Move role content into `roles/` directory within the collection
2. Transition all module references to FQCN
3. Use `plugin_routing` in `meta/runtime.yml` for backward compatibility:
   redirects for plugins that were renamed or moved
4. Keep roles loosely coupled -- limit hard dependencies on external variables
5. Extract tasks to `tasks/main.yml`, handlers to `handlers/main.yml`,
   templates to `templates/`

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
