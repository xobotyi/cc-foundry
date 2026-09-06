# ansible-core 2.19

Released 2025-07-21. Ansible community package 12. The templating engine was rewritten and every variable carries
provenance and trust metadata ("Data Tagging"). This is the largest behavior boundary since collections: playbooks that
ran on 2.18 can fail, warn, or render literally on 2.19 without any YAML change.

## Support window

- GA 2025-07-21; critical fixes only from 2025-11-03; security fixes only from 2026-05-18; end of life November 2026.
- Control node Python 3.11 to 3.13. Target Python 3.8 to 3.13. Jinja2 3.1.0 or later on the controller.
- Patch releases: 2.19.1 on 2025-08-25, monthly through 2.19.12 on 2026-08-10.

## Templating

- **Trust is inverted.** Only strings loaded from a trusted source (playbooks, roles, vars files, most built-in
  inventory plugins) are rendered as templates. A string that merely contains `{{ }}` is returned unchanged, silently.
  `_ANSIBLE_TEMPLAR_UNTRUSTED_TEMPLATE_BEHAVIOR` (`ignore` default, `warning`, `error`) surfaces the case; it is
  experimental. Plugins that build template text must call `trust_as_template`.
- **Multi-pass templating is gone.** A template whose output contains another template is not rendered again. Inside an
  expression context (`when`, `failed_when`, `changed_when`, `until`, `assert.that`) delimiters are a syntax error:
  `Template delimiters are not supported in expressions`. A conditional that is one whole template resolving to a
  trusted string expression works, and a template inside a Jinja string constant warns.
- **Conditionals must produce a boolean.** A non-boolean result is an error:
  `Conditional result was 'localhost' of type 'str', which evaluates to True. Conditionals must have a boolean result.`
  A non-string conditional input (a YAML mapping created by an unquoted `key: value` inside the expression) errors with
  `Conditional expressions must be strings.` `ALLOW_BROKEN_CONDITIONALS=true` downgrades the error to a deprecation
  warning; under it a literal `None` or empty string evaluates true.
- **Native Jinja mode is the only mode.** `DEFAULT_JINJA2_NATIVE` has no effect. The final "evaluate the result as a
  Python literal" pass is gone, so a filter that stringifies its input (`replace` on a list) leaves a string where 2.18
  turned it back into a list.
- **`None` stays `None`.** A template evaluating to `None` is no longer converted to `""`. From 2.19.1 a module option
  of type `str` accepts `None` and treats it as `""`; a filter or test receiving `None` does not.
- **`range()` is never materialized.** It cannot be stored in a variable or returned from a template:
  `Type 'range' is unsupported for variable storage.` Pipe it through `list`, or consume it inline with a filter.
- **Templating is lazy.** A nested value is templated on access. A container with an undefined descendant is itself
  `defined`, and `default()` on the container does not apply. `complex_var.nested is undefined` holds when accessed
  directly.
- **`omit` no longer leaks from loop items.** A loop item value resolving to `omit` is dropped from the item, so
  `item.msg` is undefined instead of carrying the placeholder. Use `default(omit)` at the module argument.
- **Undefined is no longer swallowed by plugins.** Passing an undefined argument to a filter, test, or lookup that does
  not declare undefined support yields an undefined result. `failed_when: result.exists is false` on a `stat` result
  errors instead of silently never matching.
- **`set_fact` no longer converts `"yes"`, `"no"`, `"true"`, `"false"` strings to booleans.** Use YAML booleans or the
  `bool` filter.
- **`bool` filter narrowed.** Accepts `True`, `1`, and case-insensitive `yes`, `on`, `true`, `1` as true; `False`, `0`,
  `no`, `off`, `false`, `0` as false. Anything else, including `None`, returns `False` with a deprecation warning that
  becomes an error in 2.23.
- **`set` and `tuple` become `list`** when leaving the final templating pass.
- **`_`-prefixed attributes and mutating methods are blocked** in templates; a matching mapping key is returned instead
  of an error. `list.append` and `dict.update` are allowed again (standard sandbox instead of immutable).
- **Bitwise operators** `__and__`, `__or__`, `__xor__`, `__lshift__`, `__rshift__` are allowed.
- **Jinja builtins are addressable by FQCN**: `ansible.builtin.default`, `ansible.builtin.defined`.
- **`to_json`, `to_nice_json`, `from_json` accept `profile`**, default `tagless`.
- **`ansible_managed` is an ordinary variable.** `DEFAULT_MANAGED_STR` is deprecated and no longer masks it.
- **Serializing a variable that still contains `omit` fails** (`to_json`, `to_yaml`, `ansible-inventory`).
- **`#jinja2:` overrides** with an invalid name or type are errors.
- **`!unsafe` no longer coerces a non-string scalar to a string.**
- **`from_yaml_all`** returns `[]` for `None` and `""`. **`regex_search`** returns `None`, not `""`, on no match.
- **`vars` lookup `default`** applies only when the variable is undefined, not when it templates to an undefined value.
- **`ternary`** evaluates its branches lazily from 2.19.2.

## Errors, warnings, and results

- Errors and warnings carry origin: file, line, column, or the non-file source. Error text is not a stable interface.
- `DISPLAY_TRACEBACK` (`ANSIBLE_DISPLAY_TRACEBACK`) takes `always`, `never`, `error`, `warning`, `deprecated`, comma
  combinable. `-vvv` no longer implies tracebacks.
- Every warning and deprecation raised during a task is on the result under `warnings` and `deprecations`.
- Unhandled exceptions in Python modules return as structured results instead of `MODULE FAILURE`.
- A module returning a non-UTF-8 string is an error; `MODULE_STRICT_UTF8_RESPONSE` disables the check.
- A module result with a non-string dict key fails serialization:
  `Key of type '<NON-STRING>' is not JSON serializable by the 'module_legacy_m2c' profile.`
- Plugins and modules can tag a return value as deprecated (`deprecate_value`); reading it warns at the access site.
  Reading `play_hosts` warns and points at `ansible_play_batch`.
- Ansible warns when a reserved keyword is set through `set_fact` or `include_vars`.
- `failed_when` suppressing an error renames the result's `exception` key to `failed_when_suppressed_exception`, from
  2.19.1.
- An unhandled exception in an action plugin no longer terminates a loop and loses the completed iteration results.
- A looped task with an unignored unreachable item reports unreachable for the task as a whole.
- Forked workers have no stdio. Controller-side plugin code that prints must use `Display`.

## Playbook

- **Privilege escalation timeout is unreachable, not failed.** Replace `ignore_errors` with `ignore_unreachable` on
  tasks where a `become` timeout is tolerated.
- **`vars_files` with an undefined variable in a path warns and skips that entry**:
  `skipping vars_file item due to an undefined variable`. `inventory_dir` is host-scoped and is never available at play
  level.
- **`first_found`** discards undefined list elements with a warning instead of discarding the whole list silently.
  Splitting `files` and `paths` on `,;:` is deprecated; pass a list.
- **`async_status`** returns `started` and `finished` as booleans; conditionals must use the `started` and `finished`
  tests rather than the integer values.
- **`assert.quiet`** must be a recognized boolean; unrecognized values used to mean `False`.
- **A handler whose templated name errors or resolves to `omit` is skipped**, like one with an undefined name.
- **Module defaults are templated only when a task uses them.**
- **A templated raw task argument and a templated `args` keyword are merged.** Previously the raw argument silently won.
- **`INVENTORY_IGNORE_EXTS` no longer contains `ini`**, so `inventory.ini` files in an inventory directory load.
- **`collection loader` parses `meta/runtime.yml` scalars as strings**, so an unquoted version or date no longer changes
  type.
- **Python keywords are valid variable names** except `true`, `false`, `none`, which are rejected at definition.
- **`--flush-cache`** exists on `ansible`, `ansible-console`, and `ansible-pull`.
- **`ansible_failed_task`** is exposed in a rescue when the failing task was a handler run by `flush_handlers`, from
  2.19.2. **Play tags** no longer prevent notified handlers from running, from 2.19.4.

## Connection and become

- **SSH password prompts use `SSH_ASKPASS` by default.** `sshpass` is optional. `password_mechanism` on the `ssh` plugin
  (`ssh_askpass`, `sshpass`, `disable`) selects; `ansible_ssh_password_mechanism: sshpass` restores the binary.
- **`ansible`, `ansible-playbook`, and `ansible-console` can spawn or reuse an ssh-agent.** `ansible_ssh_private_key`
  and `ansible_ssh_private_key_passphrase` load a key from a variable into the agent; `SSH_AGENT_EXECUTABLE` overrides
  the agent binary.
- **`ansible_ssh_verbosity`** decouples SSH client verbosity from Ansible verbosity, which was previously passed through
  and produced excessive output.
- **The `ssh` plugin forces pipelining off when a tty is requested.** `su` works with pipelining.
- **Local connection `become`** gained `become_success_timeout` (10 s) and `become_strip_preamble`, and a set of hang
  fixes for prompts that repeat or arrive interleaved.
- Windows Server 2025 is a supported target. PowerShell 5.1 is enforced at run time as the minimum.

## Removed

- The plural collection path setting (`COLLECTIONS_PATHS`, `collections_paths`, `ANSIBLE_COLLECTIONS_PATHS`). Only the
  singular `collections_path` form remains.
- `STRING_CONVERSION_ACTION`.
- The `toml` library for TOML inventory. Python 3.11+ parses natively; `tomli-w` is needed to dump.
- `ansible.vars.fact_cache.FactCache`, `ansible.utils.native_jinja`, `pycompat24`, `compat.importlib`,
  `compat.selector`.
- `AnsibleLoader` and `AnsibleDumper` are factory functions and cannot be subclassed.

## Deprecated

Settings that no longer have any effect: `DEFAULT_JINJA2_NATIVE`, `DEFAULT_NULL_REPRESENTATION`,
`DEFAULT_UNDEFINED_VAR_BEHAVIOR` (an undefined variable is always an error), `STRING_TYPE_FILTERS`,
`DEFAULT_ALLOW_UNSAFE_LOOKUPS`, `ACTION_WARNINGS`, `DEFAULT_MANAGED_STR`, `DEFAULT_JINJA2_EXTENSIONS`, the `template`
lookup's `convert_data` and `jinja2_native` options, and `disable_lookups`.

Deprecated with a removal target:

- The `paramiko` connection plugin: removed in 2.21.
- `INTERPRETER_PYTHON=auto_legacy` and `auto_legacy_silent`: removed in 2.21.
- `ansible.module_utils.compat.datetime` shims: removed in 2.21.
- `bool` filter coercion of unrecognized input, `ShellModule.checksum`, `ansible.compat.importlib_resources`,
  `ansible.module_utils.common.collections.count()`: errors or removed in 2.23.
- `--inventory-file`: use `-i` or `--inventory`.
- `play_hosts`: use `ansible_play_batch`.
- The `oneline` and `tree` callbacks and their `-o`, `-t` ad-hoc flags.
- Task `args` without a value; `key=value` free-form together with the `args` keyword; a mapping under the `action`
  keyword.
- Third-party strategy plugins carry no compatibility guarantee and will stop loading in a future release.
- YAML `!!omap`, `!!pairs`, and the undocumented `!vault-encrypted` tag (use `!vault`).
- Loading a text file that is not valid UTF-8 (was silently surrogate-escaped).
- `timedout.frame` on a timed-out task result; use `DISPLAY_TRACEBACK=error`.
- The v1 callback API and `v2_on_any`.

## Traps

- **A `{{ }}` wrapper around a `when` that warned on 2.18 fails here**, because the delimiters make it a multi-pass
  template.
- **`when: some_string_var`** fails on the boolean rule. Write `some_string_var | length > 0` or `is truthy`.
- **`that: inventory_hostname is contains "local" ~ "host"`** concatenates after the test and yields `'Truehost'`.
  Parenthesize.
- **An `assert.that` list element with an unquoted `key: value` inside** parses as a YAML mapping and fails with
  `Conditional expressions must be strings.` Quote the whole expression.
- **A custom inventory or lookup plugin that returns a string with `{{ }}`** stops templating on 2.19 instead of
  executing it. That is the intended fix for a class of remote code execution; tag only values that originate from a
  trusted template source.
- **`{% if x is defined %}text{% endif %}` in a `set_fact` value** yields `None` when the branch is not taken. Add an
  explicit `{% else %}{{ "" }}{% endif %}`.
- **A `stat` result checked as `result.exists` instead of `result.stat.exists`** is caught at last, as an undefined
  error, where 2.18 silently evaluated it as never-true.
- **`to_yaml` and `to_nice_yaml` dump vaulted values as `!vault` ciphertext** on every 2.19 patch. The pre-2.19
  decryption behavior returns in 2.21.0 with a `vault_behavior` argument.
