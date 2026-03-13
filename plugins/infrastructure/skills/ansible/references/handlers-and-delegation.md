# Handlers, Delegation, and Async

## Handlers

Handlers are tasks that run only when notified by a `changed` task. They execute once
per play, after all tasks complete (or when explicitly flushed).

### Basic pattern

```yaml
tasks:
  - name: Update nginx config
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    notify: Restart nginx

handlers:
  - name: Restart nginx
    ansible.builtin.service:
      name: nginx
      state: restarted
```

### Execution order

Handlers run in the order they are **defined** in the `handlers:` section, not the
order they are notified. Multiple notifications to the same handler result in a single
execution.

### Handler insertion order

1. Handlers from roles in `roles:` section
2. Handlers from play `handlers:` section
3. Handlers from `import_role` tasks
4. Handlers from `include_role` tasks (available only after include executes)

Last-defined handler with a given name wins (shadows earlier ones).

### listen topics

Group multiple handlers under a topic:

```yaml
handlers:
  - name: Restart nginx
    ansible.builtin.service:
      name: nginx
      state: restarted
    listen: restart web stack

  - name: Restart php-fpm
    ansible.builtin.service:
      name: php-fpm
      state: restarted
    listen: restart web stack

tasks:
  - name: Update web config
    ansible.builtin.template:
      src: web.conf.j2
      dest: /etc/web.conf
    notify: restart web stack
```

### Flushing handlers mid-play

```yaml
tasks:
  - name: Update config
    ansible.builtin.template:
      src: app.conf.j2
      dest: /etc/app.conf
    notify: Restart app

  - name: Flush handlers now
    ansible.builtin.meta: flush_handlers

  - name: Verify service is running
    ansible.builtin.uri:
      url: http://localhost:8080/health
```

### Handler gotchas

- Variables in handler **names** cause problems. Use variables in handler **parameters**
  instead:

```yaml
# BAD: variable in handler name
- name: Restart {{ service_name }}

# GOOD: variable in handler body
- name: Restart web service
  ansible.builtin.service:
    name: "{{ service_name }}"
    state: restarted
```

- Handlers from roles have global scope. Prefix with role name to avoid conflicts:
  `role_name : Restart nginx`
- Handlers cannot run `import_role` or `include_role`
- Handlers ignore tags

## Delegation

Execute a task on a different host than the current target:

```yaml
- name: Remove from load balancer
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

### local_action shorthand

```yaml
- name: Send notification
  local_action:
    module: community.general.slack
    token: "{{ slack_token }}"
    msg: "Deploying to {{ inventory_hostname }}"
```

Equivalent to `delegate_to: 127.0.0.1`.

### Delegated facts

By default, facts gathered by delegated tasks are assigned to the current host.
Use `delegate_facts: true` to assign to the delegated host:

```yaml
- name: Gather facts from DB servers
  ansible.builtin.setup:
  delegate_to: "{{ item }}"
  delegate_facts: true
  loop: "{{ groups['dbservers'] }}"
```

### Concurrency with delegation

Delegated tasks still run in parallel (default 5 forks). When multiple hosts delegate
to the same target (e.g., updating a single file), use `run_once: true` with a loop,
`serial: 1`, or `throttle: 1` to avoid race conditions.

## Async Tasks

For long-running operations that might exceed SSH timeout or that should run concurrently.

### Polling mode (poll > 0)

Block until complete, with extended timeout:

```yaml
- name: Run database backup (allow up to 30 min)
  ansible.builtin.command: /opt/db/backup.sh
  async: 1800    # max runtime in seconds
  poll: 30       # check every 30 seconds
```

### Fire-and-forget (poll = 0)

Start task and move on immediately:

```yaml
- name: Start long-running migration
  ansible.builtin.command: /opt/db/migrate.sh
  async: 3600
  poll: 0
  register: migration_job

# Later: check if it completed
- name: Wait for migration to finish
  ansible.builtin.async_status:
    jid: "{{ migration_job.ansible_job_id }}"
  register: job_result
  until: job_result is finished
  retries: 60
  delay: 30
```

### Async gotchas

- Do not use `poll: 0` with tasks requiring exclusive locks (e.g., package managers)
  if later tasks touch the same resource
- Async tasks always report `changed` -- use `changed_when` on the `async_status`
  check task
- With `poll: 0`, clean up async cache manually with `async_status` mode `cleanup`
- `async` value must be high enough for the task to complete; otherwise the
  `async_status` check fails because the cache file expires
