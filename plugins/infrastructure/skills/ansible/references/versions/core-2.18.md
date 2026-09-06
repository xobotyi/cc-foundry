# ansible-core 2.18

Released 2024-11-04. Ansible community package 11. The last line with the pre-Data-Tagging templating engine: string
values are implicitly template-eligible, conditionals accept truthy results, and multi-pass templating executes. Code
that only runs here carries a migration debt to 2.19.

## Support window

- GA 2024-11-04; critical fixes only from 2025-05-19; security fixes only from 2025-11-03; end of life May 2026.
- Control node Python 3.11 to 3.13. Target Python 3.8 to 3.13.
- Patch releases: monthly through 2.18.13 on 2026-08-10. No further fixes ship on this line.

## Playbook

- **`loop_control.break_when`** exits a loop after any item on a Jinja expression.
- **`meta: end_role`** ends the current role for the host.
- **`delay`** is a float, matching the underlying `time` API.
- **`mount_facts`** module gathers mounts that default fact gathering excludes.
- **`timedout`** test checks a result for a task timeout; a timed-out task carries a `timedout` key with the frame that
  was executing.
- **`vaulted_file`** test checks whether a path is a vault-encrypted file.
- **`user` and `group`** accept `uid_min`, `uid_max`, `gid_min`, `gid_max`, overriding `/etc/login.defs`.
- **`dnf5`** implements `enable_plugin` and `disable_plugin`; **`dnf5`** restores `state: installed` as an alias of
  `present`.
- **`package_facts`** accepts manager aliases (`yum`, `dnf` resolve to `rpm`) and no longer fails silently when the
  selected manager cannot list packages.
- **`ini` lookup** gained `interpolation`. **`yum_repository`** gained `excludepkgs` as an alias of `exclude` and
  supports `countme`.
- **`service_mgr`** detects `dinit`. **Facts** include the systemd version and features, x86_64 microarchitecture flags,
  and `/proc/sysinfo` on s390.
- **`ansible-config validate`** reports misspelled or foreign settings in `ansible.cfg` and the environment.
- **`python3.13`** is in the default `INTERPRETER_PYTHON_FALLBACK` list.
- **`apt`** reports `changed` when packages are removed.
- **`ansible-galaxy collection publish`** has configurable import-status polling.

## Behavior changes

- **Commands sent over SSH to a Windows target are no longer wrapped in `powershell.exe`.** `raw` runs under the shell
  configured in the target's sshd, with no guarantee of PowerShell or UTF-8 output. Use `ansible.windows.win_shell` or
  `win_powershell` for PowerShell semantics.
- **`vars` must be a single mapping.** A list of mappings under the `vars` keyword is rejected.
- **`DEFAULT_FACT_PATH`, `DEFAULT_GATHER_SUBSET`, `DEFAULT_GATHER_TIMEOUT` are gone.** Set `fact_path`, `gather_subset`,
  `gather_timeout` as `module_defaults` for `ansible.builtin.setup`; that applies to both the `gather_facts` keyword and
  explicit `setup` tasks.
- **`ANSIBLE_CONNECTION_PATH` has no effect.** The correct persistent-connection helper is always chosen.
- **`unarchive`** reports `changed` when size and content differ with other properties unchanged.
- **`get_url`** verifies the checksum against the downloaded temp file rather than `dest`.
- **`uri`** deprecates `yes` and `no` for `follow_redirects`.
- **`user`** requires `force` to overwrite the public half of a generated SSH key, as it already did for the private
  half; it no longer chowns files symlinked from the skeleton.
- **Handler notification through `listen`** no longer grows memory without bound; handlers included via `include_tasks`
  and handlers under `linear` run in lockstep.
- **`end_host` in a `rescue`** returns the correct exit code.

## Removed

- Control node Python 3.10. Target Python 3.7.
- `ssh_args`, `ssh_common_args`, `ssh_extra_args` on the `paramiko_ssh` connection plugin.
- `PlayContext.verbosity`, the `loader` argument of `listify_lookup_plugin_terms`,
  `VariableManager._get_delegated_vars`, `ROLE_CACHE` on `Play`.

## Deprecated

- `yum_repository` `async`, and the dnf-inert options `deltarpm_metadata_percentage`, `gpgcakey`, `http_caching`,
  `keepalive`, `metadata_expire_filter`, `mirrorlist_expire`, `protect`, `ssl_check_cert_permissions`, `ui_repoid_vars`:
  removed in 2.22.
- `AnsibleModule.safe_eval` and `ansible.module_utils.common.safe_eval`: removed in 2.21.
- `ANSIBLE_CONNECTION_PATH`: removed in a later release.

## Security

- CVE-2024-8775: `include_vars` on a vault-encrypted file, and action-sourced `_ansible_no_log`, mask results correctly.
- CVE-2024-9902: the `user` module no longer runs `ssh-keygen`, `chown`, or `chmod` on an existing public key file,
  closing a symlink traversal.

## Traps

- **Content written for this line relies on behavior 2.19 removes**: truthy conditionals, `{{ }}` inside `when`,
  templates rendered from module results or facts, `omit` carried inside loop items, and `set_fact` turning `"yes"`
  strings into booleans. Read [core-2.19.md](core-2.19.md) before raising the floor.
- **This line reaches end of life in May 2026.** A project pinned here receives no fixes, including security fixes.
