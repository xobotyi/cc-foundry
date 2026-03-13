# Playbook Design Patterns

## Play Structure

A playbook is a list of plays. Each play targets hosts with a pattern and runs tasks in order. Execution order within a
play using `roles:`:

1. `pre_tasks` (and triggered handlers)
2. Roles listed in `roles:` (dependencies first)
3. `tasks` (and triggered handlers)
4. `post_tasks` (and triggered handlers)

## Naming

Always name plays, tasks, and blocks. Names appear in output and make debugging possible. Unnamed tasks produce opaque
logs.

```yaml
# Bad: unnamed task
- ansible.builtin.yum:
    name: httpd
    state: present

# Good: named task
- name: Install Apache HTTP server
  ansible.builtin.yum:
    name: httpd
    state: present
```

## State Explicitness

Always specify `state:` even when the module default matches your intent. Different modules have different defaults.
Explicit state makes playbooks self-documenting.

```yaml
# Bad: implicit state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx

# Good: explicit state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
```

## Fully Qualified Collection Names (FQCN)

Always use FQCN to avoid module name collisions across collections:

```yaml
# Bad: short module name
- copy:
    src: foo.conf
    dest: /etc/foo.conf

# Good: FQCN
- ansible.builtin.copy:
    src: foo.conf
    dest: /etc/foo.conf
```

## Idempotency

Most modules check desired state before acting. Design all tasks to be idempotent:

- Prefer declarative modules (`ansible.builtin.copy`, `ansible.builtin.template`, `ansible.builtin.service`) over
  imperative ones (`ansible.builtin.command`, `ansible.builtin.shell`)
- When using `command`/`shell`, add `creates:`, `removes:`, or `changed_when:` to make them idempotent
- Test by running playbooks twice -- second run should report zero changes

```yaml
# Idempotent command with creates guard
- name: Initialize database
  ansible.builtin.command: /usr/bin/initdb --data-dir /var/lib/db
  creates: /var/lib/db/initialized
```

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
