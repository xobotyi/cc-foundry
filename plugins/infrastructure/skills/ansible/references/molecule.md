# Molecule

Version 26.8.0, released 2026-08-12, requires Python 3.10 or later and supports only the two newest ansible-core lines
at its release. Molecule is Ansible's CLI driven from Python: every action is an `ansible-playbook` run, and every
verdict is read from Ansible's own output.

## Installation

- `pip` is the only supported method; a virtual environment is expected. `ansible-dev-tools` bundles Molecule with
  `ansible-lint`, `ansible-navigator`, and `ansible-core`; installing `molecule` alone brings no linter.
- Drivers live in `molecule-plugins`: `pip install "molecule-plugins[podman]"`, `[docker]`, `[vagrant]`, and so on. A
  leftover `molecule-podman` or `molecule-vagrant` package from an older install must be removed, because two entry
  points for one driver break plugin discovery.
- `python3 -m molecule` runs it under a chosen interpreter without the script on `PATH`.

## Two configuration styles

**Ansible-native** is the shape the schema is built around. `molecule.yml` has no `driver`, `platforms`, or
`provisioner` sections. An `ansible` section names the executor backend (`ansible-playbook` or `ansible-navigator`), the
arguments passed to it (an `--inventory` path among them), and the `playbooks` map (`create`, `destroy`, `converge`,
`verify`); a `scenario` section sets `test_sequence`; a `verifier` section keeps `name: ansible`.

Instances come from a real inventory source. `create.yml` provisions with collection modules
(`containers.podman.podman_container`, `amazon.aws.ec2_instance`) and must write the resolved address and port into an
inventory file under the `--inventory` path, because `molecule login` and `molecule list` run `ansible-inventory` as a
fresh process and see nothing that was not persisted. `destroy.yml` removes what `create.yml` made.

**Pre-ansible-native** keeps `driver`, `platforms`, `provisioner`, and `verifier`. The `delegated` driver (also spelled
`default`) is the built-in one and provisions nothing: the developer's `create.yml` must emit the `instance-config`
records (`address`, `user`, `port`, `identity_file` or `password`, `instance`) and `destroy.yml` must reset them.
`managed: false` skips create and destroy entirely and connects with `ansible_connection_options`. Docker and Podman
drivers ship bundled create and destroy playbooks resolved as `provisioner.playbooks.$driver.$action`, then
`provisioner.playbooks.$action`, then the bundled one. The `MOLECULE_DRIVER_NAME`, `MOLECULE_PROVISIONER_NAME`,
`MOLECULE_VERIFIER_NAME`, and `MOLECULE_VERIFIER_TEST_DIRECTORY` variables exist only for this style.

A tutorial written for Molecule 3 through 6 describes the second style and older schema; `schema[molecule]` in
ansible-lint rejects keys the current schema does not have.

## Sequences

Default `test_sequence`: `dependency`, `cleanup`, `destroy`, `syntax`, `create`, `prepare`, `converge`, `idempotence`,
`side_effect`, `verify`, `cleanup`, `destroy`. It is configurable per scenario, so `molecule test` passing does not by
itself prove `idempotence` or `verify` ran. `converge_sequence` is `dependency`, `create`, `prepare`, `converge`;
`check_sequence` ends in `check` then `destroy`; `destroy_sequence` is `dependency`, `cleanup`, `destroy`.

`side_effect` and `verify` take arguments naming playbooks or test paths relative to `molecule.yml`, and may appear
several times; `converge` and `idempotence` may repeat too. `cleanup` runs before every `destroy`, twice per test, so
its playbook must tolerate resources that do not exist yet. `prepare` runs once after `create` for the life of the
instances.

## Idempotence

The `idempotence` action runs `converge` a second time and reads Ansible's recap. It passes when every host reports
`changed=0` and fails otherwise. There is no state comparison behind it, so a task with `changed_when: false` passes
regardless of what it did, and a `command` task that reports `changed` on every run fails it regardless of the target
state. `molecule-idempotence-notest` on a task skips it during this action only; `molecule-notest` and `notest` skip a
task in every action.

## Verify

The `ansible` verifier is the default and runs `verify.yml` from the scenario directory. `testinfra` is an optional
verifier (`verifier: {name: testinfra}`) and is not installed with Molecule; a generated `test_*.py` under `tests/` does
nothing unless the verifier is switched and `pytest-testinfra` is present.

## Dependencies and paths

- `prerun` installs `requirements.yml` from the project root into `project_dir/.cache`, the same code ansible-lint uses;
  `prerun: false` disables it. `.config/molecule/config.yml` in `$HOME` or the project root holds defaults shared by
  every scenario.
- The `galaxy` dependency manager reads `requirements.yml` (`role-file`) and `collections.yml` (`requirements-file`)
  from the role directory; point both options at one file to use a combined `roles:` and `collections:` manifest.
  Installs go to the paths in `ansible.cfg`, so two scenarios needing different versions of one dependency collide.
- `roles_path` and `collections_path` are set in `ansible.cfg` from Molecule 6, not in `molecule.yml`.
  `provisioner.config_options` writes `ansible.cfg` for the run but refuses `library`, `filter_plugins`, and any
  `privilege_escalation` key.
- `provisioner.inventory` takes `hosts`, `group_vars`, `host_vars`, or `links` to real directories; `links` wins when
  both are given. `ansible_args` adds flags to `converge`; they are excluded from bundled create and destroy playbooks
  unless `MOLECULE_ANSIBLE_ARGS_STRICT_MODE` is unset and the playbooks are user-provided.
- `role_name_check: 1` disables the Galaxy name check that otherwise fails a role whose computed FQCN is invalid.
- `shared_state: true` lets scenarios reuse the `default` scenario's instances instead of creating their own.
- Nested scenarios (`extensions/molecule/group/name/molecule.yml`) exist in collection mode only, named `group/name`,
  discovered with `MOLECULE_GLOB="extensions/molecule/**/molecule.yml"`.

## Environment

`$VAR` and `${VAR}` in `molecule.yml` are substituted, with `${VAR-default}` and `${VAR:-default}` forms; an unset
variable becomes an empty string; `$$` is a literal dollar. `.env.yml` at the project root seeds variables. The
`MOLECULE_` prefix is reserved: `MOLECULE_FILE`, `MOLECULE_EPHEMERAL_DIRECTORY`, `MOLECULE_SCENARIO_DIRECTORY`,
`MOLECULE_PROJECT_DIRECTORY`, `MOLECULE_INVENTORY_FILE`, `MOLECULE_INSTANCE_CONFIG`, `MOLECULE_SCENARIO_NAME`,
`MOLECULE_DEBUG`, `MOLECULE_VERBOSITY`. A role that reads them is Molecule-specific and fails under plain
`ansible-playbook`; the documented exception is a `dependencies` entry guarded by `when: lookup('env', 'MOLECULE_FILE')`
to pull a test-only role.
