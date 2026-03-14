# Playbook Design Patterns

## Play Execution Order

A playbook is a list of plays. Each play targets hosts with a pattern and runs tasks in order. Execution order within a
play using `roles:`:

1. `pre_tasks` (and triggered handlers)
2. Roles listed in `roles:` (dependencies first)
3. `tasks` (and triggered handlers)
4. `post_tasks` (and triggered handlers)

## Import vs Include (Static vs Dynamic)

| Aspect       | `import_*` (static)                      | `include_*` (dynamic)                 |
| ------------ | ---------------------------------------- | ------------------------------------- |
| Parsing      | At playbook parse time                   | At runtime when reached               |
| Tags         | Inherited by all imported tasks          | Applied only to the include statement |
| Conditionals | Applied to each imported task            | Applied once to the include           |
| Loops        | Cannot loop                              | Can loop                              |
| Use when     | Structure is fixed, need tag inheritance | Conditional inclusion, looping        |

Prefer `import_tasks` / `import_role` for predictable execution. Use `include_tasks` / `include_role` when you need
runtime decisions or loops.

## Batched Execution with serial

Control rolling updates with `serial`:

```yaml
- name: Rolling update webservers
  hosts: webservers
  serial: 5  # or "20%" or [1, 5, "100%"]

  tasks:
    - name: Take out of load balancer
      ansible.builtin.command: /usr/bin/remove_from_pool {{ inventory_hostname }}
      delegate_to: lb.example.com

    - name: Update application
      ansible.builtin.yum:
        name: myapp
        state: latest

    - name: Add back to load balancer
      ansible.builtin.command: /usr/bin/add_to_pool {{ inventory_hostname }}
      delegate_to: lb.example.com
```

## Verification

- `--syntax-check`: parse without executing
- `--check` (`-C`): dry run, report what would change
- `--diff`: show file content changes
- `--list-tasks`: show tasks that would run
- `--list-hosts`: show targeted hosts
- `ansible-lint`: static analysis with community rules

## Project Layout

Standard layout for a multi-tier project:

```
inventories/
  production/
    hosts
    group_vars/
    host_vars/
  staging/
    hosts
    group_vars/
    host_vars/

site.yml                # master playbook
webservers.yml          # tier playbook
dbservers.yml           # tier playbook

roles/
  common/
  webtier/
  monitoring/

group_vars/
  all.yml
host_vars/
```

`site.yml` imports tier playbooks. Tier playbooks map host groups to roles. This enables both full-infrastructure runs
and targeted tier updates.
