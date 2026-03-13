# Role Structure and Reuse

## Directory Structure

```
roles/
  my_role/
    tasks/
      main.yml          # entry point -- can include/import other task files
    handlers/
      main.yml          # handlers, auto-imported into play scope
    templates/
      config.j2         # Jinja2 templates
    files/
      script.sh         # static files for copy/script modules
    vars/
      main.yml          # high-precedence variables (hard to override)
    defaults/
      main.yml          # low-precedence variables (easy to override)
    meta/
      main.yml          # role dependencies, Galaxy metadata
      argument_specs.yml  # argument validation (2.11+)
    library/            # custom modules (standalone roles only)
    filter_plugins/     # custom filter plugins
```

No directory is required. A role with only `files/` or only `tasks/` is valid.

## defaults/ vs vars/

| Directory | Precedence | Override by | Use for |
|-----------|-----------|-------------|---------|
| `defaults/` | Very low | Almost anything | User-configurable knobs (ports, paths, feature flags) |
| `vars/` | High | Only `extra-vars`, role params, `include_vars` | Internal constants the role needs to function |

Rule: if users should change it, put it in `defaults/`. If the role breaks without it,
put it in `vars/`.

## Using Roles

Three mechanisms with different behaviors:

### Play-level `roles:` (classic, static)

```yaml
- hosts: webservers
  roles:
    - common
    - role: nginx
      vars:
        nginx_port: 8080
```

Static import at parse time. Tags on the role apply to ALL tasks inside. Role
dependencies in `meta/main.yml` run first.

### `import_role` (static, in tasks section)

```yaml
tasks:
  - name: Apply nginx role
    ansible.builtin.import_role:
      name: nginx
    vars:
      nginx_port: 8080
```

Same static behavior as `roles:` but can be placed anywhere in the tasks list.

### `include_role` (dynamic, in tasks section)

```yaml
tasks:
  - name: Conditionally apply nginx
    ansible.builtin.include_role:
      name: nginx
    when: ansible_facts['os_family'] == 'Debian'
```

Dynamic -- evaluated at runtime. Tags on the include apply only to the include
statement itself, not to tasks inside. Supports `when`, loops.

## Platform-Specific Tasks

Split platform-specific logic into separate task files:

```yaml
# roles/webserver/tasks/main.yml
- name: Install webserver (RedHat)
  ansible.builtin.import_tasks: redhat.yml
  when: ansible_facts['os_family'] | lower == 'redhat'

- name: Install webserver (Debian)
  ansible.builtin.import_tasks: debian.yml
  when: ansible_facts['os_family'] | lower == 'debian'
```

## Argument Validation

Define expected parameters in `meta/argument_specs.yml` (2.11+):

```yaml
argument_specs:
  main:
    short_description: Configure nginx
    options:
      nginx_port:
        type: int
        required: false
        default: 80
        description: Port nginx listens on
      nginx_server_name:
        type: str
        required: true
        description: Server name for the default vhost
```

Validation runs automatically before role tasks execute. Failed validation stops the role.

## Role Dependencies

Defined in `meta/main.yml`:

```yaml
dependencies:
  - role: common
    vars:
      some_param: value
  - role: ssl_certs
```

Dependencies run before the role. Ansible deduplicates: a dependency runs only once per
play unless parameters differ or `allow_duplicates: true` is set on the dependency role.

## Role Deduplication

Ansible runs each role once per play by default. To run a role multiple times:
- Pass different parameters (the `roles:` keyword compares parameters)
- Set `allow_duplicates: true` in the role's `meta/main.yml`

## Naming Conventions

- Role names: lowercase, hyphens for separators (`nginx-proxy`, `ssl-certs`)
- Prefix all role variables with the role name to avoid collisions:
  `nginx_port`, `nginx_worker_connections`
- Prefix all role handlers with the role name: `nginx : Restart nginx`
