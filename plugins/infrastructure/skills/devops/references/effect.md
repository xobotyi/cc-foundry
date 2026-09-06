# Applied Is Not In Effect

The check that separates a change written to a target from a change the target is running, by class. A tool's success
status is control-plane evidence; the checks below are the data-plane evidence that closes a change. Every command is a
read; none of them mutates.

## systemd units

- **A unit file edited on disk is invisible to the manager until `systemctl daemon-reload`.** `daemon-reload` reruns
  generators, reloads every unit file, and rebuilds the dependency tree. `systemctl cat <unit>` shows the files on disk,
  which can differ from what the manager runs. Check: `systemctl show -p FragmentPath,ExecStart <unit>` against
  `systemctl cat <unit>`.
- **`systemctl reload` reloads the service's own configuration, not the unit file**, and fails on a unit with no
  `ExecReload=`. Check `systemctl show -p CanReload <unit>` first; `reload-or-restart` restarts a unit that cannot
  reload and starts one that is stopped; `try-reload-or-restart` does nothing to a stopped unit.
- **Enabled and active are orthogonal.** A deploy that only enables leaves the service down until reboot; one that only
  starts loses it at reboot. Check both `systemctl is-enabled <unit>` and `systemctl is-active <unit>`.
- **A drop-in appends to a list-valued directive unless the list is cleared first.** A second `ExecStart=` without an
  empty `ExecStart=` line yields two commands, not a replacement. `systemctl cat <unit>` shows every merged fragment.
  `systemctl edit` performs the `daemon-reload` itself; a hand-written file under `/etc/systemd/system` does not.
- **Compare the process start time to the config mtime** when a reload is in doubt:
  `systemctl show -p ExecMainStartTimestamp <unit>` against `stat` on the file.

## Daemons with a config test

Run the validator before the reload, in the same step, and read the effective configuration after it. A daemon that
reloads a bad file keeps the old one running (nginx rolls back on reload failure); a daemon that is restarted with a bad
file stays down.

- **nginx**: `nginx -t` validates and opens referenced files; `nginx -T` dumps the effective configuration. A file edit
  has no effect until reload or restart.
- **sshd**: `sshd -t` checks syntax and keys; `sshd -T -C user=U,host=H,addr=A` prints the effective configuration for
  one connection, resolving `Match` blocks. For each keyword the first value obtained wins, and only a subset of
  keywords is legal inside `Match`; an illegal one is ignored, not rejected.
- **sshd under socket activation (Ubuntu 22.10 and later)**: the listener is `ssh.socket`. On 22.10 through 23.10,
  `Port` and `ListenAddress` in `sshd_config` are ignored; the port lives in `/etc/systemd/system/ssh.socket.d/*.conf`
  as `ListenStream=`, with an empty `ListenStream=` line first to clear the default. On 24.04 and later a generator
  reads them from `sshd_config`, and a `daemon-reload` is still required. Check: `ss -lntp` shows who listens where.
- **HAProxy** `haproxy -c -f <file>`; **Caddy** `caddy validate --config <file>`; **Unbound** `unbound-checkconf`;
  **Postfix** `postfix check`, and reload with `postfix reload`, never stop then start.
- **Keep the session that made an sshd, firewall, or auth change open** until a second session has authenticated through
  the new configuration.

## Firewalls

- **nftables**: `nft -c -f <file>` parses without applying. `nft -f <file>` with `flush ruleset` at the top replaces the
  whole ruleset in one kernel transaction (`flush ruleset` from Linux 3.17; `flush table` leaves sets in place). Check:
  `nft list ruleset`.
- **A firewall change that can cut the operator off gets a timed revert.** `iptables-apply` applies a ruleset, prompts
  over the same link, and rolls back after the timeout (default 10 s) when the prompt cannot be answered. For nftables
  the equivalent is a scheduled restore of the saved ruleset that the operator cancels after confirming access.
- **ufw** does not flush chains when adding or removing a rule but does when modifying one or changing a default policy.
  Check: `ufw status verbose` and the underlying `iptables -L -n`.

## Containers and Compose

- **`docker compose up` does not pull an unchanged tag.** The default pull policy is `missing`; a tag that moved on the
  registry is not fetched, and the run reports success on the stale image. `pull_policy: always`, `daily`, `weekly`, or
  `every_<duration>` in the service, or `--pull always` on `up`, changes that. Check: `docker compose pull`, then
  compare `docker image inspect --format '{{.RepoDigests}}' <image>` before and after. A digest reference pins the
  image; a tag never does.
- **`docker compose up -d` returns before containers are running or healthy.** A container that exits at once is not
  reflected in the exit status. `--wait` waits for running or healthy, bounded by `--wait-timeout`. Check afterwards:
  `docker compose ps` and `docker compose logs`.
- **Short-form `depends_on` orders creation only.** Compose does not wait for the dependency to be healthy unless the
  long form names `condition: service_healthy` (or `service_completed_successfully`), which needs a `healthcheck` on the
  dependency.
- **A `.env` change reaches a container only on recreation.** Environment is baked in at creation; a restart reuses the
  container. `up` recreates when the service configuration or image changed; `--force-recreate` forces it. Check:
  `docker inspect --format '{{.Config.Env}}' <container>`.
- **`restart: unless-stopped` yields to a manual stop across reboot**; `always` does not. Check:
  `docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' <container>`.

## Kubernetes

- **`kubectl apply` returns when the API server accepts the object, not when the rollout completes.** Check:
  `kubectl rollout status deploy/<name> --timeout=<duration>`; a failed rollout surfaces as `ProgressDeadlineExceeded`
  after `progressDeadlineSeconds`, with the new ReplicaSet at 0 ready.
- **A ConfigMap change does not restart pods.** A volume-mounted key updates after the kubelet sync period plus the
  cache propagation delay; a `subPath` mount never updates; a key consumed as an environment variable never updates
  without a pod restart. `immutable: true` (v1.19 and later) blocks updates entirely. Check: `kubectl exec` and read the
  mounted file, versus `kubectl exec -- env`.
- **Argo CD `Synced` means the manifests match; `Healthy` means the workload works.** Read both columns, or
  `argocd app wait --health`. A resource with no health assessment can sit in `Progressing` indefinitely.
- **Flux `Ready` means applied, and healthy only if `wait: true` or `healthChecks` are set.** Without them, `Ready` is
  true while pods crash-loop. Check: `flux get kustomizations` and the applied revision in the status.
- Controller semantics (prune, self-heal, ignored fields, sync ordering, drift cycles) are in
  [`${CLAUDE_SKILL_DIR}/references/gitops.md`].

## Virtual machines (Proxmox VE)

- **`qm set` on a running VM can write a value that is not live.** A setting that cannot apply while the VM runs is
  stored as pending and applied at the next stop and start. `qm config <vmid>` shows the configuration with pending
  values applied; `qm config <vmid> --current` shows what runs; `qm pending <vmid>` shows both. `qm set --revert <key>`
  drops a pending change. Containers carry the same model: `pct config --current`, `pct set --revert`.
- **Hotplug covers disks, NICs, USB, CPU, and memory only**, and CPU and memory need hotplug enabled plus guest-side
  support. Check the guest's own view after a change, not only the host's.

## DNS

- **A record change is invisible to a resolver until its cached copy expires.** The authoritative zone is correct while
  clients still reach the old address. Check the truth with `dig @<authoritative> +norecurse <name>` and what clients
  see with `dig @<resolver> <name>`; the answer's remaining TTL says how long the old value survives.
- **A name that was queried before it existed is negatively cached** for min(SOA `MINIMUM`, SOA TTL) per RFC 2308; one
  to three hours is the recommended range and over a day is documented as problematic. Creating the record does not make
  it visible until that expires.
- **Lower the TTL one old-TTL period before a change** (RFC 1912 §2.2), make the change, verify, then raise it.

## TLS certificates

- **A renewed certificate on disk is not the certificate being served** until the process reloads it. certbot runs
  `--deploy-hook` once per successfully issued certificate, including renewals, and `--post-hook` after every attempt;
  hooks also load from `/etc/letsencrypt/renewal-hooks/{pre,deploy,post}`. Caddy renews and reloads in-process. Check
  the served certificate, never the file:
  `openssl s_client -connect <host>:443 -servername <host> -showcerts </dev/null | openssl x509 -noout -serial -dates`
  and compare the serial to the renewed file.
- **Six-day certificates** (Let's Encrypt `shortlived` profile, 160 hours) must renew every two to three days with a
  client that runs at least daily; a weekly timer cannot keep one alive. They carry no OCSP or CRL URL.

## WireGuard

- **Editing the `.conf` does not touch the running interface.** `wg setconf` replaces the configuration and drops peer
  sessions; `wg syncconf <iface> <(wg-quick strip <iface>)` applies only the differences without disrupting sessions;
  `wg-quick down` then `up` drops every tunnel. Check: `wg show <iface>` for the live peers and endpoints.

## Configuration management and provisioning

- **Ansible `ok` and `changed` are claims by the module**, and a handler is skipped on a host where a later task failed.
  The ansible skill owns the detail; the check that closes the change is the service-level one above, not the play
  recap.
- **Terraform and OpenTofu apply is not transactional.** On error the state is updated with whatever changed and the
  apply exits; the infrastructure is half-changed. Check: `terraform plan -detailed-exitcode` (0 no diff, 1 error, 2
  diff) after the apply, and `terraform apply -refresh-only` to reconcile state with reality. A plan made with
  `-refresh=false` ignores external changes and can be confidently wrong.
- **A provider's create success is control-plane evidence.** Cross the new path with the identity and protocol the real
  consumer uses: a request through the new route, a login through the new auth rule, a query through the new endpoint.

## Telemetry

- **An OpenTelemetry Collector receiver, processor, exporter, connector, or extension configured but not listed in a
  `service` pipeline is not enabled.** The config validates and no signal flows. Check for the emitted data, not the
  config.
- **A host has no metrics because Prometheus exists.** node_exporter and its enabled collectors, cAdvisor for
  containers, kube-state-metrics for objects, and snmp_exporter or a probe for network devices are separate scrape
  targets; the deliverable names the target and the series that proves the change.
