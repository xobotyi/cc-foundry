# ansible-lint

Version 26.8.0, released 2026-08-12, requires Python 3.10 or later and supports only the two newest ansible-core lines
at its release. Installing it installs `ansible-core` when none is present; the ansible-core in the linter's environment
is the one that parses, so lint under the line the project pins, not under whatever the tool pulled in. 26.8.0 refuses
ansible-core 2.17.x for CVE-2026-11332.

## Running

- **Run from the project root.** From a subdirectory the linter may report zero violations on a tree that has them
  (documented from 25.7.0). Configuration is found in a parent directory up to the git root, but execution expects the
  root.
- **Configuration file names**: `.ansible-lint`, `.ansible-lint.yml`, `.ansible-lint.yaml`, `.config/ansible-lint.yml`,
  `.config/ansible-lint.yaml`. `-c` overrides.
- **Scalar CLI options replace config values; list options extend them.** `-x foo` adds to `skip_list`; it does not
  reset it.
- **`--offline`** skips installing `requirements.yml` and refreshing schemas. Otherwise the linter installs
  `requirements.yml`, `roles/requirements.yml`, `collections/requirements.yml`, `tests/requirements.yml`, and
  `galaxy.yml` dependencies into `{project_dir}/.cache`, which belongs in `.gitignore`.
- **`ANSIBLE_LINT_NODEPS`** skips dependency installation and every check that needs modules present; far fewer
  violations are reported.
- **Vault**: honors `ANSIBLE_VAULT_PASSWORD_FILE`, `vault_password_file` in `ansible.cfg`, and
  `ANSIBLE_VAULT_IDENTITY_LIST`. `--ask-vault-pass` is not supported. Because `ansible.cfg` in the working directory can
  point `vault_password_file` at an executable, linting untrusted content runs code from it.
- **Syntax check on roles** creates a temporary playbook that includes the role with no variables, so a role must pass
  `--syntax-check` on its `defaults/` alone.
- **`--fix`** reformats YAML on every run and applies rule transforms; `write_list` in config limits the transforms.
  Before 26.8.0 the `jinja[spacing]` transform could write invalid syntax around `-` whitespace modifiers.
- **Output**: violations on stdout, logs on stderr. `-f pep8` is machine-parsable; `-f sarif` and `-f json` emit SARIF.
  `--sarif-file` writes a file without changing stdout. Under `GITHUB_ACTIONS=true` it prints annotations.
- **Exit code** is non-zero on failures; `-s` (`--strict`) also fails on warnings.

## Profiles

Cumulative, each extending the previous: `min`, `basic`, `moderate`, `safety`, `shared`, `production`. A rule inside the
selected profile applies even when tagged `opt-in` or `experimental`. `--profile` selects; the summary line reports the
last profile the content met.

- **min**: `internal-error`, `load-failure`, `parser-error`, `syntax-check`. Unskippable.
- **basic**: `command-instead-of-module`, `command-instead-of-shell`, `deprecated-bare-vars`, `deprecated-local-action`,
  `deprecated-module`, `inline-env-var`, `key-order`, `literal-compare`, `jinja`, `no-free-form`, `no-jinja-when`,
  `no-tabs`, `partial-become`, `playbook-extension`, `role-name`, `schema`, `name`, `var-naming`, `yaml`.
- **moderate**: `name[template]`, `name[casing]`; `name[imperative]` and `spell-var-name` are documented but not
  implemented.
- **safety**: `avoid-implicit`, `latest`, `package-latest`, `risky-file-permissions`, `risky-octal`, `risky-shell-pipe`.
- **shared**: `galaxy`, `ignore-errors`, `meta-incorrect`, `meta-no-tags`, `meta-video-links`, `meta-runtime`,
  `no-changed-when`, `no-handler`, `no-relative-paths`; `layout`, `meta-version`, `max-block-depth`, `max-tasks`,
  `unsafe-loop` are not implemented.
- **production**: `fqcn`; `avoid-dot-notation`, `sanity`, `import-task-no-when`, `meta-no-dependencies`,
  `single-entry-point`, `use-loop` are not implemented.

Default `warn_list` is `experimental`, `jinja[spacing]`, `fqcn[deep]`. Setting a custom `warn_list` replaces the
default, so re-add those to keep them as warnings.

## Rules that fire on generated code

- **`name[missing]`, `name[play]`**: every task and play named. **`name[casing]`**: the name starts with an uppercase
  letter. **`name[template]`**: a Jinja expression only at the end of a name. **`name[unique]`**: unique within a play
  across `pre_tasks`, `tasks`, `post_tasks`, `handlers`. **`name[prefix]`** (opt-in): tasks in `tasks/deploy.yml` are
  named `deploy | Restart server`; `task_name_prefix` configures the pattern.
- **`fqcn[action-core]`**: `ansible.builtin.copy`, or `ansible.legacy.copy` when a local `library/` override must win.
  **`fqcn[action]`**: FQCN for collection modules. **`fqcn[canonical]`**: the canonical name, not an alias redirected
  through `meta/runtime.yml`. **`fqcn[keyword]`**: no `collections:` keyword. **`fqcn[deep]`**: no nested plugin
  directories in a collection (warning by default).
- **`var-naming[pattern]`**: `^[a-z_][a-z0-9_]*$` by default, `var_naming_pattern` configures.
  **`var-naming[no-role-prefix]`**: a variable in a role's `defaults/` or `vars/` starts with `<role_name>_`; 26.8.0
  stops demanding the prefix on `ansible_` connection variables. **`var-naming[no-reserved]`**, **`[no-jinja]`**,
  **`[no-keyword]`**, **`[non-string]`**, **`[non-ascii]`**, **`[read-only]`**. `loop_var_prefix` in config
  (`^(__|{role}_)`) enforces a prefix on `loop_var`.
- **`no-changed-when`**: a `command`, `shell`, or other arbitrary-command task, including a handler, carries
  `changed_when` (a boolean or an expression on a registered result) or `creates` / `removes`.
- **`risky-shell-pipe`**: a `shell` command containing `|` starts with `set -o pipefail` and sets
  `executable: /bin/bash`; `pwsh` executables are exempt.
- **`command-instead-of-module`**: `service`, `git`, `systemctl`, `yum`, and similar commands where a module exists.
  **`command-instead-of-shell`**: `shell` where the command uses no shell feature.
- **`no-free-form`**: structured arguments (`cmd:`, `argv:`) instead of the free-form string for actions that accept it;
  `raw` and `raw-non-string` sub-rules cover the risk cases.
- **`no-jinja-when`**: no `{{ }}` in `when`.
- **`yaml[octal-values]`**: quote modes. **`yaml[truthy]`**: `true` and `false` only. **`yaml[line-length]`**: 160
  characters by default. **`yaml[document-start]`** and **`yaml[comments-indentation]`** are disabled in the default
  yamllint config. A `.yamllint` file in the project replaces the defaults.
- **`schema`**: playbooks, tasks, vars, meta, `requirements.yml`, `galaxy.yml`, `meta/runtime.yml`,
  `argument_specs.yml`, `molecule.yml`, `ansible-navigator.yml`, execution-environment files, and rulebooks are
  validated against JSON schemas; an unknown key fails before any semantic rule runs.
- **`latest[git]`, `latest[hg]`**: a checkout without a fixed `version`. **`package-latest`**: `state: latest` on a
  package module (`dnf`, `apt`, `pip`, `package`, and the rest); satisfied by `state: present` with a pinned version, or
  by `state: latest` with `update_only: true` (`dnf`) or `only_upgrade: true` (`apt`).
- **`risky-file-permissions`**: `assemble`, `copy`, `file`, `get_url`, `replace`, `template`,
  `community.general.archive`, `community.general.ini_file` without `mode` where the module may create a file;
  `create: false` or `mode: preserve` on `copy` also satisfy it. **`risky-octal`**: an unquoted numeric mode; accepted
  forms are `"0644"`, `"0o644"`, and symbolic `u=rw,g=r,o=r`.
- **`partial-become`**: `become_user` without `become: true` at the same level. Inheritance from the play or the command
  line is not consulted, so a task file that sets only `become_user` fails even under a play with `become`.
- **`ignore-errors`**: a bare `ignore_errors: true`. Accepted: `ignore_errors: "{{ ansible_check_mode }}"`,
  `ignore_errors: true` together with `register`, or `failed_when` naming the tolerated conditions.
- **`no-handler`**: a task guarded by `when: result.changed` on a registered result; the fix is `notify` and a handler.
- **`role-name`**: lowercase alphanumerics and `_`, starting with a letter. **`role-name[path]`**: a role referenced by
  filesystem path instead of by name.
- **`meta-runtime[unsupported-version]`**: `requires_ansible` names a full version (`>=2.18.0`, not `>=2.18`) from the
  supported set; `supported_ansible_also` in config extends it. **`meta-runtime[invalid-version]`**: not a valid
  requirement specifier.
- **`args[module]`**: task arguments checked against the argument spec, including required, mutually exclusive, and
  required-together constraints. It carries the `experimental` tag and reports as a warning under the default
  `warn_list`. `mock_modules` and `mock_roles` satisfy the check for content that is not installed.
- **Opt-in via `enable_list`**: `galaxy-version-incorrect`, `no-log-password`, `empty-string-compare`, `no-same-owner`,
  `name[prefix]`, `jinja2-template-extension`, `argument_spec`, `role-argument-spec`, `complexity[tasks]`,
  `only-builtins`.

## Suppressing

- **`# noqa: rule-id`** at the end of the offending line; several rule ids separated by spaces; for a task-level rule
  the comment sits on any line of the task, for a line-based rule such as `jinja[spacing]` on that line.
- **`.ansible-lint-ignore`** (or `.config/ansible-lint-ignore.txt`) lists `path rule-id` pairs; `--generate-ignore`
  writes it and overwrites an existing file. Entries warn but do not fail; appending `skip` silences them. The exit code
  accounts for the ignore file from 26.6.0.
- **`skip_list`** hides violations from output; **`warn_list`** shows them without failing. `tags: [skip_ansible_lint]`
  on a task skips every task-level rule and no line-level rule.

## Version coupling

The `pre-commit` hook supports only the newest ansible-core release unless `additional_dependencies` pins one, and it
runs in its own virtual environment, so collections installed for the `ansible` bundle are not visible to it;
collections under `~/.ansible` are. `supported_ansible_also` extends the set `meta-runtime` accepts.
