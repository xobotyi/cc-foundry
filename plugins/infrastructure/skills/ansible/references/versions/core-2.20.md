# ansible-core 2.20

Released 2025-11-04. Ansible community package 13. A consolidation release on top of the 2.19 engine: Python 3.14
support, a set of long-deprecated removals, and stricter argument validation where 2.19 had still coerced.

## Support window

- GA 2025-11-04; critical fixes only from 2026-05-18; security fixes only from 2026-11-02; end of life May 2027.
- Control node Python 3.12 to 3.14. Target Python 3.9 to 3.14.
- Patch releases: 2.20.1 on 2025-12-09, monthly through 2.20.8 on 2026-08-10.

## Playbook

- **Play argument spec validation (tech preview).** The play keyword `validate_argspec` set to `true` or a spec name
  loads `<playbook_name>.meta.yml`; with `true` the play `name` is required and used as the spec name. The file needs at
  least `{"argument_specs": {"<name>": {"options": {}}}}`. Under play tags the `always` tag is only added when the play
  has no tags, from 2.20.5.
- **`lineinfile` and `blockinfile`** accept `encoding` for non-UTF-8 files.
- **`deb822_repository`** installs `python3-debian` when `install_python_debian` is set.
- **`stat`** can return the SELinux context behind a new option, off by default.
- **`setup`** adds `lvs` under each `ansible_facts['vgs']` entry, complete per volume group; the top-level `lvs` fact
  deduplicates names across groups and may be incomplete.
- **The default callback** can configure indentation for JSON and YAML output.
- **`fetch_file`** accepts `ca_path` and `cookies`.
- **`regex`** validates `match_type` as `match`, `fullmatch`, or `search`.
- **Reserved tags** used as playbook tags, and tags that collide with reserved keywords, warn.
- **`copy`** reports `changed` when a single-file local directory is copied, from 2.20.2. **`dnf`** installs and enables
  a module when missing and upgrades it when present, from 2.20.2. **`--start-at-task`** starts at the requested task
  rather than the next block or play, from 2.20.5.

## Behavior changes

- **`include_vars` errors on a non-list `extensions`** and on a non-list `ignore_files`. Both were silently accepted.
- **`replace` reads and writes text as Unicode** and matches regexes on characters, not bytes.
- **PowerShell module utilities no longer strip quotes from paths** in copy and fetch operations. Only over-quoted
  values are affected.
- **Argument spec validation treats `None` as `""` for `str` options**, matching the 2.19.1 change.
- **`DataLoader.get_basedir` returns an absolute path.**
- **`failed_when` suppression** renames the result's `exception` to `failed_when_suppressed_exception` (first shipped in
  2.19.1; documented in this porting guide).

## Removed

- Control node Python 3.11. Target Python 3.8.
- `DEFAULT_TRANSPORT=smart`. The `smart` value that picked `ssh` or `paramiko` from the platform is gone; the default is
  `ssh`.
- The `vaultid` parameter of the `vault` and `unvault` filters. `--vault-id` on the CLI is unaffected.
- The Galaxy v2 server API in `ansible-galaxy`. A collection server must speak v3.
- `install_repoquery` on `dnf` and `dnf5`. `keepcache` on `yum_repository`.
- `PARAMIKO_HOST_KEY_AUTO_ADD` and `PARAMIKO_LOOK_FOR_KEYS`. The plugin itself survives until 2.21.
- The `get_host_vars` and `get_group_vars` fallback for vars plugins that do not inherit `BaseVarsPlugin`.
- `py3compat.environ`, the `passlib_or_crypt` API of `encrypt`, `resolvelib` below 0.8.
- Role entrypoint attributes in `ansible-doc` output.

## Deprecated

- **`INJECT_FACTS_AS_VARS` flips to `False` in 2.24.** Facts stay under `ansible_facts` with the `ansible_` prefix
  removed; the bare `ansible_os_family` form warns on access. Write `ansible_facts['os_family']`, or pin
  `inject_facts_as_vars = True`. `ansible_local` does not trigger the warning, from 2.20.2.
- **The `vars` internal variable cache is removed in 2.24.** It exposes variables in inconsistent states; use the `vars`
  and `varnames` lookups.
- `ignore_files` as a string on `include_vars`.
- The shell plugin `wrap_for_exec` function; `hash_params` in `roles/__init__`.

## Known issues

- An exception raised inside a Jinja `set` or `with` block that the template never accesses is ignored, the same way an
  unaccessed undefined value is.
- A container created in a Jinja `set` or `with` block is copied when passed to a method; mutations the method does not
  return are lost.

## Traps

- **A private Galaxy or Automation Hub that only serves the v2 API stops resolving collections here**, and nothing in
  2.21 restores it.
- **`transport = smart` in `ansible.cfg`** is a validation error on this line, not a fallback to `ssh`.
- **`extensions: yml` on `include_vars`** was a working coercion on 2.19 and is an error here.
