# Error Handling

## Blocks with rescue/always

Blocks provide try/catch/finally semantics for Ansible tasks.

```yaml
tasks:
  - name: Deploy with rollback
    block:
      - name: Deploy new version
        ansible.builtin.copy:
          src: app-v2.tar.gz
          dest: /opt/app/

      - name: Restart service
        ansible.builtin.service:
          name: myapp
          state: restarted

    rescue:
      - name: Rollback to previous version
        ansible.builtin.copy:
          src: app-v1.tar.gz
          dest: /opt/app/

      - name: Restart service with old version
        ansible.builtin.service:
          name: myapp
          state: restarted

    always:
      - name: Send deployment notification
        community.general.slack:
          token: "{{ slack_token }}"
          msg: "Deployment {{ 'failed' if ansible_failed_task is defined else 'succeeded' }}"
```

### Execution flow

- `block`: runs tasks in order. If any task fails, execution jumps to `rescue`
- `rescue`: runs only if a task in `block` failed. If rescue succeeds, the play continues as if the original task
  succeeded
- `always`: runs regardless of block/rescue outcome

### Rescue variables

Available in `rescue` section:

- `ansible_failed_task` -- the task that failed (access `.name`, `.action`, etc.)
- `ansible_failed_result` -- the result of the failed task (access `.rc`, `.msg`, etc.)

```yaml
rescue:
  - name: Log failure details
    ansible.builtin.debug:
      msg: >
        Task '{{ ansible_failed_task.name }}' failed with:
        {{ ansible_failed_result.msg | default('unknown error') }}
```

### Block directives

All tasks in a block inherit directives applied at the block level:

```yaml
- name: Privileged operations
  block:
    - name: Install packages
      ansible.builtin.apt:
        name: nginx
        state: present

    - name: Configure nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
  become: true
  become_user: root
  when: ansible_facts['os_family'] == 'Debian'
```

The `when`, `become`, and `become_user` apply to every task in the block. Loops cannot be applied at the block level.

## Error Control Keywords

### ignore_errors

Continue playbook execution even if a task fails:

```yaml
- name: Check optional service
  ansible.builtin.command: systemctl status optional-svc
  ignore_errors: true
  register: svc_result
```

Use sparingly. Prefer `failed_when` for expected failure conditions.

### failed_when

Define custom failure conditions:

```yaml
- name: Run health check
  ansible.builtin.command: /usr/local/bin/healthcheck
  register: health
  failed_when:
    - health.rc != 0
    - "'MAINTENANCE' not in health.stdout"
```

### changed_when

Control when a task reports "changed":

```yaml
- name: Check if reboot is needed
  ansible.builtin.command: needs-restarting -r
  register: reboot_check
  changed_when: reboot_check.rc == 1
  failed_when: reboot_check.rc > 1
```

### any_errors_fatal

Stop the entire play if any host fails (useful for rolling updates where partial failure is unacceptable):

```yaml
- name: Critical database migration
  hosts: dbservers
  any_errors_fatal: true
  tasks:
    - name: Run migration
      ansible.builtin.command: /opt/db/migrate.sh
```

### max_fail_percentage

Allow a percentage of hosts to fail before aborting:

```yaml
- name: Update webservers
  hosts: webservers
  max_fail_percentage: 25
  serial: 10
  tasks:
    - name: Deploy
      ansible.builtin.copy:
        src: app.tar.gz
        dest: /opt/app/
```

## Retry Logic

Use `retries` and `delay` with `until` for tasks that may need multiple attempts:

```yaml
- name: Wait for service to be ready
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    status_code: 200
  register: result
  until: result.status == 200
  retries: 30
  delay: 10
```

## Rescued vs Failed Reporting

Hosts that fail in `block` but successfully complete their `rescue` tasks are reported in Ansible's final output as
**"rescued"**, not "failed". This affects monitoring and reporting tools that parse Ansible output -- account for it
when building dashboards or CI/CD pass/fail logic.

## Global Result Aggregation

For multi-host deployments, individual host results can be hard to track. Use this pattern to produce a single summary:

```yaml
tasks:
  - name: Deploy application
    block:
      - name: Run deployment
        ansible.builtin.command: /opt/deploy.sh
        register: _result

      - name: Record success
        ansible.builtin.set_fact:
          _host_status: "OK"

    rescue:
      - name: Record failure
        ansible.builtin.set_fact:
          _host_status: "FAIL: {{ ansible_failed_result.msg | default('unknown') }}"

    always:
      - name: Collect results
        ansible.builtin.set_fact:
          _global_result: >-
            {{ _global_result | default([]) +
               [{'host': item, 'status': hostvars[item]._host_status | default('UNKNOWN')}] }}
        loop: "{{ ansible_play_hosts_all }}"
        delegate_to: localhost
        run_once: true

      - name: Display summary
        ansible.builtin.debug:
          var: _global_result
        delegate_to: localhost
        run_once: true
```

Key mechanics:

- Each host stores its status in `_host_status` (set in `block` or `rescue`)
- The `always` section runs once on localhost, looping over all play hosts
- `hostvars[item]._host_status` accesses each host's stored result
- The aggregated list can feed notifications, reports, or database records

## Handlers and Error Recovery

Flush handlers in rescue blocks to ensure cleanup runs:

```yaml
- name: Deploy with handler cleanup
  block:
    - name: Update config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: Restart app
      changed_when: true

    - name: Validate config
      ansible.builtin.command: /opt/app/validate
  rescue:
    - name: Flush handlers before rollback
      ansible.builtin.meta: flush_handlers
```
