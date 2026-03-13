# Plugins, Community Applications, and User Scripts

## Community Applications (CA)

The gateway to the Unraid plugin and Docker ecosystem. Adds an **Apps** tab to the WebGUI with an app-store interface.

### Features

- Curated catalog of 2,000+ Docker containers and plugins
- Search, filter by category or keyword
- Labels: Beta, Installed, Updated, Monthly CA Spotlight
- Action Center: update notifications, deprecated/incompatible app alerts, blacklisted apps removed for security or
  compatibility

### Installation

Plugins tab > Install > Community Applications. The Apps tab appears after refresh.

### Application Management

- **Install**: Apps tab > click Install on any tile
- **Remove**: Apps tab > Installed Apps filter > Actions > Uninstall
- **Reinstall**: Apps tab > Previous Apps filter > follow prompts (settings restored from saved XML templates at
  `/boot/config/plugins/dockerMan/templates-user/`)
- **Update**: Action Center shows available updates

### Security Vetting

Before installing any application:

- Check the developer's reputation and support thread activity
- Ensure the source repository is well-known and trustworthy
- Be cautious about granting access to array, cache pool, or sensitive data
- Monitor Action Center for blacklisted or deprecated applications

### Docker Template XML

Container configurations are saved as XML template files:

- Location: `/boot/config/plugins/dockerMan/templates-user/`
- Schema documented at Unraid forums (Docker Template XML Schema thread)
- Templates enable quick reinstallation with preserved settings

## Essential Plugins

| Plugin                      | Purpose                                                    | Why Essential                                                           |
| --------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Community Applications      | App store interface                                        | Gateway to all other plugins and containers                             |
| CA Appdata Backup/Restore   | Automated backup of container configs and appdata          | Protects against docker.img corruption and data loss                    |
| Fix Common Problems         | Configuration error and security risk alerts               | Catches missing root password, insecure shares, failed logins           |
| Unassigned Devices          | Mount drives outside array/pools                           | Required for scratch backup drives, external USB, preclear              |
| Unassigned Devices Preclear | Prepare new drives before adding to array                  | Stress-tests drives and zeroes data before production use               |
| Dynamix System Temp         | Hardware temperature monitoring (CPU, motherboard)         | Real-time thermal awareness in WebGUI                                   |
| Dynamix Cache Dirs          | Prevents unnecessary drive spinups from directory listings | Critical for power-saving spindown strategies                           |
| Dynamix Password Validator  | Real-time password strength feedback                       | Enforces strong root password (Unraid has no built-in complexity rules) |
| Tips and Tweaks             | System-level performance optimizations and tuning          | First-install plugin for new builds                                     |
| File Integrity              | File hash checking for bitrot detection                    | Data verification and silent corruption monitoring                      |
| Mover Tuning                | Advanced mover schedule, threshold, and age-based control  | Prevents premature cache-to-array moves, enables spindown optimization  |
| NUT (Network UPS Tools)     | UPS monitoring and graceful shutdown                       | Prevents data corruption and forced parity checks from power loss       |
| User Scripts                | Custom shell script automation via WebGUI                  | Primary automation engine for all scheduled tasks                       |

## User Scripts Plugin

Provides a WebGUI interface for creating, managing, and scheduling shell scripts.

### Access

Settings > User Scripts (install from Apps tab first).

### Script Scheduling

| Schedule Type                          | Description                             |
| -------------------------------------- | --------------------------------------- |
| At Startup of Array                    | Runs when array starts                  |
| At Stopping of Array                   | Runs when array stops                   |
| At First Array Start Only              | Runs once after boot                    |
| Custom (cron)                          | Cron expression for flexible scheduling |
| Scheduled: Hourly/Daily/Weekly/Monthly | Preset intervals                        |

Cron expression example: `0 3 * * 1` = 3:00 AM every Monday.

### Essential Automation Scripts

**Backup and disaster recovery:**

```bash
# Stop containers for backup
docker stop "plex" "sonarr" "radarr"
# Run backup operations
# ...
# Restart containers
docker start "plex" "sonarr" "radarr"
```

- Flash drive ZIP backups (daily, retain 14 days, sync to cloud via rclone)
- VM XML and OVMF NVRAM backups
- Plex/MySQL database backups
- Syslog preservation to flash drive
- ZFS snapshot automation for zero-downtime container backups

**Custom mover (per-share):**

```bash
# Move specific shares from cache to array
/usr/local/sbin/mover --share "media"
```

- `mover_fast` script: forces mover for all shares, bypasses Mover Tuning thresholds
- Per-share mover with age/size filtering

**Docker maintenance:**

- Delete dangling Docker images (reclaim docker.img space)
- Trim/clean Docker logs (prevent space exhaustion)
- View Docker log sizes (identify excessive loggers)
- Start/stop containers on schedule

**Storage maintenance:**

- SMART checkups on scheduled intervals
- Scheduled ZFS scrubs and BTRFS checks
- fstrim operations for SSDs
- Move files between specific disks
- Spin up all drives at scheduled times
- Enable/disable Turbo Write based on drive spin state

**GPU and hardware:**

- **Nvidia GPU idle script**: kicks GPU into idle power state at bootup. Without this, GPUs in CLI mode run at full
  power until a task uses them
- Custom VM icons download and management

**VM management:**

- Resume paused/suspended VMs or start shut off VMs
- USB Hotplug for VMs without controller passthrough
- Enable/disable nested virtualization

**Security and monitoring:**

- Auto-renew Let's Encrypt certificates
- Send server status to phone (Telegram/Pushover)
- Cron job failure notifications

### Heartbeat Monitoring

Use healthchecks.io (free hosted or self-hosted) to monitor automated scripts:

- Each script sends a ping/heartbeat URL when it completes successfully
- If a script fails to run on schedule, healthchecks.io sends an alert
- Configure email, SMS, or messaging notifications
- Critical for backup scripts where silent failure means unprotected data
- Host externally -- if self-hosted on Unraid and Unraid fails, no alert is sent

### Script Repositories

- **awesome-unraid-user-scripts** (GitHub): curated collection organized by category (array, media, health, backups,
  Docker, VMs, security, notifications)
- **TRaSH Collection**: scripts focused on media management and automation
- **DAPS (Drazzilb's Arr PMM Scripts)**: media management and automation collection

## Notification Agents

Configure in Settings > Notifications:

| Agent         | Setup                                                        |
| ------------- | ------------------------------------------------------------ |
| Email         | Built-in, configure SMTP settings                            |
| Browser       | WebGUI notifications, auto-closing timer configurable        |
| Telegram      | Create bot via BotFather, add token in Notification Settings |
| Pushover      | Install app, add API key in Notification Settings            |
| Slack/Discord | Available via third-party notification plugins               |

Alert categories: disk errors, parity issues, temperature warnings, update availability, backup completion/failure,
container health.

## Dynamix Scheduler

Built-in scheduler for system maintenance tasks:

- Parity checks (monthly recommended)
- Mover schedule (default 3:40 AM daily)
- SMART tests (short weekly, extended monthly)
- Configure via Settings > Scheduler
