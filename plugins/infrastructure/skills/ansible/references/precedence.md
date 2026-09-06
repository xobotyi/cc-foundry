# Variable precedence and scope

Where a value comes from when the same name is set in several places, and how long it lives. The rules hold on
ansible-core 2.18 through 2.21; none of those lines changed the order.

## The four categories

Lowest to highest: configuration settings, command-line options, playbook keywords, variables, direct assignment. Each
category overrides everything below it.

- **Configuration** is `ansible.cfg` plus environment variables; an environment variable beats the file. Ansible loads
  the first `ansible.cfg` it finds and ignores the rest: `ANSIBLE_CONFIG`, then `./ansible.cfg`, then `~/.ansible.cfg`,
  then `/etc/ansible/ansible.cfg`. A world-writable current directory is skipped, because another user could plant a
  config that runs code with the caller's privileges; set `ANSIBLE_CONFIG` explicitly there.
- **Command-line options** override configuration only. `-u carol` loses to `ansible_user` set anywhere. The last
  occurrence of a single-valued option wins; multi-valued ones such as `-i` accumulate.
- **Playbook keywords** flow play, then block, include, import, or role, then task; the more specific wins.
- **Variables** beat every keyword. `--extra-vars` is a variable, not an option, which is why `-e ansible_user=brian`
  beats `-u carol` while `-u` cannot beat inventory.
- **Direct assignment** is a module or plugin option given inline, and lookup, filter, or test arguments.

## The variable ladder

Lowest to highest. Within one rung, the last definition loaded wins.

1. Command-line values such as `-u` (not variables, listed for position).
2. Role defaults (`defaults/main.yml`). A role's own defaults beat another role's defaults; everything else beats them.
3. Inventory file or script group vars.
4. Inventory `group_vars/all`.
5. Playbook `group_vars/all`.
6. Inventory `group_vars/*`.
7. Playbook `group_vars/*`.
8. Inventory file or script host vars.
9. Inventory `host_vars/*`.
10. Playbook `host_vars/*`.
11. Host facts and cached `set_fact` values.
12. Play `vars`.
13. Play `vars_prompt`.
14. Play `vars_files`.
15. Role `vars/main.yml`.
16. Block `vars` (tasks in the block only).
17. Task `vars` (that task only).
18. `include_vars`.
19. Registered variables and non-cached `set_fact`.
20. Role parameters and `include_role` parameters.
21. Include parameters.
22. Extra vars (`-e`). Always win.

## Inventory merge order

Inventory is flattened per host before a play starts; groups do not exist as objects at run time. Entities merge lowest
to highest: the `all` group, parent groups, child groups, the host. Groups at the same level merge in alphabetical
order, so `b_group` overwrites `a_group`. `ansible_group_priority` (default `1`, larger merges later) overrides the
alphabetical order, and it can only be set in an inventory source, never in `group_vars/`, because Ansible reads it
while loading `group_vars/`.

Several `-i` sources merge in the order given; files in an inventory directory merge alphabetically, so a numeric prefix
(`01-`, `02-`) is the way to order them. The YAML and INI plugins drop empty groups when they finish a source, so a
parent group that lists a child defined in a later source can fail to parse.

## `group_vars` and `host_vars` locations

The `host_group_vars` plugin reads directories relative to the inventory source and relative to the playbook.
`ansible-playbook` loads both; the playbook-adjacent copy overrides the inventory-adjacent one. `ansible`,
`ansible-console`, and `ansible-inventory` have no playbook and read only the inventory-adjacent directories unless
`--playbook-dir` is given, so they can print a different value from the one a play sees.

Files take `.yml`, `.yaml`, `.json`, or no extension. A directory named for the group or host is read in lexicographic
order. Role `vars/` and `defaults/` may also be directories; directories inside are read before files.

## INI typing

A `key=value` on a host line is parsed as a Python literal: `port=22` is an integer, `flag=False` a boolean. The same
`key=value` under a `[group:vars]` section is a string: `flag=False` is the string `'False'`. Apply a filter (`bool`,
`int`) when consuming a value that came from INI, or use YAML inventory.

## Extra vars typing

`-e "version=1.23"` is a string. `-e '{"version": 1.23, "ghosts": ["inky"]}'` keeps JSON types. `-e @file.yml` and
`-e @file.json` keep the file's types. Quoting for the shell and the markup stack; a JSON or YAML file is easier than
escaping.

## Scope

- **Global**: configuration, environment, command line.
- **Play**: `vars`, `vars_files`, `vars_prompt`, role defaults and vars. Gone when the play ends.
- **Host**: inventory, facts, `set_fact`, `include_vars`, registered results. Available to every later play in the same
  run, and through `hostvars[]`.

Extra vars are global for the run and appear both as play vars and in `hostvars`.

## Roles

- **`vars:` on a role in the `roles:` section** is scoped to that role from ansible-core 2.15; earlier lines leaked it
  into the play. `DEFAULT_PRIVATE_ROLE_VARS` controls the older behavior.
- **`roles:` and `import_role` publish the role's `defaults/` and `vars/` to the whole play at parse time**, so even
  tasks and roles before the import see them; `DEFAULT_PRIVATE_ROLE_VARS=true` or `public: false` stops it.
  **`include_role` publishes nothing by default** (`public` defaults to `false`); with `public: true` the variables
  exist for tasks after the include only.
- **`include_role` runs the role every time it is called** (`allow_duplicates` defaults to `true` on the include); the
  once-per-play deduplication applies to `roles:` entries and `meta/main.yml` dependencies.
- **`vars_from`, `defaults_from`, `tasks_from`, `handlers_from`** pick a different file in the same directory and keep
  that directory's precedence rung.
- **Role parameters are not `vars:`.** `- role: foo, message: first` is a parameter and makes the invocation distinct;
  `vars:` inside a `dependencies` entry is scoped at the play level and can define a value for roles that ran before it.
- **Deduplication runs before variable evaluation.** Two dependency entries that differ only in a lazily-evaluated
  variable can be treated as the same invocation and run once.

## `set_fact` and facts

- **`set_fact` evaluates on assignment.** Unlike a `vars` entry, which is a lazy template re-evaluated on each access,
  the fact holds the value computed when the task ran.
- **`cacheable: true` creates two copies**: a `set_fact`-precedence host variable for the current run, and a fact at
  rung 11 that the cache plugin persists. `meta: clear_facts` removes the fact copy and leaves the host variable.
- **Registered variables are never cached** and live for the rest of the run on the host that registered them.
- **A registered variable exists on a host even when the task failed or was skipped**, so test `is skipped` or
  `is failed`, not `is defined`. The one exception is a task excluded by tags, which registers nothing.
- **`gather_facts` runs once per play by default (`gathering=implicit`)**; `smart` skips hosts with cached facts and
  `explicit` gathers only on `gather_facts: true`. `CACHE_PLUGIN_TIMEOUT` defaults to 86400 seconds.
- **`INJECT_FACTS_AS_VARS`** defaults to `True` through 2.23 and flips to `False` in 2.24. Under it `ansible_os_family`
  and `ansible_facts['os_family']` both exist; the bare form warns on 2.20 and later.

## Delegation

Under `delegate_to`, the connection, become, shell, and interpreter options are templated from the delegate's variables.
`inventory_hostname` keeps naming the original host; every other variable, including `inventory_hostname_short` and
`ansible_host`, is the delegate's. `hostvars[inventory_hostname]['name']` reaches the original host's value. A delegated
host outside inventory inherits only `all` group vars and is better added with `add_host`.
