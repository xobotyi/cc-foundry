# Templating, filters, and tests

Jinja behavior an agent writes from memory and gets wrong. Everything here holds on ansible-core 2.19 and later, where
templating is native-typed, lazy, and trust-tagged; where 2.18 differs it is marked.

## Where templating happens

All templating runs on the control node before a task is sent. A `.j2` template may use `{% for %}`, `{% if %}`, and
macros; a playbook value may use only expressions, because YAML must parse it first. A task list cannot be looped or
branched with Jinja; `loop` and `when` are the only constructs.

## YAML before Jinja

- **A value that starts with `{{` must be quoted**: `dest: "{{ base }}/app"`. Unquoted, `{` opens a YAML flow mapping
  and the error is `Syntax Error while loading YAML`, not a Jinja error.
- **`yes`, `no`, `on`, `off`, `y`, `n`, and their case variants are booleans** to the YAML 1.1 parser Ansible uses.
  `version: "yes"` is a string only with quotes. ansible-lint's `yaml[truthy]` rejects the bare forms; use `true` and
  `false`.
- **A leading-zero integer is octal.** `mode: 0644` reaches the module as 420. Write `mode: "0644"`, or
  `"u=rw,g=r,o=r"`. `yaml[octal-values]` forbids both implicit and explicit octals.
- **A colon followed by a space inside an unquoted scalar starts a mapping.** `that: result.msg == "a: b"` fails with
  `Conditional expressions must be strings.` Quote the entire expression.
- **A trailing comma after an expression is a syntax error**: `Syntax error in expression: chunk after expression`. On
  2.18 it was silently truthy.

## Expression contexts

`when`, `failed_when`, `changed_when`, `until`, `break_when`, `assert.that`, and register projections are raw
expressions. Delimiters inside them are an error on 2.19 and later
(`Template delimiters are not supported in expressions`) and a warning on 2.18. A list under `when`, `failed_when`, or
`changed_when` is joined with `and`; write `or` explicitly in one string to fail or change on any one condition.

Every expression context must yield a boolean on 2.19 and later. Conversions that produce one:

- `var | length > 0` for a non-empty string or list.
- `var is truthy`, `var is falsy`; with `convert_bool=True` they also accept `"yes"`, `"off"` and friends.
- `var | bool` for the recognized boolean spellings only; anything else warns and is an error from 2.23.
- `result is failed`, `is succeeded`, `is skipped`, `is changed` on a registered result.
- `job is started`, `is finished` on an `async_status` result.
- `x is version('12.04', '>=')` for version comparison, with `version_type` of `loose`, `strict`, `semver`, `pep440`.

## Types

- **Comparisons are typed.** `rc == "127"` is false when `rc` is the integer 127. The `debug` module with `var: expr`
  prints how an expression evaluates.
- **`int`, `float`, `string`, `bool` filters convert; nothing converts implicitly.** A fact read from a string source
  such as INI `:vars` stays a string.
- **`None` is not `""`.** `is defined` is true for a `None` value; test `is not none` when null matters. A module option
  typed `str` receives `""` for `None` from 2.19.1.
- **`range()`** is consumed inline (`range(0, 10) | random`) or listed (`range(0, 3) | list`); it cannot be stored.
- **`set` and `tuple` become `list`** at the end of templating.
- **A string filter such as `replace` stringifies a list** silently. Use `map('replace', ...)` for element-wise work.
- **Type tests**: `is string`, `is mapping`, `is sequence`, `is iterable`, `is number`, `is integer`, `is float`,
  `is boolean`. A string is a sequence and iterable; a mapping is not a string. `type_debug` is for display only.

## Undefined

- **An undefined variable anywhere in an expression is an error.** `DEFAULT_UNDEFINED_VAR_BEHAVIOR` has no effect from
  2.19.
- **`default(value)`** applies only when the immediate value is undefined. `default(value, true)` also replaces `false`,
  `0`, `""`, `[]`, `{}`, and `None`.
- **A chain through undefined intermediates works**: `foo.bar.baz | default('x')` when `foo` is undefined.
- **A container with an undefined nested value is defined.** `complex | default(other)` returns `complex`; the nested
  error appears on access. Apply `default` at the leaf.
- **`undef(hint='...')`** makes a variable that must be overridden; reading it fails with the hint.
- **`mandatory`** raises when undefined; it exists for content that disabled undefined checking on older lines.
- **A loop over an undefined list**: `loop: "{{ items | default([]) }}"` skips the task; `when` on an undefined variable
  fails.

## `omit`

- `default(omit)` at a module argument removes the argument. It is a first-class template result from 2.19: any value
  that resolves to `omit` is removed from its container during templating, and a loop item value resolving to `omit` is
  dropped from the item before the task sees it.
- Chaining after `default(omit)` fails; write `foo | default(None) | filter or omit`.
- A variable holding `omit` cannot be serialized (`to_json`, `to_yaml`, `ansible-inventory`) until templating completes.

## Dictionaries and lists

- **`combine`** merges mappings. `recursive=True` merges nested mappings; without it a nested mapping is replaced whole.
  Lists inside are governed by `list_merge`: `replace` (default), `keep`, `append`, `prepend`, `append_rp`,
  `prepend_rp`. `combine` ignores `hash_behaviour`.
- **`DEFAULT_HASH_BEHAVIOUR=merge`** exists on every line in scope and is documented as fragile and not recommended; it
  changes how inventory and vars merge, not how `combine` behaves.
- **Bracket access is always safe; dot access collides** with `dict` and `str` method names such as `items`, `keys`,
  `update`, `copy`, `count`, `format`, `index`, `values`. Prefer `foo['items']`.
- **Loop over a dict** with `dict2items` (`item.key`, `item.value`) or `dictsort` (`item.0`, `item.1`).
- **`with_items` flattens one level; `loop` does not.** `loop: "{{ x | flatten(levels=1) }}"` reproduces it.
- **`loop` needs a list.** `lookup()` returns a comma-joined string; use `query()` or `wantlist=True`.
- **`product`, `zip`, `subelements`** replace `with_nested`, `with_together`, `with_subelements`.

## Serialization

- **`to_json` and `to_nice_json` escape non-ASCII by default.** Pass `ensure_ascii=False` to keep it.
- **`to_yaml` wraps lines at 80 characters**; pass `width=` with a literal integer.
- **`to_yaml` on a vaulted value** emits `!vault` ciphertext on 2.19 and 2.20 and the decrypted value on 2.21, where
  `vault_behavior` selects.
- **`from_json` and `from_yaml`** parse a registered `stdout`; `from_yaml_all` returns `[]` for empty input.

## Strings, paths, regex

- `regex_search` returns `None` on no match; `regex_replace` returns the input. Tests `match` anchor at the start,
  `search` anywhere, `regex` takes `match_type`. All accept `ignorecase` and `multiline`.
- `quote` for a value interpolated into a `command` or `shell` string.
- `basename`, `dirname`, `realpath`, `relpath`, `splitext`, `expanduser`, `path_join` operate on control-node semantics.
  The `file`, `directory`, `link`, `exists`, `abs`, `mount`, `same_file` tests check control-node paths, never the
  target.
- `hash`, `password_hash`, `b64encode` and `b64decode` (URL-safe variants from 2.19), `checksum`, `to_uuid`.
- `now()`, `strftime`, `to_datetime`. `strftime` uses `datetime.strftime` from 2.21.

## Trust

Only text loaded from a trusted source is rendered. Playbooks, roles, vars files, `group_vars`, `host_vars`, and the
built-in inventory plugins are trusted. Module results, facts, and command output are not: a `{{ }}` inside a file's
contents that a task read is printed as-is. `!unsafe` marks a value in a trusted file as data, so it is never rendered;
`{% raw %}...{% endraw %}` keeps delimiters literal inside a template that is otherwise rendered. On 2.18 untrusted
strings were still rendered unless wrapped as unsafe, which is the behavior 2.19 removed for security.
