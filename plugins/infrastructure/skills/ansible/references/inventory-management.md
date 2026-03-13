# Inventory Management

## Formats

Ansible supports INI and YAML inventory formats natively. YAML is preferred -- it handles data types correctly (INI
`:vars` sections treat all values as strings).

```yaml
# YAML inventory
webservers:
  hosts:
    web01.example.com:
    web02.example.com:
  vars:
    http_port: 80
dbservers:
  hosts:
    db01.example.com:
      db_port: 5432
    db02.example.com:
      db_port: 5433
```

## Default Groups

Two implicit groups always exist:

- `all` -- every host
- `ungrouped` -- hosts not in any explicit group

Every host belongs to at least `all` plus one other group.

## Group Hierarchy

Use `children:` to create parent/child group relationships:

```yaml
production:
  children:
    webservers:
    dbservers:
staging:
  children:
    staging_web:
    staging_db:
```

Child group variables override parent group variables. Groups at the same level merge alphabetically (last wins).
Override with `ansible_group_priority`.

## Grouping Strategy

Group hosts along three dimensions:

- **What** (function): `webservers`, `dbservers`, `monitoring`
- **Where** (location): `dc1`, `dc2`, `us_east`, `eu_west`
- **When** (environment): `production`, `staging`, `development`

A host can belong to multiple groups across dimensions.

## Separate Inventories per Environment

Keep production and staging in separate inventory files or directories to prevent accidental cross-environment changes:

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
```

Target with `-i inventories/production/`.

## Host and Group Variables

### Inline (small inventories only)

```yaml
webservers:
  hosts:
    web01.example.com:
      ansible_port: 2222
      http_port: 8080
```

### Separate files (recommended)

```
group_vars/
  all.yml              # defaults for all hosts
  webservers.yml       # or webservers/ directory
  webservers/
    main.yml
    vault.yml          # encrypted secrets
host_vars/
  web01.example.com.yml
```

Ansible loads all files in a `group_vars/<group>/` directory alphabetically.

## Dynamic Inventory

Use inventory plugins (preferred over legacy scripts) for cloud providers. Plugins return structured data that Ansible
processes natively.

### AWS EC2

```yaml
# aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: instance_type
    prefix: type
filters:
  tag:Project: myproject
  instance-state-name: running
compose:
  ansible_host: public_ip_address
```

Generates groups from tags, instance types, regions, security groups, and VPC IDs. Target machines by tag
(`tag_Project_myapp`), type (`type_t2_micro`), or region.

### Azure

```yaml
# myazure_rm.yml  (filename must end in azure_rm.yml or azure_rm.yaml)
plugin: azure.azcollection.azure_rm
plain_host_names: true
keyed_groups:
  - key: location
    prefix: ''
    separator: ''
  - key: tags.keys() | list if tags else []
    prefix: ''
    separator: ''
conditional_groups:
  linux_vms: "'ubuntu' in image.offer | default('')"
```

Uses hostvars from Azure metadata for group membership. The `conditional_groups` and `keyed_groups` sections automate
group creation from VM properties.

### GCP

```yaml
# gcp_compute.yml
plugin: google.cloud.gcp_compute
auth_kind: serviceaccount
projects:
  - my-gcp-project
keyed_groups:
  - key: zone
    prefix: zone
  - key: status | lower
    prefix: status
  - key: machineType
    prefix: type
compose:
  ansible_host: networkInterfaces[0].accessConfigs[0].natIP
```

### NetBox as Source of Truth

NetBox serves as a single source of truth for hybrid environments. The `netbox.netbox.nb_inventory` plugin queries the
REST API on every run:

```yaml
# netbox.yml
plugin: netbox.netbox.nb_inventory
api_endpoint: https://netbox.example.com
token: "{{ lookup('env', 'NETBOX_TOKEN') }}"
validate_certs: true
group_by:
  - sites
  - device_roles
  - tags
  - platforms
```

Benefits:

- Automatic group updates when custom fields or tags change in NetBox
- Eliminates inventory drift -- always reflects real-time device state
- Supports complex grouping via tags, platforms, regions, sites, roles

### Terraform Integration

Two patterns for using Terraform-provisioned infrastructure with Ansible:

**State file as inventory:** The `cloud.terraform.terraform_state` plugin parses Terraform state (local or remote
backends like S3):

```yaml
# terraform.yml
plugin: cloud.terraform.terraform_state
backend_type: s3
backend_config:
  bucket: my-terraform-state
  key: infrastructure/terraform.tfstate
  region: us-east-1
```

**Ansible provider for Terraform:** Define Ansible inventory entries directly in Terraform HCL, then use the
`cloud.terraform.terraform_provider` plugin. Terraform resources link to Ansible hosts without hardcoding IPs.

## Constructed Inventory

Build groups dynamically from host metadata using Jinja2 logic. Successor to Smart Inventories in AAP.

```yaml
# constructed.yml
plugin: ansible.builtin.constructed
strict: false
keyed_groups:
  - key: ansible_facts.os_family
    prefix: os
    separator: "_"
  - key: tags.Environment | default('unknown')
    prefix: env
groups:
  webservers: "'web' in group_names"
compose:
  ansible_connection: "'local' if inventory_hostname == 'localhost' else 'ssh'"
```

### Multi-Cloud Chaining

Combine multiple input inventories into a single constructed inventory:

1. Provide AWS, Azure, and GCP inventory files as inputs
2. Use Jinja2 templates in `source_vars` to create cross-cloud groups
3. Filter with `limit` using host pattern intersection:

```yaml
# source_vars
plugin: constructed
strict: true
groups:
  is_shutdown: state | default("running") == "shutdown"
  product_dev: account_alias == "product_dev"
# limit: is_shutdown:&product_dev
```

This creates groups from both categories and uses `limit` to return only hosts at the intersection.

## Inventory Caching

For dynamic inventories, caching prevents redundant API calls. A 10,000-host dynamic inventory can take 30+ seconds
without caching; under 1 second with:

```ini
# ansible.cfg
[inventory]
cache = true
cache_plugin = jsonfile
cache_connection = /tmp/ansible_inventory_cache
cache_timeout = 3600
```

## Connection Parameters

Key behavioral parameters set per-host or per-group:

| Parameter                      | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `ansible_host`                 | IP/hostname to connect to                  |
| `ansible_port`                 | SSH port (default 22)                      |
| `ansible_user`                 | SSH username                               |
| `ansible_ssh_private_key_file` | SSH key path                               |
| `ansible_connection`           | Connection type (`ssh`, `local`, `docker`) |
| `ansible_python_interpreter`   | Python path on target                      |
| `ansible_become`               | Enable privilege escalation                |
| `ansible_become_method`        | Escalation method (`sudo`, `su`, `doas`)   |

Never store `ansible_password` or `ansible_become_password` in plain text -- use Vault.

## Ranges

```yaml
webservers:
  hosts:
    web[01:50].example.com:     # web01 through web50
    db-[a:f].example.com:       # db-a through db-f
    web[01:50:2].example.com:   # odd numbers only (stride 2)
```

## Inventory Load Order

- Command-line: `-i staging -i production` -- production wins on conflicts
- Directory: files load alphabetically, prefix with numbers for control (`01-cloud.yml`, `02-static.yml`)
- Mix static and dynamic sources by placing them in the same directory
