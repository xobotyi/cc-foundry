# Variables, Precedence, and Jinja2 Templating

## Variable Precedence

From lowest to highest (last wins):

1. Command-line values (not variables, e.g., `-u my_user`)
2. Role defaults (`defaults/main.yml`)
3. Inventory file or script group vars
4. Inventory `group_vars/all`
5. Playbook `group_vars/all`
6. Inventory `group_vars/*`
7. Playbook `group_vars/*`
8. Inventory file or script host vars
9. Inventory `host_vars/*`
10. Playbook `host_vars/*`
11. Host facts and cached `set_facts`
12. Play `vars:`
13. Play `vars_prompt:`
14. Play `vars_files:`
15. Role `vars/` (`vars/main.yml`)
16. Block `vars:` (only for tasks in block)
17. Task `vars:` (only for the task)
18. `include_vars`
19. `set_facts` / registered vars
20. Role and `include_role` params
21. `include` params
22. Extra vars (`-e`) -- always win

## Practical Guidance

- **Overridable defaults** → Role `defaults/main.yml`
- **Environment-wide values** → `group_vars/all.yml`
- **Group-specific values** → `group_vars/<group>.yml`
- **Host-specific values** → `host_vars/<host>.yml`
- **Force a value in a role** → Role `vars/main.yml`
- **Override everything at runtime** → `--extra-vars`

Define each variable in ONE place. If you need a variable at multiple levels, understand which one wins.

## Variable Scoping

Three scopes:

- **Global**: config, environment variables, command line, extra vars
- **Play**: `vars:`, `vars_files:`, `vars_prompt:`, role defaults/vars
- **Host**: inventory variables, `include_vars`, facts, registered vars

## YAML Quoting Gotcha

Values starting with `{{ }}` must be quoted:

```yaml
# BROKEN: YAML parser error
app_path: {{ base_path }}/app

# CORRECT: quoted
app_path: "{{ base_path }}/app"
```

## Registered Variables

Capture task output for use in subsequent tasks:

```yaml
- name: Check service status
  ansible.builtin.command: systemctl is-active nginx
  register: nginx_status
  changed_when: false
  failed_when: false

- name: Start nginx if not running
  ansible.builtin.service:
    name: nginx
    state: started
  when: nginx_status.rc != 0
```

Registered variables are host-scoped and exist only for the current playbook run.

## Jinja2 Templating

All templating happens on the control node before task execution.

### Filters (transform data)

```yaml
# Type conversion
port: "{{ raw_port | int }}"
enabled: "{{ raw_flag | bool }}"

# Defaults
server: "{{ custom_server | default('localhost') }}"

# String manipulation
name: "{{ hostname | upper }}"
slug: "{{ title | lower | replace(' ', '-') }}"

# List/dict operations
first: "{{ servers | first }}"
unique: "{{ items | unique }}"
merged: "{{ dict1 | combine(dict2) }}"
joined: "{{ list1 + list2 }}"

# Password hashing
hashed: "{{ password | password_hash('sha512') }}"

# Path manipulation
basename: "{{ '/etc/nginx/nginx.conf' | basename }}"
dirname: "{{ '/etc/nginx/nginx.conf' | dirname }}"
```

### Tests (evaluate conditions)

```yaml
when: result is defined
when: result is not failed
when: path is file
when: value is match("^prefix.*")
when: item is in allowed_list
```

### Template files (.j2)

Templates support full Jinja2: loops, conditionals, macros.

```jinja2
# nginx.conf.j2
{% for server in backend_servers %}
upstream backend {
    server {{ server.host }}:{{ server.port }};
}
{% endfor %}

server {
    listen {{ nginx_port | default(80) }};
    server_name {{ server_name }};
{% if ssl_enabled | default(false) %}
    ssl_certificate {{ ssl_cert_path }};
{% endif %}
}
```

### Variable precedence in templates

Templates have access to all variables in scope for the host: play vars, role vars, host vars, facts, registered vars,
and magic variables.

## Magic Variables

- **`inventory_hostname`** — Name of the host in inventory
- **`ansible_host`** — Actual connection address
- **`group_names`** — List of groups the host belongs to
- **`groups`** — Dictionary of all groups and their hosts
- **`hostvars`** — Dictionary of all host variables (access other hosts' vars)
- **`play_hosts`** — List of hosts in the current play
- **`ansible_facts`** — Gathered facts for the current host
- **`playbook_dir`** — Directory of the playbook being executed
- **`role_path`** — Path to the current role
