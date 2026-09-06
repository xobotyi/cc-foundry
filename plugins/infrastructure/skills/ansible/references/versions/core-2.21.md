# ansible-core 2.21

Released 2026-05-18. Ansible community package 14. Adds register projections and the `_task` implicit object, makes
`ansible-galaxy` refuse collections that declare an incompatible core, removes `paramiko`, and starts the deprecation of
inferred failure from a non-zero `rc`.

## Support window

- GA 2026-05-18; critical fixes only from November 2026; security fixes only from May 2027; end of life November 2027.
- Control node Python 3.12 to 3.14. Target Python 3.9 to 3.14. PowerShell 5.1 and PowerShell 7.6 LTS on Windows targets;
  `setuptools` 77.0.3 or later to install.
- Patch releases: 2.21.1 on 2026-06-18, 2.21.2 on 2026-07-13, 2.21.3 on 2026-08-10.

## Playbook

- **Register projections.** `register` accepts a mapping of `variable: expression`; expressions are Jinja without
  delimiters, may reference each other in any order, and are evaluated after the task completes. `_task` is reserved.
- **The `_task` implicit object.** `_task.result` is the current task result inside `failed_when`, `changed_when`,
  `until`, `break_when`, and register expressions, without `register`. Under a loop, `_task.result` is the most recent
  item result, `_task.loop_result` the accumulated `results` list, and `_task.polymorphic_result` the classic name-only
  `register` shape. In a conditional evaluated during iteration, `_task.result` and projected variables need `default`,
  because neither exists on the first iteration.
- **`changed_when_result` and `break_when_result`** are always present on a result that used the keyword;
  `changed_when_suppressed_exception` and `break_when_suppressed_exception` appear when the expression failed and masked
  an exception. A failed `break_when` preserves the loop result structure.
- **A looped task's registered result omits `skipped` when it would be `false`.** A `results` key returned by a module
  is always preserved.
- **`include_role` gained `rescuable`**, choosing between a task failure and a syntax error for a missing file. A
  missing `tasks_from`, `vars_from`, `handlers_from`, or `defaults_from` file is an error even when the subdirectory
  does not exist; it used to be ignored.
- **An error inside any task conditional** (`when`, `until`, `failed_when`) is a descriptive,
  `ignore_errors`-recoverable task failure that keeps the task result. Earlier lines could warn, lose the result, or
  crash the controller.
- **`ignore_errors` and `ignore_unreachable`** with a templated value in a loop apply to the whole task if any item
  resolves true; an invalid `ignore_errors` value is `False`.
- **`invocation` is omitted from task results by default.** `INJECT_INVOCATION=true` (settable per host) restores it;
  callbacks mask it anyway. It was already deleted from registered non-loop results and is deleted from looped ones
  here.
- **`to_yaml` and `to_nice_yaml`** decrypt vaulted values again, restoring pre-2.19 behavior, with a `vault_behavior`
  argument to choose. 2.19 and 2.20 dump `!vault`-tagged ciphertext.
- **`slurp`** gained `armor` to skip base64. **`stat` and `file`** return `disk_usage_bytes`. **`deb822_repository`**
  gained `include` and `exclude`. **`user`** returns the account's actual system groups, not the requested ones, and
  warns when `seuser` is set without SELinux.
- **The default callback** can hide the `included:` banner (`display_included_hosts`), set the YAML line width including
  no wrapping, and take `display_skipped_hosts` from a variable. Callback plugins accept configuration from extra vars.
  Debug messages drop `_ansible_`-prefixed keys.
- **`template`** reports the line number of a Jinja syntax error in the template file.
- **Interpreter discovery** on a delegated `async` task is fixed.

## Collections and Galaxy

- **`ansible-galaxy install`, `collection install`, and `collection download` exclude a collection whose
  `requires_ansible` does not match the running core.** Earlier lines installed it and failed at load time.
  `COLLECTIONS_ON_ANSIBLE_VERSION_MISMATCH=ignore` restores the old behavior; the same setting governs the load-time
  warning or error.
- **Action plugins can register variables at several precedence layers** through `register_host_variables`, instead of
  returning `ansible_facts` and relying on fact injection.
- **`ansible-galaxy` retries a download** whose body is shorter than declared instead of failing on the hash mismatch,
  from 2.21.3.

## Connection and execution

- **The `paramiko` connection plugin is removed**, with `ansible.module_utils.compat.paramiko`. `connection: persistent`
  and `connection: smart` no longer try it. Network platforms carry their own `paramiko` in `ansible.netcommon`.
- **PowerShell modules run on POSIX targets under `pwsh`.** Windows-API module utils may not work; `Ansible.Basic.cs`
  does.
- **Forked workers are session-isolated** to avoid TTY contention. `WORKER_SESSION_ISOLATION=false` re-attaches them,
  scoped as narrowly as possible.
- **`_low_level_execute_command` no longer appends `&& sleep 0`**, the workaround for a 2016 kernel bug.
- **`psrp` builds the Kerberos SPN as `host`, not `WSMAN`**, with no deprecation period.
  `ansible_psrp_negotiate_service: WSMAN` restores it. `psrp` gained `no_profile` and `certificate_key_password` (needs
  `pypsrp` 0.9.0 or later).
- **Parallel fact gathering** honors the timeout when deciding to kill a module process, and no longer hangs on a
  corrupt async job file, from 2.21.2.
- **Password hashing** can use the C library `crypt` or `libxcrypt` again.

## Removed

- `ansible.builtin.paramiko` and `ansible.module_utils.compat.paramiko`.
- `INTERPRETER_PYTHON=auto_legacy` and `auto_legacy_silent`. Only `auto` and `auto_silent` remain.
- `ansible.module_utils.compat.datetime`; `safe_eval`; the `required` option of `get_bin_path`; importing `datetime`,
  `signal`, `types`, `chain`, `repeat`, `map`, `shlex_quote` from `ansible.module_utils.basic`.
- The `gpg_whitelist` alias on `git`; `handle_stats_and_callbacks` on `StrategyBase._load_included_file`.

## Deprecated

- **Failure inference from `rc`.** A module or action result with a non-zero `rc` and no `failed` key is treated as
  failed by inference on this line. The inference is deprecated; runtime warnings begin in 2.22, and once it is removed
  `rc` receives no special treatment. Modules and actions must set `failed`, call `fail_json`, or raise.
- `apt_key` and `apt_repository`, in favor of `deb822_repository`.
- `ansible.module_utils.six`, `get_all_subclasses`, `get_platform`, `load_platform_subclass` from `module_utils.basic`:
  removed in 2.24.
- The `aliases` attribute on `PluginLoader`; declare aliases in `meta/runtime.yml` `redirect`.
- Connection plugin attributes `has_native_async` and `always_pipeline_modules`; override
  `is_pipelining_enabled(self, wrap_async=False)` instead. No runtime warning yet.

## Security

- CVE-2026-11332, fixed in 2.21.1 and back-ported to 2.19.11 and 2.20.7: `ansible-galaxy install` passes role
  requirements to `git clone` as positional arguments, closing git configuration injection by a malicious role author.
  ansible-lint 26.8.0 refuses to install with core 2.17.x for the same CVE.
- `psrp` and `winrm` no longer log raw stdout and stderr at verbosity 5 when the task has `no_log: true`, from 2.21.1.
- URL-bearing modules and lookups (`uri`, `get_url`, `apt_key`, `rpm_key`, `url`) mask embedded credentials in every
  display and return, from 2.21.4.

## Traps

- **A `requirements.yml` that resolved on 2.20 can skip collections here** because their `requires_ansible` excludes
  2.21, with the collection then absent at run time. Read the install output, not just its exit code.
- **A custom module that reports `rc: 1` and no `failed`** fails the task on this line and will not once the inference
  is removed. Fix the module before 2.22 starts warning.
- **`ansible_connection: paramiko`** in inventory fails to load the plugin.
- **`register: name` and a `register:` mapping are not interchangeable in loops.** The mapping form gives the last item
  unless `_task.polymorphic_result` is used.
