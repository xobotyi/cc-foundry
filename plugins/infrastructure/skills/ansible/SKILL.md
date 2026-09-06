---
name: ansible
description: >-
  Write, review, and run Ansible: the ansible-core line a project pins, what the 2.19 templating engine refuses, which
  task results are claims rather than measurements, where a variable's value comes from, and what ansible-lint and
  Molecule prove.
when_to_use: >-
  Invoke whenever Ansible is touched at all — writing or reviewing a playbook, role, collection, inventory,
  `ansible.cfg`, `requirements.yml`, or Molecule scenario, running or debugging a play, or raising the ansible-core
  floor. Also invoke on the symptoms: a value printed as literal `{{ }}`, `Conditionals must have a boolean result`,
  `Template delimiters are not supported in expressions`, a task that reports `changed` on every run, a handler that
  never fired, a variable with the wrong value on one host, a delegated task that ran on the wrong machine, a vault
  that decrypts on one machine only, or ansible-lint failing on code that runs. Covers ansible-core, collections,
  ansible-lint, and Molecule; container images belong to the containers skill, infrastructure discipline to devops,
  and the Automation Platform product is out of scope.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Three biases decide most calls:

- **The ansible-core line the project pins decides what may be written**, not the binary on the machine. The 2.19
  templating rewrite is the boundary: content that runs on 2.18 can fail, warn, or render literally on 2.19 and later
  with no YAML change.
- **`ok` and `changed` are claims made by the module, not measurements.** A `command` task claims a change on every run,
  an async launch always claims one, and a `--check` run skips whatever it cannot simulate. Idempotence is proven by a
  second run reporting `changed=0`, and by nothing else.
- **Where a value comes from is not guessable.** Inventory layout, `group_vars` adjacency, `ansible.cfg` discovery, and
  collection versions each change what a play does. Read them before the first edit.

## Core Version

Read the pin before writing: `requires_ansible` in `meta/runtime.yml`, the `ansible-core` line in a requirements or
execution-environment file, and the CI matrix. `ansible --version` reports one machine. The `ansible` community package
pulls one ansible-core line: 11 → 2.18, 12 → 2.19, 13 → 2.20, 14 → 2.21.

Support windows, which decide whether a pin is defensible:

- **2.18** — end of life May 2026. No fixes of any kind. Control Python 3.11 to 3.13, target 3.8 to 3.13.
- **2.19** — security fixes only from 2026-05-18, end of life November 2026. Control 3.11 to 3.13, target 3.8 to 3.13.
- **2.20** — critical fixes only from 2026-05-18, security only from 2026-11-02, end of life May 2027. Control 3.12 to
  3.14, target 3.9 to 3.14.
- **2.21** — GA 2026-05-18, critical only from November 2026, end of life November 2027. Control 3.12 to 3.14, target
  3.9 to 3.14.

Floor per feature — the changes the rules below depend on:

- **2.18** — `loop_control.break_when`; `meta: end_role`; `timedout` and `vaulted_file` tests; `raw` over SSH to Windows
  runs unwrapped, without `powershell.exe`.
- **2.19** — trust-tagged templating, boolean-only conditionals, no multi-pass rendering, lazy evaluation, native types
  only; `ALLOW_BROKEN_CONDITIONALS`; `DISPLAY_TRACEBACK`; `SSH_ASKPASS` replaces `sshpass`; a `become` timeout is
  unreachable; `omit` dropped from loop items; `bool` filter narrowed; plural `collections_paths` removed; `paramiko`
  and `auto_legacy` deprecated.
- **2.20** — control Python 3.12+, target 3.9+; `transport = smart` removed; Galaxy v2 API removed; `vaultid` filter
  parameter removed; `include_vars` rejects a non-list `extensions`; `INJECT_FACTS_AS_VARS` deprecated, default flips in
  2.24.
- **2.21** — register projections and the `_task` object; `ansible-galaxy` refuses a collection whose `requires_ansible`
  excludes the running core; `paramiko` and `auto_legacy` removed; `invocation` dropped from results; failure inference
  from `rc` deprecated, warnings from 2.22; `to_yaml` decrypts vaulted values again.

Read [`${CLAUDE_SKILL_DIR}/references/versions/core-2.NN.md`] — `core-2.18.md` through `core-2.21.md` — when writing
against a feature near the floor, when raising the floor, and before touching content that must run on 2.18 and 2.19
both. Each carries what its line added, changed, removed, and deprecated with the removal target, and the traps.

## Templating

The 2.19 engine holds on every maintained line. Write for it; do not write for 2.18 unless the project pins 2.18.

- **Never put `{{ }}` inside `when`, `failed_when`, `changed_when`, `until`, `break_when`, `assert.that`, or a
  `register` projection.** They are expressions already. Delimiters there are the error
  `Template delimiters are not supported in expressions`.
- **A conditional must evaluate to a boolean.** `when: some_string` fails with
  `Conditional result was 'x' of type 'str' ... Conditionals must have a boolean result.` Write
  `some_string | length > 0`, `is truthy`, `is defined`, or `| bool`. A YAML list under `when` is `and`; write `or` in
  one string.
- **A string that arrives with `{{ }}` in it is data.** Module results, facts, command output, and file contents are
  never rendered, and no setting restores rendering. A custom plugin that returns template text must tag it with
  `trust_as_template`.
- **Types survive.** `None` is not `""`; a list through a string filter becomes a string; `range()` needs `| list`
  before it is stored; `"127" == 127` is false. Convert with `int`, `string`, `bool`, `list`.
- **`default()` binds to the immediate value only.** A container with an undefined leaf is defined; put `default` at the
  leaf. `default(x, true)` also replaces `false`, `0`, `""`, and empty containers.
- **`default(omit)` belongs on the module argument.** A loop item value that resolves to `omit` is dropped from the
  item, so `item.key` is undefined, not a placeholder.
- **`set_fact` evaluates on assignment; a `vars` entry is re-evaluated on every access.** Use `set_fact` to freeze a
  value, `vars` to derive one.
- **`{% if %}text{% endif %}` in a value yields `None` when the branch is not taken.** Add an explicit
  `{% else %}{{ "" }}{% endif %}`.
- **`set_fact` does not turn `"yes"` or `"true"` strings into booleans.** Use YAML booleans.

Read [`${CLAUDE_SKILL_DIR}/references/templating.md`] when writing a filter chain, a boolean conversion, a `combine`
merge, a serialization, or when an error names a type — it carries the expression contexts, the type rules, undefined
handling, `omit`, dictionary and list filters, and the trust model.

## YAML

- **Quote a value that starts with `{{`.** Unquoted, `{` opens a flow mapping and the error is a YAML syntax error.
- **Quote file modes**: `mode: "0644"`. Unquoted `0644` is 420. Symbolic `u=rw,g=r,o=r` also works.
- **Write `true` and `false`.** `yes`, `no`, `on`, `off` are booleans to the parser; `version: yes` is not a string.
- **Quote an expression that contains `: `** inside `assert.that` or `when`; otherwise it parses as a mapping and fails
  with `Conditional expressions must be strings.`
- **`!unsafe` marks a value as data** so it is never rendered even from a trusted file. `{% raw %}` keeps delimiters
  literal inside a template that is otherwise rendered.
- **INI `[group:vars]` values are strings**, while `key=value` on a host line is a Python literal. Apply `| bool` or
  `| int` when consuming, or use YAML inventory.

## Idempotence

- **`command` and `shell` report `changed` on every run.** Give them `creates`, `removes`, or `changed_when`;
  `changed_when: false` on a read. Prefer the module that owns the state (`apt`, `service`, `file`, `lineinfile`).
- **`command` runs no shell.** No `|`, `>`, `;`, `&`, globbing; `$VAR` is expanded by Python and left alone when unset.
  Use `argv` for arguments with spaces and `quote` for interpolated values.
- **A `shell` pipeline hides the first failure.** Start it with `set -o pipefail` and set `executable: /bin/bash`.
- **An async task always reports `changed`.** Put `changed_when`, `creates`, and friends on the `async_status` task.
- **`lineinfile` `regexp` must match the line after the change too**, or every run rewrites it. `blockinfile` needs a
  distinct `marker` per logical block, or one block replaces another.
- **A loop is `changed` if any item changed**, and every notified handler fires once for the whole task. Per-item truth
  is in `results[]`.
- **`state: latest` and an unpinned `git` checkout give a different result on a different day.** Pin the version.
- **Check mode skips a module that cannot simulate, and `command` without `creates` or `removes` is one of them.**
  `check_mode: false` forces a task to run under `--check`; `ansible_check_mode` is the variable to branch on. `--diff`
  reveals file contents; `diff: false` on a secret.

## Failure

- **`ignore_errors` swallows only a `failed` result.** An undefined variable, a syntax error, a missing interpreter, or
  an unreachable host is not covered; `ignore_unreachable` handles the last.
- **A `failed_when` list is `and`.** `failed_when: rc != 0 or 'ERROR' in stdout` in one string fails on either.
- **A `become` timeout is unreachable, not failed**, so `ignore_errors` does not cover it.
- **A `rescue` that succeeds reverts the failure for play control**: the host continues, and neither
  `max_fail_percentage` nor `any_errors_fatal` counts it, while the recap counts it under `rescued`. An invalid task
  definition or an unreachable host never enters `rescue`. `ansible_failed_task` and `ansible_failed_result` are set
  inside it.
- **`max_fail_percentage` is per `serial` batch and must be exceeded, not met**: with `serial: 4`, aborting on two
  failures needs `49`. `any_errors_fatal` finishes the failing task on the current batch, then stops every host.
- **A module that returns `rc: 1` and no `failed` is failed by inference on 2.21 and earlier**, and the inference is
  deprecated from 2.21. Set `failed` or call `fail_json` in every module.
- **`_task.result`** replaces `register` inside `failed_when`, `changed_when`, and `until` on 2.21; in a loop it needs
  `default({})` on the first iteration.

## Handlers

- **A handler does not run on a host where a later task failed** unless `force_handlers` is set. The configuration is
  changed and the service is not restarted. `meta: flush_handlers` runs the handlers notified so far, and works inside
  `rescue`.
- **Handlers run in definition order, once per play section** (`pre_tasks`, `roles` and `tasks`, `post_tasks`), no
  matter how many tasks notified them or in what order.
- **Two handlers with one name shadow: the last loaded wins**, in the order `roles:`, `handlers:`, `import_role`,
  `include_role`. Notify a role's handler as `role_name : handler_name`; use `listen` topics to decouple.
- **Never template a handler's name.** Names are templated early; a name with an undefined variable, a syntax error, or
  a value resolving to `omit` is skipped on 2.19 and later and fails the play on 2.18, and in no case runs. Put the
  variable in the handler's arguments. `listen` topics cannot be templated at all.
- **A handler inside an `include_tasks` file cannot be notified**; a handler that is an `import_tasks` is rewritten into
  its tasks. A handler cannot `include_role` or `import_role`, and handlers ignore tags.

## Delegation and Execution

- **Under `delegate_to`, everything except `inventory_hostname` is the delegate's**: `ansible_host`, the interpreter,
  connection, become, and shell options, even `inventory_hostname_short`. Reach the original host with
  `hostvars[inventory_hostname]`. Facts gathered by a delegated task land on the original host unless
  `delegate_facts: true`.
- **Delegation does not serialize.** Five forks writing one file on one delegate overwrite each other. Use
  `throttle: 1`, or `run_once: true` with a loop over `ansible_play_hosts_all`.
- **`run_once` is once per `serial` batch**, evaluated with the first host's variables. Truly once is
  `when: inventory_hostname == ansible_play_hosts_all[0]`.
- **`throttle` can only lower parallelism below `forks` (default 5) and the batch size.** `serial` takes a number, a
  percentage, or a list of either; the last batch holds the remainder and a batch is never smaller than one.
- **`order: inventory` is the compiled selection order, not the file order.** Use `sorted` when the order matters.
- **`connection: local` runs modules under `/usr/bin/python`** unless `ansible_python_interpreter` is
  `"{{ ansible_playbook_python }}"`. `delegate_to: localhost` has no such trap.
- **`add_host` and `group_by` change inventory for later plays**, subject to `--limit`; the current play's host list is
  already fixed.
- **Third-party strategy plugins are deprecated.** `linear`, `free`, `host_pinned`, and `debug` are the set.

## Variables

Lowest to highest, the rungs that decide most disputes: role `defaults/`, inventory group vars, inventory host vars,
facts and cached `set_fact`, play `vars`, role `vars/`, block and task `vars`, `include_vars`, registered results and
`set_fact`, role parameters, extra vars.

- **`defaults/` is for what a caller overrides; `vars/` is for what the role forces.** A value in `vars/` beats
  inventory, facts, and play vars; block and task `vars`, `include_vars`, `set_fact`, role parameters, and `-e` beat it.
- **`roles:` and `import_role` publish a role's variables to the whole play at parse time**, visible to earlier tasks;
  `include_role` publishes nothing unless `public: true`, and then only to later tasks. `include_role` also runs the
  role every time it is called, where `roles:` entries with equal parameters run once per play.
- **A registered variable exists on every host, including where the task failed or was skipped.** Test `is skipped` or
  `is failed`, not `is defined`.
- **`set_fact` with `cacheable: true` makes two copies**, a host variable at `set_fact` precedence for this run and a
  fact seven rungs lower that the cache persists. `meta: clear_facts` removes only the fact.
- **Groups at one level merge alphabetically**; `ansible_group_priority` reorders them and is honored only in an
  inventory source, never in `group_vars/`.
- **`group_vars/` next to the playbook beats `group_vars/` next to the inventory**, and `ansible-inventory` without
  `--playbook-dir` never reads the playbook-adjacent copy, so it can print a value a play does not use.
- **`-e key=value` is a string; `-e '{"key": 1}'` and `-e @file.yml` keep types.**
- **Ansible loads the first `ansible.cfg` found** — `ANSIBLE_CONFIG`, `./ansible.cfg`, `~/.ansible.cfg`,
  `/etc/ansible/ansible.cfg` — and refuses one in a world-writable current directory.
- **Write `ansible_facts['os_family']`, not `ansible_os_family`.** The injected form warns on 2.20 and later and is off
  by default from 2.24.
- **Facts are a snapshot from the gathering task**, once per play by default; a cached fact is from a previous run
  within `CACHE_PLUGIN_TIMEOUT` (86400 s). `gather_subset` and `--limit` decide which hosts have which facts.

Read [`${CLAUDE_SKILL_DIR}/references/precedence.md`] when two definitions of one name disagree, when a value differs
between hosts or commands, or when designing a `group_vars` layout — it carries the full 22-rung ladder, the inventory
merge order, directory adjacency, INI and extra-vars typing, scope, and role publication.

## Roles and Collections

- **Always the FQCN**: `ansible.builtin.copy`. `ansible.legacy.copy` only where a local `library/` override must win.
  Short names resolve at run time and fail `ansible-lint --profile production`.
- **The `collections:` keyword is not inherited by roles**, and never applies to lookups, filters, or tests. A role sets
  its own list in `meta/main.yml`, and a role inside a collection searches its own collection first.
- **`meta/argument_specs.yml` validates coercively and passes the original value through**: `1` satisfies `type: str`
  and the role receives the integer. The validation task carries the `always` tag and runs dependencies' specs first.
- **A role listed twice with equal parameters runs once per play.** Different role parameters (not `vars:`), tags, or
  `when` make it distinct; `allow_duplicates: true` in the role's own `meta/main.yml` forces it. Deduplication runs
  before variable evaluation.
- **`dependencies` run before the role and are deduplicated the same way**; `vars:` inside a dependency entry is play
  scoped and reaches roles that ran earlier. Galaxy import requires dependencies in `namespace.role` form, never a URL.
- **`requirements.yml` takes `roles:` and `collections:` sections in one file.** Roles take a single `version` with no
  ranges; collections take `>=`, `==`, `!=` (treated as unpinned), and `*`. `ansible-galaxy install -r` installs both
  sections; `role install` and `collection install` each install their own.
- **A collection's `requires_ansible` is enforced at install from 2.21**: a mismatch is skipped, not installed and
  failed later. `COLLECTIONS_ON_ANSIBLE_VERSION_MISMATCH` governs both the install and the load-time warning.
- **`plugin_routing` in `meta/runtime.yml` redirects, deprecates, and tombstones names.** Read it before declaring a
  plugin missing.
- **A Galaxy server must speak the v3 API from 2.20.** `collections_path` is singular from 2.19.
- **Roles inside collections cannot embed plugins in `library/` or `filter_plugins/`**; standalone roles can, and the
  plugins stay visible to roles that run after them.

## Connection and Become

- **Pipelining is off by default and is the largest cheap speedup.** It needs `requiretty` absent from sudoers and does
  not apply to file-transfer modules (`copy`, `template`, `fetch`).
- **`ssh_args` replaces the default `-C -o ControlMaster=auto -o ControlPersist=60s`.** Add options through
  `ssh_common_args` or `ssh_extra_args`; a custom `-o ControlPath` disables the managed control path.
- **SSH passwords use `SSH_ASKPASS` from 2.19**; `sshpass` is opt-in through `ansible_ssh_password_mechanism`. A key
  with a passphrase needs an agent; Ansible never proxies the passphrase prompt.
- **`become_user` does not imply `become`.** `-K` supplies one become password for every host; per-host passwords go in
  vaulted `ansible_become_password`.
- **Privilege escalation cannot be limited to specific commands.** Modules run from a temporary file with a changing
  name, so a sudoers command allowlist breaks every module.
- **An unprivileged connection user becoming another unprivileged user needs POSIX ACLs (`setfacl`) on the target, a
  shared group named in `ansible_common_remote_group`, or pipelining.** Without one of them Ansible errors rather than
  fall back to `world_readable_temp`.
- **Interpreter discovery is `auto`.** Pinning `ansible_python_interpreter` silences the warning and freezes the path.
- **`ansible_host` must never depend on `inventory_hostname`**; use `inventory_hostname_short` so delegation works.
- **`become` does not open a systemd session**: `XDG_RUNTIME_DIR` is empty and `systemctl --user` fails;
  `become_method: machinectl` opens one.
- **`paramiko` is gone from core in 2.21.** `ansible_connection: paramiko` fails to load; network platforms use
  `ansible.netcommon` connections.

## Vault

- **Vault protects data at rest only.** Decrypted values reach modules, diffs, callbacks, and errors. Put `no_log: true`
  on the task that handles the secret; it does not protect a later `debug` of the same variable.
- **`ansible-vault encrypt_string` produces an inline `!vault` scalar; `encrypt` encrypts a whole file.** The `vault_`
  prefix convention (`db_password: "{{ vault_db_password }}"`) keeps variable names greppable at the cost of two
  variables in precedence.
- **A vault-id label is a hint.** Every supplied password is tried, matching label first; `DEFAULT_VAULT_ID_MATCH`
  restricts each password to its label. Two files can carry the same label and different passwords; `rekey` fixes it.
- **A password source with the executable bit set is run, not read.** A client script must accept `--vault-id`, print
  the password, and be named `*-client` or `*-client.EXT`. A non-executable file is read as the password.
- **`ANSIBLE_VAULT_PASSWORD_FILE` or `vault_password_file` in `ansible.cfg`** is a silent default source that changes
  which secret a run uses from machine to machine; ansible-lint honors both.
- **An encrypted file passed as `src` to `copy`, `template`, `unarchive`, `script`, or `assemble` lands decrypted on the
  target.**
- **`to_yaml` on a vaulted value writes `!vault` ciphertext on 2.19 and 2.20**, and the decrypted value on 2.21
  (`vault_behavior` selects). `vault_encrypted` tests a variable, `vaulted_file` a path.

## Verification

- **ansible-lint from the project root**, under the ansible-core line the project pins. With no `--profile` every rule
  applies; `--profile production` is the bar for content that ships. The rules that fire most on generated code:
  `no-changed-when`, `risky-shell-pipe`, `fqcn`, `name[casing]`, `name[template]`, `var-naming[no-role-prefix]`,
  `yaml[octal-values]`, `yaml[truthy]`, `no-free-form`, `partial-become`. `# noqa: rule-id` at the end of the line
  suppresses one rule; `skip_list` hides it from output.
- **`--syntax-check` parses without connecting; `--check --diff` on one host simulates what modules can simulate** and
  skips the rest.
- **Run the play twice; the second recap is the idempotence result.** Molecule's `idempotence` action is exactly that
  comparison and nothing deeper: `changed_when: false` passes it, a bare `command` fails it. A clean second recap proves
  the play converged, not that the target runs the result: a run against a real target is a change, and the effect check
  in the **devops** skill's `references/effect.md` is what closes it.
- **`molecule test` runs a configurable `test_sequence`**; a scenario that dropped `idempotence` or `verify` passes all
  the same. The built-in driver provisions nothing; ansible-native scenarios create instances in `create.yml` and write
  their addresses into an inventory source. Drivers come from `molecule-plugins`.
- **`ansible-inventory --list -i <source> --playbook-dir .`** shows the merged variables a play will see;
  `ansible-config dump --only-changed` shows which `ansible.cfg` won; `ansible-doc -t <type> <fqcn>` is the argument
  spec.
- **ansible-lint 26.8.0 and Molecule 26.8.0 support the two newest ansible-core lines at their release.** Testing 2.18
  content needs a pinned older toolchain in its own environment.

Read [`${CLAUDE_SKILL_DIR}/references/lint.md`] when a rule fires that the list above does not name, when configuring
`.ansible-lint`, or when a lint result disagrees with a run — it carries the profiles, every rule that fires on
generated code, suppression, and the coupling to the ansible-core line. Read
[`${CLAUDE_SKILL_DIR}/references/molecule.md`] when writing or repairing a scenario — it carries the ansible-native and
legacy layouts, the sequences, the idempotence criterion, dependency paths, and the `MOLECULE_` variables.

## Boundary

The automation controller and its job templates and surveys (AWX and the Automation Platform), automation mesh,
Automation Hub certification, the platform's Event-Driven Ansible service, and Lightspeed are out of scope; a play never
configures them. `ansible-rulebook`, `ansible-builder`, `ansible-navigator`, and the Ansible development tools MCP
server are open source and usable without the platform.

## Application

When **writing** Ansible, apply these rules silently — do not narrate a rule while following it. Where the existing
content contradicts one, follow the content and flag the divergence once. State the ansible-core line an edit assumes
when it is not 2.19-compatible.

When **reviewing** Ansible, cite the violation and give the corrected line inline. Do not lecture.

## Integration

The **devops** skill governs the change: what it must carry before apply, how it is applied, and the evidence that
closes it. This skill governs how Ansible behaves and how Ansible is written, and wins on any question of what a play,
role, or inventory does. The **coding** skill governs the shape of the work; the **containers** skill owns the images an
execution environment is built from. All are active at once.
