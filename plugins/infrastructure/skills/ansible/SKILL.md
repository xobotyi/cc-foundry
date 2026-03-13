---
name: ansible
description: >-
  Ansible automation: playbook design, role structure, inventory, vault, collections,
  execution environments, testing with Molecule, variable precedence, error handling,
  Jinja2 templating, performance tuning, security hardening, and content signing.
  Invoke whenever task involves any interaction with Ansible — writing playbooks,
  creating roles, managing inventory, reviewing automation code, or debugging
  Ansible runs.
---

# Ansible

Idempotency is the highest Ansible virtue. Every task must describe desired state, not
a sequence of commands.

## References

Extended examples, patterns, and detailed rationale for the rules below live in
`${CLAUDE_SKILL_DIR}/references/`.

| Topic | Reference | Contents |
|-------|-----------|----------|
| Play structure, import vs include, project layout, verification | [`${CLAUDE_SKILL_DIR}/references/playbook-patterns.md`] | Execution order, static vs dynamic reuse comparison, batched execution, standard directory layouts |
| Directory structure, defaults vs vars, argument validation, dependencies | [`${CLAUDE_SKILL_DIR}/references/role-structure.md`] | Role directory tree, using roles three ways, platform-specific task splitting, deduplication rules |
| Formats, grouping, dynamic inventory, cloud plugins, constructed inventory | [`${CLAUDE_SKILL_DIR}/references/inventory-management.md`] | YAML/INI examples, group hierarchy, environment separation, AWS/Azure/GCP/NetBox/Terraform plugins, multi-cloud chaining, caching |
| Vault encryption, vars/vault pattern, content signing, CIS benchmarks | [`${CLAUDE_SKILL_DIR}/references/vault-and-security.md`] | File vs variable encryption, password sources, ansible-sign, GPG verification, hardening roles, compliance scanning, security smells |
| Precedence order, scoping, Jinja2 filters/tests, template files | [`${CLAUDE_SKILL_DIR}/references/variables-and-templating.md`] | Full 22-level precedence list, magic variables, YAML quoting gotcha, registered variables |
| Blocks, rescue/always, error control keywords, retry logic | [`${CLAUDE_SKILL_DIR}/references/error-handling.md`] | Block execution flow, rescue variables, failed_when/changed_when, any_errors_fatal |
| Handler mechanics, listen topics, delegation, async tasks | [`${CLAUDE_SKILL_DIR}/references/handlers-and-delegation.md`] | Handler execution order, flushing, delegate_to, delegate_facts, fire-and-forget async |
| Molecule drivers/scenarios, ansible-lint profiles, Mitogen, callback plugins | [`${CLAUDE_SKILL_DIR}/references/testing-and-performance.md`] | Molecule lifecycle, driver comparison, CI matrix testing, strategy plugins, SSH pipelining, fact caching, serial batching |
| EE definition files, ansible-builder, ansible-navigator, collection structure | [`${CLAUDE_SKILL_DIR}/references/execution-environments-and-collections.md`] | EE vs local installs, version 3 schema, FQCN migration, collection certification, Galaxy publishing |

## Anti-Patterns

Recognize and avoid these common production failures:

- **Procedural coding in YAML.** Ansible is a desired state engine, not a scripting
  language. Complex logic belongs in modules or filter plugins, not in task chains.
- **Monolithic roles.** A role should manage one service or microservice, not an entire
  stack. Keep provisioning separate from configuration and app deployment.
- **Treating roles as classes.** Roles are not programming constructs. Avoid deep
  inheritance hierarchies, tight coupling, or hard dependencies on external variables.
- **Monolithic inventories.** Split large inventories by function or region. A single
  static file with 5,000+ hosts takes 15-30 seconds just to load.
- **Manual-only reviews.** Integrate `ansible-lint` in CI and pre-commit. For enterprise
  environments, consider policy-as-code tools (Steampunk Spotter, Checkov) to enforce
  security and compliance gates before automation reaches production.

## Playbook Design

### Naming and Clarity

- **Always name plays, tasks, and blocks.** Unnamed tasks produce opaque output that
  makes debugging impossible.
- **Always specify `state:` explicitly.** Different modules have different defaults.
  `state: present` / `state: absent` makes intent visible.
- **Always use FQCN** (Fully Qualified Collection Names): `ansible.builtin.copy`, not
  `copy`. Prevents ambiguity when multiple collections are installed.

### Idempotency

- Prefer declarative modules (`ansible.builtin.template`, `ansible.builtin.service`,
  `ansible.builtin.user`) over imperative ones (`ansible.builtin.command`,
  `ansible.builtin.shell`)
- When `command`/`shell` is unavoidable, add `creates:`, `removes:`, or `changed_when:`
  to make it idempotent
- Test idempotency: run twice, second run must report zero changes

### Static vs Dynamic Reuse

- `import_tasks` / `import_role` -- static, parsed at load time. Tags propagate to all
  imported tasks. Cannot loop. Use when structure is fixed.
- `include_tasks` / `include_role` -- dynamic, evaluated at runtime. Tags apply only to
  the include statement. Can loop and use `when`. Use when inclusion is conditional.

Default to `import_*` for predictability.

### Project Layout

```
inventories/
  production/
    hosts
    group_vars/
    host_vars/
  staging/
    hosts
    group_vars/
    host_vars/
site.yml                  # imports tier playbooks
webservers.yml
dbservers.yml
roles/
  common/
  webserver/
  database/
```

`site.yml` imports tier playbooks. Each tier playbook maps host groups to roles.

## Roles

### Structure

```
roles/my_role/
  tasks/main.yml          # entry point
  handlers/main.yml       # auto-imported into play scope
  templates/*.j2          # Jinja2 templates
  files/                  # static files
  defaults/main.yml       # low-precedence (user-configurable)
  vars/main.yml           # high-precedence (internal constants)
  meta/main.yml           # dependencies
  meta/argument_specs.yml # argument validation (2.11+)
```

### defaults/ vs vars/

- `defaults/` -- easily overridden. Use for knobs users should change (ports, paths,
  feature flags).
- `vars/` -- hard to override. Use for internal constants the role needs to function.

### Naming

- Role names: lowercase, hyphens: `nginx-proxy`, `ssl-certs`
- Prefix all role variables with the role name: `nginx_port`, `nginx_worker_count`
- Prefix handler names with role name: `nginx : Restart nginx`

### Argument Validation

Define expected parameters in `meta/argument_specs.yml`. Validation runs before role
tasks execute.

### Dependencies

Defined in `meta/main.yml`. Run before the role. Deduplicated per play unless
parameters differ or `allow_duplicates: true` is set.

## Inventory

### Format

Prefer YAML over INI. INI `:vars` sections treat all values as strings, causing
type confusion.

### Grouping Strategy

Group along three dimensions:
- **What** (function): `webservers`, `dbservers`, `monitoring`
- **Where** (location): `dc1`, `dc2`, `us_east`
- **When** (environment): `production`, `staging`, `development`

### Environment Separation

Keep production and staging in separate inventory files or directories. Never mix
environments in a single inventory -- developers using a mixed inventory need access
to all vault passwords.

### Dynamic Inventory

Use inventory plugins (not scripts) for cloud providers:
- **AWS:** `amazon.aws.aws_ec2` -- groups from tags, instance types, regions
- **Azure:** `azure.azcollection.azure_rm` -- conditional groups, keyed groups
- **GCP:** `google.cloud.gcp_compute` -- zones, machine types, labels
- **NetBox:** `netbox.netbox.nb_inventory` -- single source of truth for hybrid
  environments, automatic group updates from tags/custom fields
- **Terraform:** `cloud.terraform.terraform_state` -- parse state files as inventory

Mix static and dynamic sources in the same inventory directory.

### Constructed Inventory

Build groups dynamically from host metadata using Jinja2 logic. Chain multiple
cloud inventories into a single constructed inventory for cross-cloud targeting.
Successor to Smart Inventories in AAP.

## Variables and Precedence

### The 22-Level Precedence Rule

Role `defaults/` is lowest. Extra vars (`-e`) always win. Most common layers:

| Want to... | Put variables in... |
|------------|-------------------|
| Set overridable defaults | Role `defaults/main.yml` |
| Set environment-wide values | `group_vars/all.yml` |
| Set group-specific values | `group_vars/<group>.yml` |
| Set host-specific values | `host_vars/<host>.yml` |
| Force a value in a role | Role `vars/main.yml` |
| Override everything at runtime | `--extra-vars` |

Define each variable in ONE place.

### YAML Quoting

Values starting with `{{ }}` must be quoted:
```yaml
app_path: "{{ base_path }}/app"    # correct
app_path: {{ base_path }}/app      # YAML parse error
```

### Common Gotchas

- **Boolean coercion:** YAML treats `yes`, `no`, `true`, `false`, `on`, `off` as
  booleans. Quote strings that match: `version: "yes"`, not `version: yes`
- **Octal numbers:** Leading zeros create octals in YAML 1.1. `mode: 0644` becomes
  `420` (decimal). Use `mode: "0644"` for file permissions.
- **Dictionary merge:** `combine()` does shallow merge. Nested dicts are replaced,
  not merged. Use `combine(recursive=true)` for deep merge.
- **Variable scope in loops:** `set_fact` in a loop overwrites on each iteration.
  Use `set_fact` with `{{ result | default([]) + [item] }}` to accumulate.

## Jinja2 Templating

All templating runs on the control node before task execution.

### Key Patterns

- **Filters:** `{{ value | default('fallback') }}`, `{{ list | unique }}`,
  `{{ dict1 | combine(dict2) }}`
- **Tests:** `when: result is defined`, `when: path is file`
- **Template files (.j2):** support loops, conditionals, macros -- full Jinja2

### Templates in Tasks vs Files

- Playbooks: only variable substitution and filters. No loops or conditionals in
  task arguments.
- Template files (.j2): full Jinja2 including `{% for %}`, `{% if %}`, `{% macro %}`.

## Vault and Security

### The vars/vault Pattern

```yaml
# group_vars/production/vars.yml  (plaintext, searchable)
db_password: "{{ vault_db_password }}"

# group_vars/production/vault.yml  (encrypted)
vault_db_password: "actual_secret"
```

Variable names remain greppable. Values stay encrypted.

### Password Automation

- Never type vault passwords manually for every run
- Use a password file (`--vault-password-file vault_pass.txt`) for local dev
- Use a password script (`.vault_pass.sh`) that fetches from a secrets manager
  for team environments
- In CI/CD, pass vault passwords via `ANSIBLE_VAULT_PASSWORD_FILE` environment
  variable pointing to a pipeline secret

### External Secret Managers

For enterprise or compliance-heavy environments, shift from static vault files
to runtime secret fetching via lookup plugins:
- HashiCorp Vault, AWS Secrets Manager, Azure Key Vault
- Eliminates manual vault file rotation
- Secrets never touch disk -- fetched at playbook runtime

### Content Signing

Use `ansible-sign` with GPG to sign project content. Creates checksum manifests
(SHA256) of protected files with detached GPG signatures. AAP automation
controller verifies signatures on project sync -- tampered projects fail to
update and no jobs launch. Automate signing in CI via
`ANSIBLE_SIGN_GPG_PASSPHRASE` environment variable.

### Security Hardening

- Use community CIS benchmark roles (e.g., `ansible-lockdown`) for automated
  compliance. Customize via `defaults/main.yml`, select levels via tags.
- Integrate OpenSCAP for compliance scanning and report generation.
- Watch for IaC security smells: root SSH login, command injection, plaintext
  secrets, unvalidated paths, outdated dependencies.

### Non-Negotiable Security Rules

- Never store passwords in plaintext variable files
- Never commit vault password files to version control
- Use `no_log: true` on tasks that handle secrets
- Use `become: true` at task level, not play level
- Use SSH key authentication, not password authentication

## Error Handling

### block/rescue/always

```yaml
block:
  - name: Deploy new version
    # ... tasks that might fail
rescue:
  - name: Rollback
    # ... recovery tasks
always:
  - name: Send notification
    # ... runs regardless
```

- `rescue` runs only when a `block` task fails
- `always` runs regardless of block/rescue outcome
- Rescue variables: `ansible_failed_task`, `ansible_failed_result`
- Hosts that fail in `block` but succeed in `rescue` are reported as
  **"rescued"**, not "failed" -- account for this in reporting

### Result Aggregation Pattern

For multi-host runs, capture per-host status in `block`/`rescue`, then
aggregate in `always` using `ansible_play_hosts_all` with `delegate_to:
localhost` and `run_once: true`. This produces a single summary of all
successes and failures across the fleet.

### Error Control

- `failed_when:` -- custom failure conditions
- `changed_when:` -- control when a task reports "changed"
- `ignore_errors: true` -- continue on failure (use sparingly)
- `any_errors_fatal: true` -- stop entire play on any host failure

### Retry

```yaml
- name: Wait for service
  ansible.builtin.uri:
    url: http://localhost:8080/health
  register: result
  until: result.status == 200
  retries: 30
  delay: 10
```

## Handlers

- Run once per play after all tasks complete (or on `meta: flush_handlers`)
- Execute in **definition order**, not notification order
- Multiple notifications to the same handler result in single execution
- Use `listen:` topics to group related handlers
- Never use variables in handler **names** -- use them in handler **parameters**
- Handlers from roles have global scope; prefix with `role_name : handler_name`

## Delegation and Async

### Delegation

Execute a task on a different host: `delegate_to: lb.example.com`. Use for
load balancer operations, centralized notifications, cross-host coordination.

`local_action:` is shorthand for `delegate_to: 127.0.0.1`.

When multiple hosts delegate to the same target, use `throttle: 1` or
`run_once: true` to prevent race conditions. `become` applies to the
delegated host, not the original target -- verify escalation permissions.

### Async

- `async: N, poll: M` (M > 0) -- extended timeout, still blocks
- `async: N, poll: 0` -- fire-and-forget, check later with `async_status`
- Do not use `poll: 0` with tasks requiring exclusive locks (package managers)

## Execution Environments

Container images bundling Ansible Core, Runner, collections, and all
dependencies. Replace traditional virtual environments for consistent
automation execution.

- **ansible-builder:** Creates custom EEs from definition files (version 3
  schema). Specify base image, Galaxy collections, Python packages, and system
  dependencies.
- **ansible-navigator:** Interactive TUI for playbook development. Drill into
  task outputs, inspect variables, replay artifacts for collaborative debugging.
  Tightly integrated with EEs for dev-prod parity.

Use EEs when: enterprise scale, complex dependencies, team consistency needed.
Use local installs for: simple setups, ad-hoc tasks, beginners.

## Collections

- Install with `ansible-galaxy collection install community.general`
- Pin versions in `requirements.yml` using open ranges:
  ```yaml
  collections:
    - name: community.general
      version: ">=7.0.0,<8.0.0"
  ```
- Always use FQCN in playbooks: `community.general.ufw`, not `ufw`
- Install collection dependencies before playbook execution in CI:
  `ansible-galaxy collection install -r requirements.yml`
- Vendor collections for air-gapped environments:
  `ansible-galaxy collection download -r requirements.yml -p ./collections/`
- Scope collection installs per project -- avoid global installs that create
  version conflicts across projects

### Collection Quality

- Run `ansible-test sanity --docker default` to enforce coding standards
- Run `ansible-lint --profile production` for certification-grade quality
- Use `galaxy-importer` in CI to replicate automation hub import checks
- Follow semantic versioning (minimum 1.0.0 for production)
- Specify `requires_ansible` in `meta/runtime.yml`
- For FQCN migration from standalone roles: use `plugin_routing` in
  `meta/runtime.yml` for backward-compatible redirects

## Testing

### Pipeline

1. **ansible-lint** -- static analysis in CI and pre-commit hooks
2. **--syntax-check** -- parse without executing
3. **--check --diff** -- dry run against staging
4. **Molecule** -- role-level testing with idempotency verification
5. **Matrix testing** -- multiple OS versions and Ansible versions in CI
6. **Staging environment** -- full run before production

### Molecule

Standard role testing framework. Provides provisioning (Docker/Podman/Vagrant/
cloud/delegated), role application, verification, and idempotency testing.

Drivers: Docker (fast, local dev), Podman (rootless, enterprise), Vagrant
(full VM, systemd), cloud (production-like), delegated (default in Molecule 6,
uses Ansible itself for provisioning).

Run `molecule test` for the full lifecycle. Use multiple scenarios for
different conditions (default, HA cluster, upgrade, edge cases).

## Performance

- Increase `forks` (default 5) for parallel host execution -- start at 2-4x
  CPU cores, monitor control node memory
- Enable SSH pipelining: `pipelining = True` with ControlPersist
- **Mitogen strategy plugin:** replaces SSH-based execution with RPC protocol,
  1.5x-7x faster. Use `mitogen_linear` or `mitogen_free`. Most impactful for
  playbooks with many small tasks.
- Cache facts: `gathering = smart` with `fact_caching = jsonfile` (or Redis)
- Disable `gather_facts` when not needed; use `gather_subset` to limit scope
- Use `synchronize` over `copy` for large file transfers
- Install packages as a list, not in a loop
- Use `serial` for staged batching in rolling deployments
- Profile before optimizing: `callbacks_enabled = timer, profile_tasks`

### Large Inventory Optimizations

- **Inventory caching:** Enable for dynamic inventories to avoid redundant API
  calls -- cuts loading from 30+ seconds to under 1 second
- **Constructed inventory plugin:** Build groups dynamically from host metadata
  instead of maintaining large static group definitions
- **Flat group hierarchies:** Deep nesting multiplies variable merge cost. Keep
  hosts in 3-4 groups instead of 6-7 nested groups.
- **Split inventories:** By function or region, target with `-i` or `--limit`
- **Memory management:** Avoid storing large data in `set_fact`; minimize
  `group_vars`/`host_vars` file count; disable unused variable lookups

## Application

When **writing** Ansible automation: apply all conventions silently. If an existing
codebase contradicts a convention, follow the codebase and flag the divergence.

When **reviewing** Ansible code: cite the specific violation and show the fix inline.

```
Bad:  "According to Ansible best practices, you should use FQCN..."
Good: "copy: -> ansible.builtin.copy:"
```

## Integration

The **coding** skill governs workflow (discovery, planning, verification); this skill
governs Ansible-specific conventions and patterns. Both are active simultaneously.

## Non-Negotiable Defaults

- Every task must be idempotent -- run twice, zero changes on second run
- Always use FQCN -- no short module names
- Always name plays, tasks, and blocks
- Never store secrets in plaintext -- use Vault
- Never commit vault password files to version control
- Use `no_log: true` on tasks handling secrets
- Use `become: true` at task level, not play level
- Use SSH key authentication, not password authentication
- Sign project content with `ansible-sign` in regulated environments

**Idempotency is the highest Ansible virtue. Describe desired state, never command
sequences.**
