# API and Automation

Proxmox VE exposes a comprehensive REST API that maps 1:1 to all GUI operations.
Every action available in the web interface is available programmatically.

## API Architecture

- **RESTful JSON API** over HTTPS (port 8006)
- Formally defined via **JSON Schema** — enables auto-generated clients
- Every API endpoint corresponds to a filesystem-like path (e.g., `/nodes/{node}/qemu/{vmid}`)
- API documentation: `https://<host>:8006/pve-docs/api-viewer/`

## Authentication

### API Tokens (Recommended)

API tokens provide non-interactive authentication without exposing user credentials.
Each token has an ID and a secret value shown once at creation.

```
pveum user token add root@pam automation --privsep=1
```

- **Privilege separation** (`privsep=1`, default): Token permissions are the
  intersection of the user's permissions and the token's explicit permissions.
  Always use privilege separation for least-privilege access.
- **No privilege separation** (`privsep=0`): Token inherits full user permissions.
  Avoid for automation — overly broad access.
- Tokens do not expire by default. Set expiration for temporary access.
- Store token secrets securely (vault, environment variables) — never in code or
  version control.

**Using tokens in API calls:**
```
Authorization: PVEAPIToken=root@pam!automation=<secret-uuid>
```

### Ticket Authentication

For interactive or short-lived sessions, obtain a ticket via `/access/ticket`:
```
curl -k -d "username=root@pam&password=<password>" \
  https://<host>:8006/api2/json/access/ticket
```

Returns a `CSRFPreventionToken` (for PUT/POST/DELETE) and a `PVEAuthCookie`.
Tickets expire after 2 hours.

**Use API tokens for automation. Use tickets only for interactive tools or
short-lived scripts.**

## pvesh — CLI API Client

`pvesh` is the built-in CLI tool that maps directly to the REST API. Every API
endpoint is accessible via pvesh.

```bash
# List VMs on a node
pvesh get /nodes/pve1/qemu

# Create a VM
pvesh create /nodes/pve1/qemu -vmid 100 -name myvm -memory 2048 \
  -cores 2 -net0 virtio,bridge=vmbr0 -scsi0 local-lvm:32

# Start a VM
pvesh create /nodes/pve1/qemu/100/status/start

# Get VM status
pvesh get /nodes/pve1/qemu/100/status/current

# Delete a VM
pvesh delete /nodes/pve1/qemu/100

# Resize a disk
pvesh set /nodes/pve1/qemu/100/resize -disk scsi0 -size +10G
```

**pvesh verbs map to HTTP methods:**

| pvesh | HTTP | Purpose |
|-------|------|---------|
| `get` | GET | Read/list resources |
| `create` | POST | Create resources or trigger actions |
| `set` | PUT | Update resources |
| `delete` | DELETE | Remove resources |

**Output formats:**
- Default: human-readable table
- `--output-format json`: machine-parseable JSON
- `--output-format json-pretty`: formatted JSON

## qm and pct — Guest CLI Tools

### qm (VM management)

```bash
qm list                          # List all VMs
qm create 100 --name myvm ...   # Create VM
qm start 100                    # Start VM
qm stop 100                     # Stop VM (hard)
qm shutdown 100                 # Graceful shutdown (requires guest agent)
qm destroy 100                  # Delete VM and disks
qm config 100                   # Show VM configuration
qm set 100 --memory 4096        # Update VM config
qm template 100                 # Convert to template
qm clone 100 101 --name clone1  # Clone VM
qm migrate 100 node2            # Migrate VM
qm snapshot 100 snap1           # Create snapshot
qm rollback 100 snap1           # Rollback to snapshot
```

### pct (Container management)

```bash
pct list                         # List all containers
pct create 200 local:vztmpl/... # Create container from template
pct start 200                   # Start container
pct stop 200                    # Stop container
pct destroy 200                 # Delete container
pct config 200                  # Show container configuration
pct set 200 --memory 2048       # Update container config
pct enter 200                   # Open shell in container
pct push 200 /local /ct/path    # Copy file into container
pct pull 200 /ct/path /local    # Copy file from container
pct snapshot 200 snap1          # Create snapshot
pct clone 200 201 --hostname x  # Clone container
```

## Terraform Integration

The Telmate Terraform provider enables Infrastructure-as-Code management of
Proxmox resources.

**Best practices:**
- Use **API tokens** with privilege separation — never use root credentials
- Store state remotely (S3, Consul) — never in local files for shared infrastructure
- Use **cloud-init** templates as the base for Terraform-managed VMs
- Define resource pools in Proxmox to organize Terraform-managed resources
- Use `lifecycle { ignore_changes }` for fields that Proxmox modifies outside Terraform
  (e.g., disk size after manual resize)

## Automation Patterns

### Bulk Operations
```bash
# Start all VMs in a pool
pvesh get /pools/production --output-format json | \
  jq -r '.members[] | select(.type=="qemu") | .vmid' | \
  xargs -I{} qm start {}

# Snapshot all VMs before maintenance
for vmid in $(qm list | awk 'NR>1 {print $1}'); do
  qm snapshot $vmid "pre-maintenance-$(date +%Y%m%d)"
done
```

### Hookscripts

Hookscripts execute at guest lifecycle events (pre-start, post-start, pre-stop,
post-stop). They are stored in a `snippets`-capable storage.

```bash
# Assign hookscript to VM
qm set 100 --hookscript local:snippets/myhook.pl
```

Hookscript receives: `$vmid $phase` where phase is `pre-start`, `post-start`,
`pre-stop`, or `post-stop`.

### Scheduled Tasks

Use **systemd timers** or **cron** on the Proxmox host for scheduled operations:
- Backup schedules (vzdump)
- ZFS scrubs
- Replication schedules
- Custom maintenance scripts

Prefer vzdump's built-in scheduler (configured via GUI or `/etc/pve/jobs.cfg`)
over manual cron entries for backups.

### API Performance Scaling

For automation-heavy workloads with high API request volume, increase the number
of worker processes to prevent slow request handling or timeouts:

```bash
# /etc/default/pvedaemon
MAX_WORKERS=8

# /etc/default/pveproxy
MAX_WORKERS=8
```

Default is 3 workers for each daemon. Restart the relevant service after changes.

### Resource Mappings

For clusters using PCI/USB passthrough with HA, define cluster-wide resource
mappings to decouple device configuration from hardware-specific addresses:

```bash
pvesh create /cluster/mapping/pci --id mygpu --map "node=pve1,path=0000:01:00"
```

This assigns a cluster-unique ID to hardware, so HA failovers and automated
processes reference the mapping ID rather than a host-specific PCI address.
Proxmox verifies the hardware matches the mapping on each node.
