# Testing and Performance

## Testing Approaches

### ansible-lint

Static analysis tool with community-maintained rules:

```bash
ansible-lint playbooks/ roles/
```

Key rules it enforces:
- FQCN usage
- Named tasks
- Explicit state parameters
- No deprecated modules
- Proper YAML formatting
- No `command`/`shell` when a module exists

Integrate into CI/CD pipelines and pre-commit hooks.

### ansible-lint Profiles

Progressive profiles for content quality:

- **basic** -- syntax, YAML formatting
- **moderate** -- deprecated modules, unnamed tasks
- **safety** -- security-related checks (root login, plaintext secrets,
  command injection, input validation)
- **shared** -- team collaboration standards
- **production** -- enforces ALL rules; required for Red Hat Ansible certification

For certified collections, pass the `production` profile with zero warnings:
`ansible-lint --profile production`

### Syntax checking

```bash
ansible-playbook --syntax-check site.yml
```

Parses playbooks without executing. Catches YAML errors, undefined roles, invalid
module arguments.

### Check mode (dry run)

```bash
ansible-playbook --check --diff site.yml
```

Reports what would change without making changes. `--diff` shows file content
changes. Not all modules support check mode -- test to verify.

## Molecule

Testing framework for Ansible roles and collections. Provides provisioning,
role application, verification, idempotency testing, and cleanup.

### Lifecycle

When you run `molecule test`, it executes stages in order:

1. `dependency` -- install role dependencies from Galaxy
2. `cleanup` -- pre-test cleanup (custom tasks)
3. `destroy` -- remove existing test instances
4. `syntax` -- `ansible-playbook --syntax-check`
5. `create` -- spin up test instances via configured driver
6. `prepare` -- run preparation tasks (install prerequisites)
7. `converge` -- execute the role against instances
8. `idempotence` -- run converge again, expect zero changes
9. `side_effect` -- optional tasks for complex scenarios (failover)
10. `verify` -- run tests to validate the role worked
11. `cleanup` -- post-test cleanup
12. `destroy` -- tear down test instances

### Drivers

| Driver | Speed | Realism | Use when |
|--------|-------|---------|----------|
| Docker | Fast | Limited systemd | Local dev, CI, no kernel interaction |
| Podman | Fast | Rootless, SELinux | RHEL/enterprise, restricted Docker |
| Vagrant | Slow | Full VM, real systemd | Roles needing real kernel or systemd |
| Cloud (EC2/Azure/GCE) | Slow | Production-like | Cloud API interactions, hardware-specific |
| Delegated | Varies | Custom | Enterprise (default in Molecule 6), custom infra |

Podman is gaining traction because it is rootless and daemonless, reducing the
security attack surface. It is the native choice for RHEL environments and
supports SELinux natively.

The **delegated** driver (default in Molecule 6) uses Ansible itself to provision
test infrastructure, unifying the testing framework with the automation platform.

### Multiple Scenarios

Test a single role under different conditions:

```
molecule/
  default/              # single-node basic installation
    molecule.yml
    converge.yml
    verify.yml
  ha-cluster/           # multi-node HA testing
    molecule.yml
    converge.yml
    verify.yml
  upgrade/              # version migration testing
    molecule.yml
    prepare.yml         # install old version first
    converge.yml
    verify.yml
```

Key scenario patterns:
- **Default** -- validates core "out of the box" functionality
- **Clustered** -- tests multi-node HA, network connectivity, distributed logic
- **Upgrade** -- tests migration from older versions, data integrity
- **Edge case** -- failover mechanisms, service interruptions

Run a specific scenario: `molecule test -s ha-cluster`

### Verifiers

**Ansible verifier (default):** Uses playbooks with `assert` module. No Python
knowledge needed -- familiar YAML syntax for playbook writers.

**Testinfra (optional, Python-based):** Uses `pytest` for parallel test
execution and granular multi-failure reporting. Better for complex validation
where many checks need to run independently. Install separately with
`pip install testinfra`.

### Converge Playbook

```yaml
- name: Converge
  hosts: all
  roles:
    - role: my_role
      vars:
        my_role_port: 8080
        my_role_enable_ssl: true
```

### Verification Playbook

```yaml
- name: Verify
  hosts: all
  tasks:
    - name: Check nginx is installed
      ansible.builtin.package_facts:
        manager: auto
    - name: Assert nginx is present
      ansible.builtin.assert:
        that: "'nginx' in ansible_facts.packages"

    - name: Check nginx is listening on configured port
      ansible.builtin.wait_for:
        port: 8080
        timeout: 5
```

### CI Integration

#### GitHub Actions

```yaml
# .github/workflows/molecule.yml
jobs:
  molecule:
    strategy:
      fail-fast: false
      matrix:
        distro: [ubuntu2204, rockylinux9, debian12]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install molecule molecule-plugins[docker] ansible-lint
      - run: molecule test
        env:
          MOLECULE_DISTRO: ${{ matrix.distro }}
          PY_COLORS: '1'
          ANSIBLE_FORCE_COLOR: '1'
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
molecule:
  stage: test
  image: python:3.11
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  parallel:
    matrix:
      - SCENARIO: [default, ha-cluster]
  script:
    - pip install molecule molecule-plugins[docker]
    - molecule test -s $SCENARIO
  artifacts:
    reports:
      junit: molecule/**/report.xml
```

Matrix builds run scenarios in parallel across runners -- testing five distros
does not take five times as long.

### ansible-test (Collections)

For collections, `ansible-test` provides sanity, unit, and integration testing:

```bash
cd .../ansible_collections/{namespace}/{collection_name}/
ansible-test sanity --docker default    # recommended: controlled deps
ansible-test units                      # unit tests
ansible-test integration                # integration tests
```

Passing all sanity tests is mandatory for collection certification. Use
`galaxy-importer` in CI to replicate automation hub import checks before upload.

### Testing Strategy

1. **ansible-lint** in pre-commit hooks and CI (fast feedback)
2. **--syntax-check** in CI for all playbooks
3. **Molecule** for role-level testing with idempotency checks
4. **Matrix testing** across multiple OS versions in CI
5. **--check --diff** against staging before production runs
6. **Staging environment** full run before production

## Performance Optimization

### Forks

Increase parallel host execution (default is 5):

```ini
# ansible.cfg
[defaults]
forks = 20
```

Starting point: 2-4x CPU core count of the control node. For 50-100 hosts,
15-25 forks works well. Larger environments: 30-50 forks if the control node
has sufficient resources. Monitor memory usage when scaling.

### SSH Pipelining and Multiplexing

Enable pipelining to reduce SSH connections per task:

```ini
# ansible.cfg
[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

- **Pipelining** executes many commands over a single connection
- **ControlMaster** reuses SSH connections across tasks
- **ControlPersist=60s** keeps idle connections for 60 seconds (use 300s for
  long playbooks)
- Requires `requiretty` disabled in sudoers on target hosts

### Mitogen Strategy Plugin

Third-party plugin that replaces Ansible's default SSH-based module execution
with an efficient RPC protocol. Makes playbooks **1.5x to 7x faster**.

How it works: instead of per-task SSH connect -> SFTP transfer -> execute ->
cleanup, Mitogen bootstraps a persistent Python interpreter on the remote host
and sends task code via binary RPC. This eliminates most per-task overhead.

```ini
# ansible.cfg
[defaults]
strategy_plugins = /path/to/mitogen/ansible_mitogen/plugins/strategy
strategy = mitogen_linear    # or mitogen_free
```

Find the path: `python3 -c "import ansible_mitogen; print(ansible_mitogen.__path__[0])"`

Production recommendations:
- Start with `mitogen_linear`, test thoroughly
- Compare outputs between stock and Mitogen for each playbook
- Keep a fallback path to stock Ansible
- Monitor control node memory (Mitogen uses more due to persistent interpreters)
- Mitogen compatibility can lag behind new ansible-core releases

Most impactful for playbooks with many small tasks where per-task SSH overhead
dominates execution time.

### Fact Caching

Cache gathered facts to avoid re-gathering on subsequent runs:

```ini
# ansible.cfg
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 3600
```

For distributed environments, use Redis instead of jsonfile:

```ini
fact_caching = redis
fact_caching_connection = localhost:6379:0
```

### Selective Fact Gathering

Disable when not needed or gather only what you need:

```yaml
- name: Quick configuration update
  hosts: webservers
  gather_facts: false

- name: Network configuration only
  hosts: all
  gather_subset:
    - network
    - hardware
```

### Strategy Plugins

**Linear (default):** All hosts complete each task before moving to next. Safe
but creates unnecessary waiting when tasks have different execution speeds.

**Free:** Faster hosts proceed without waiting for slower ones. Ideal for
independent tasks with no inter-host dependencies.

**Mitogen variants:** `mitogen_linear` and `mitogen_free` provide the same
execution logic with vastly superior connection performance.

### Callback Plugins for Observability

```ini
# ansible.cfg
[defaults]
callbacks_enabled = timer, profile_tasks, profile_roles
stdout_callback = yaml
```

| Plugin | Purpose |
|--------|---------|
| `timer` | Total playbook execution time |
| `profile_tasks` | Per-task timing to identify bottlenecks |
| `profile_roles` | Timing at the role level |
| `dense` | Compressed output for large-scale runs |
| `yaml` | Structured YAML output (easier to read) |
| `json` | JSON output for external tool consumption |

**Profile before optimizing.** `profile_tasks` identifies real bottlenecks --
do not optimize blindly.

### Serial Batching

Process hosts in staged batches to avoid overloading central resources:

```yaml
- name: Rolling update
  hosts: webservers
  serial: "20%"    # or [1, 5, "100%"] for canary pattern
```

Prevents overwhelming package repositories, SSH connection limits, or other
shared infrastructure during large deployments.

### Production-Ready ansible.cfg

```ini
[defaults]
forks = 20
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 3600
callbacks_enabled = timer, profile_tasks
stdout_callback = yaml

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey
```

### Memory Optimization

Large inventories consume significant memory. Strategies to reduce:
- Disable `gather_facts` when not needed
- Minimize `group_vars`/`host_vars` file count
- Avoid storing large data structures in `set_fact`
- Use `--limit` to reduce the active host set during development
- Flatten group hierarchies: 3-4 groups per host instead of 6-7 nested groups

### General Guidelines

- Minimize task count -- each task has SSH overhead
- Install packages as a list, not in a loop (single transaction vs N round-trips)
- Prefer `synchronize` (rsync) over `copy` for large file transfers
- Use `async` for independent long-running tasks that can run in parallel
- Use `--limit` to target specific hosts during development
