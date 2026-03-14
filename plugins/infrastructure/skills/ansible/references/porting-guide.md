# Porting Guide: ansible-core 2.17 and 2.18

This reference covers breaking changes, removed features, and deprecations across ansible-core 2.17 and 2.18. Use it
when upgrading existing automation or when writing playbooks that must support multiple ansible-core versions.

## ansible-core 2.17

### Python Support Changes

The most impactful change: **Python 3.7+ is now required for target execution.** Python 3.5 and 3.6 are dropped. Python
2.7 support is also removed.

This was intentional -- ansible-core needs the `contextvars` module (introduced in Python 3.7) for future security
features.

### RHEL 8 Impact

**Critical:** Packaging modules (`dnf`, `package_facts`) on RHEL 8 depend on Python bindings built for the system's
default Python 3.6. These modules are **inoperable** with ansible-core 2.17.

- RHEL 8 environments must stay on **ansible-core 2.16** (supported through RHEL 8 end-of-life)
- This affects both local Ansible installs on RHEL 8 and remote management of RHEL 8 from newer controllers
- The `dnf` module transferred from a 2.17+ controller will fail on RHEL 8 targets because system Python bindings are
  3.6-only

### Removed Features

- `yum` module and `yum` action plugin -- removed and redirected to `dnf` (Python 2 removal)
- `include` module (deprecated since 2.12) -- use `include_tasks` or `import_tasks`
- `_remote_checksum` method in Action plugins -- use `_execute_remote_stat`
- `FileLock` class -- use third-party implementation
- `default.fact_caching_prefix` INI option -- use `defaults.fact_caching_prefix`
- `get_md5` parameter in `stat` module
- `scp_if_ssh` option in SSH connection plugin
- `JINJA2_NATIVE_WARNING` environment variable
- Deprecated `crypt` support from `ansible.utils.encrypt`
- Python 3.9 removed as supported version for automation controller -- use Python 3.10+

### Execution Environment Changes

The `python` symlink is no longer available in UBI9-based execution environments. Replace scripts using `python` or
`/bin/python` with `python3` or `/bin/python3`.

## ansible-core 2.18

### Removed Features

- **Old-style vars plugins** -- plugins using `get_host_vars` or `get_group_vars` entry points are removed. Update
  plugins to inherit from `BaseVarsPlugin` and define a `get_vars` method.
- **`smart` connection option** -- removed. The option previously chose between SSH and Paramiko automatically. Select
  an explicit connection plugin instead (`ansible.builtin.ssh`, `ansible.builtin.paramiko`).

### Deprecated Features

- `COLLECTIONS_PATHS` (plural INI option) -- use singular `COLLECTIONS_PATH`
- `ANSIBLE_COLLECTIONS_PATHS` (plural env var) -- use singular `ANSIBLE_COLLECTIONS_PATH`
- `STRING_CONVERSION_ACTION` configuration option -- no longer used in core
- `vaultid` parameter in vault/unvault filters -- use `vault_id` (removal in 2.20)
- `keepcache` string parameter in `yum_repository`
- `required` parameter in `ansible.module_utils.common.process.get_bin_path`
- Role entrypoint attributes in `ansible-doc`
- Convenience helpers imported from `ansible.module_utils.basic`: `get_exception`, `literal_eval`, `_literal_eval`,
  `datetime`, `signal`, `types`, `chain`, `repeat`, `PY2`, `PY3`, `b`, `binary_type`, `integer_types`, `iteritems`,
  `string_types`, `test_type`, `map`, `shlex_quote` -- import from their source definitions instead

## AAP 2.5 Platform Changes

### Unified UI and Platform Gateway

AAP 2.5 consolidates all services (automation controller, Event-Driven Ansible, automation hub) into a single unified
UI. The **Platform Gateway** handles authentication and authorization as the single entry point.

**Terminology changes:**

- Automation Execution = automation controller
- Automation Decisions = Event-Driven Ansible
- Automation Content = automation hub

### Deprecated in AAP 2.5

- Tokens for automation controller, automation hub, and EDA controller -- use Platform Gateway tokens instead
- Non-local authentications into controller and hub -- configure external auth (SAML, LDAP, RADIUS) through the Platform
  Gateway
- RPM-based installer -- deprecated with AAP 2.5. Investment shifts to containerized installer (Podman on RHEL) and
  operator-based (OpenShift). RPM installer will be removed in a future release.
- Execution Environment 29 -- deprecated in next major release after AAP 2.5
- Windows Server 2012 and 2012 R2 support -- removed (Microsoft EOL October 2023)

### Containerized Installer (GA)

AAP 2.5 supports three deployment models:

- **RPM** (deprecated) -- traditional RPM packages on RHEL
- **Containerized** (new, GA) -- components run in Podman containers on RHEL VMs/bare metal
- **Operator** -- Kubernetes-native on OpenShift

Containerized topologies:

- **Growth** -- all components on a single RHEL VM (non-production)
- **Enterprise** -- distributed across multiple VMs with redundancy

## AAP 2.6 Features

### Automation Dashboard

On-premise utility for monitoring, tracking, and reporting automation ROI. Track job success rates, time savings, and
return on investment. Export reports as PDF/CSV.

### Ansible Lightspeed Intelligent Assistant

AI-powered chat interface embedded in the platform UI. Provides on-demand support for troubleshooting, onboarding, and
day-to-day AAP management.

### Self-Service Automation Portal

Simplified interface for non-technical domain experts to launch pre-approved automation. Guided, point-and-click forms
auto-generated from existing job templates.

### Enhanced EDA in 2.6

- External secret management support (HashiCorp Vault)
- Editable project URLs
- Label to identify jobs triggered by EDA
- Enhanced Kafka support: multiple topics and wildcards

### New Microsoft Content (2.6)

- SCCM Updates and Info modules
- Active Directory Backup and Recovery
- Windows Compliance modules
- gMSA (Group Managed Service Accounts) modules
- Deploy Arc module
- Validated Windows Day 2 operations collection

### Windows Improvements

- **Windows Server 2025 CIS hardening** -- community roles (`ansible-lockdown`) for automated CIS Benchmark compliance.
  Support for tailored GPO creation and direct registry settings for controls without ADMX/ADML templates.
- **VS Code on Windows** -- improved development UX in AAP 2.6 Ansible Development Workspace (tech preview)
- **Collection updates** -- `ansible.windows` 2.8.0, `microsoft.ad` 1.8.0
- **WinRM debugging** -- dedicated "WinRM Debug" verbosity level (Level 5) in automation controller
- **HashiCorp Vault SSH** -- signed SSH credentials for dynamic, short-lived certificates replacing static keys

## Upgrade Strategy

### Pre-upgrade Validation

1. Run `ansible-lint` with the latest ruleset to catch deprecated module usage
2. Check Python versions on all managed hosts -- ensure 3.7+ for ansible-core 2.17+
3. Identify RHEL 8 hosts and plan to keep them on ansible-core 2.16 controllers
4. Audit for `include` module usage -- replace with `include_tasks` or `import_tasks`
5. Check for old-style vars plugins using `get_host_vars`/`get_group_vars`
6. Verify `COLLECTIONS_PATH` (singular) is used instead of plural form
7. Replace `/bin/python` references with `/bin/python3` in scripts and templates

### Policy-as-Code Validation

The Ansible ecosystem is shifting toward automated validation as a gate before production:

- **ansible-lint** -- static analysis with progressive profiles (basic through production)
- **Steampunk Spotter** -- enterprise policy enforcement with custom rule authoring
- **Checkov** -- security and compliance scanning for IaC including Ansible
- Integrate validation in CI/CD pipelines to catch breaking changes before they reach production

### Release Cycle Awareness

Ansible Core releases are accelerating with more frequent deprecations and behavioral changes. Adopt automated
validation tools and run them on every change. Automation that worked in prior versions may break silently after upgrade
if not proactively validated.
