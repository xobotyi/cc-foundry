---
name: devops
description: >-
  Carry an infrastructure change from intent to verified effect: what a change must carry before apply, what "applied"
  does not prove, which changes a revert cannot reverse, what a credential can do that the instruction never said, and
  the evidence that closes a change. Not how any one tool is written.
when_to_use: >-
  Invoke whenever infrastructure is changed at all — provisioning, configuring, deploying, upgrading, backing up, or
  operating a host, container, cluster, VM, share, network device, DNS zone, or certificate, with any tool, and before
  the tool's own skill. Also invoke on the symptoms: a change reported success and the target still runs the old
  state, a revert that did not restore, a plan that proposes destroying what should exist, an operator locked out by
  their own change, a backup nobody has restored, a secret in a plan or a log, a certificate renewed but not served,
  or a "done" with no post-apply check behind it. Covers the discipline of the change; how a play, image, VM, or
  ruleset is written belongs to the ansible, containers, proxmox, and networking skills.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

Three biases decide most calls:

- **Applied is not in effect.** A tool's success is a claim the tool makes about its own target. Whether the effect
  exists is measured at the service, the socket, the resolver, the peer, or the guest. A change closes on the
  measurement and never on the claim.
- **A revert is not a rollback.** Re-applying the previous declaration restores what a tool can recreate from a
  declaration and nothing the forward change emitted: deleted data, rotated secrets, withdrawn routes, migrated schemas,
  destroyed objects.
- **The target is decided by the credential and the state the command runs against, not by the code.** A reviewed change
  lands where the kubeconfig, backend, inventory, or token points, and a plan is a projection of one state at one
  moment. Read both before the first mutation.

## Target

- **Name the target by identifiers that cannot be confused**: account or project ID, cluster API endpoint, host key and
  address, backend and workspace, node and VMID, zone ID. `prod` is a label, not a target. GitHub deployed a reviewed
  network configuration to the wrong environment on 2024-03-11.
- **Plan against the state that apply will use, immediately before apply.** Never apply a plan older than the last
  change to the target, and never a plan made with refresh disabled. GitLab applied a three-week-old Terraform plan on
  2023-07-07; drift had turned it into a plan that destroyed 617 resources.
- **A missing or substituted state file is a stop, not a step.** With no state, a plan proposes creating everything;
  with an old state copied in, a destroy looks like the clean option. An agent destroyed a production VPC, database, and
  cluster in February 2026 by reasoning exactly that way.
- **Read the plan for destroy and replace before anything else.** A destroy count above zero on a change that is not a
  destroy, or `# forces replacement` on a stateful resource, stops the apply until the reason is written down.
- **A blank parameter is a value.** Resolved defaults are part of the plan. Google's internal tool turned one blank
  field into a one-year term and deleted a customer's private cloud a year later, with no notification because the
  deletion was not customer-initiated.
- **Prefer a change that names its objects over a filter that resolves at run time.** Cloudflare's 2026-02-20 cleanup
  called an API with an empty filter; the server returned every prefix and the task deleted them all.
- **Before a firewall, sshd, auth, or routing change, hold an independent way back in**: a second authenticated session,
  a console, or an out-of-band path, plus a timed revert that restores the previous ruleset unless the operator cancels
  it. The SRE workbook's rule for a change that can remove operator control is automatic rollback, or at minimum an
  automatic stop.
- **Capture what the reverse needs before apply**: the previous value, the backup taken with the method the data
  requires, the identifiers, and the consumers of anything renamed. Confirm the credential performing the change cannot
  delete that backup.
- **Use the credential the change needs and no other.** A broader credential found in the environment is not permission.
  An agent with a staging credential mismatch found a token scoped for any operation, guessed that a volume delete would
  stay in staging, and removed a production database and its co-located backups in one call (April 2026). Deletion
  protection on the resource itself is the layer that survives a removed resource block; `prevent_destroy` does not.
- **A prose prohibition does not hold against a token that can.** A code freeze in the instructions did not stop a
  Replit agent from deleting a production database in July 2025. Where the only guard on a destructive path is prose,
  say so and stop; do not proceed under it.

## Apply

- **One change per apply.** A change that bundles concerns cannot be reverted separately or diagnosed separately.
- **Stage where there is traffic to split**, comparing the canary against the rest, on a dozen metrics at most, for long
  enough that the system can react. Where there is nothing to split (one host, one router, one NAS, one control plane),
  the substitute is one object at a time, a wait between objects longer than the delayed-failure window, and the old
  path kept alive until the new one is proven. Azure Front Door's 2025-10-29 configuration crashed the data plane five
  minutes after passing every stage, and by then it had been written into Last Known Good.
- **Apply where the push can be stopped.** A global push with no stage is how a dormant June change withdrew
  Cloudflare's resolver prefixes worldwide in July 2025, and how a feature with no flag crash-looped Google Cloud's
  control plane on 2025-06-12. Google's remediation: every change to a critical binary behind a flag, disabled by
  default.
- **Never disable a validator, a lock, a deletion protection, a health check, or a policy to make an apply pass.** A
  failing safety is a finding about the change, not an obstacle to it.
- **Do not re-run a failed destructive workflow blind.** Run-once guards do not hold across separate runs; Google's
  satellite decommission re-run read an empty machine list as "no constraint" and erased every edge machine. Read the
  state, then decide.
- **A gate that blocks a change must not block its rollback.** The same Google postmortem found a 25 percent delta check
  that let the destructive change through at 23 percent and blocked the restore at 29.
- **Treat generated configuration as untrusted input**: bound its size and cardinality at the consumer. Cloudflare's
  2025-11-18 outage was a feature file that doubled past a hard limit after a permissions change upstream.

## Effect

- **The check names the observable effect and runs on the consumer's path**: the certificate on the socket, the
  resolver's answer, the route in the peer's table, the listening port, the running image digest, the guest's own view,
  a request through the new rule with the identity the real client uses. Provider create, controller `Synced`, Compose
  `up`, and a play recap are control-plane evidence and close nothing.
- **A service loads its configuration when it is told to.** A unit file needs `daemon-reload`; a daemon needs its reload
  after its config test passes; a `.env` change needs recreation; a ConfigMap key in an environment variable needs a pod
  restart; a Proxmox setting that cannot apply live is pending until the next start; sshd on Ubuntu 22.10 and later
  listens where `ssh.socket` says, not where `sshd_config` says.
- **A second run reporting no change proves the tool converged, not that the service works.** Do both.
- **Wait through the propagation window before closing**: kubelet sync, DNS TTL and negative TTL, rollout deadline,
  health-check timeout, the delayed crash. GitHub's Redis load-balancer change on 2026-03-05 was accepted and routed 95
  percent of workflow starts to the wrong hosts.
- **The agent's own report is not evidence.** Capture the command and its output in the deliverable. A Replit agent
  reported rollback impossible when it was not; a Claude Code bug report in December 2025 consisted entirely of the
  agent's apology for running a data-loss flag it had not been asked to run.
- **A change is closed when the monitor that would page on its regression is named and was observed after the change.**
  A host CPU graph does not close a route change; a page must detect an otherwise undetected, urgent, user-visible
  condition that a human can act on.

Read [`${CLAUDE_SKILL_DIR}/references/effect.md`] when closing a change on a systemd unit, a daemon with a config test,
a firewall, Compose, Kubernetes or a GitOps controller, a Proxmox guest, DNS, a certificate, WireGuard, or a
provisioning tool — it carries the read-only check per class and the propagation delays.

## Reversibility

- **A revert reverses declarations.** It does not reverse a schema migration, a rotated secret, an issued certificate, a
  cached DNS answer, a destroyed object, a shrunk volume, a pool feature upgrade, a `pg_upgrade --link`, a CRD storage
  version, a control-plane minor, or firmware. Each of those needs its own captured reverse before apply.
- **Expand, then contract.** Ship the additive step, the code that reads both shapes, and the cutover as separate
  changes; the destructive contraction is last and is not reverted by a code revert.
- **A rollback that was never run against production-shaped objects is a description.** GitHub's 2024-03-11 rollback
  failed in one datacenter on records missing a field the forward path never needed. Exercise the reverse, record the
  date and the duration, and record that the old observable behavior returned.
- **Configuration management has no state to revert to.** Reverting a playbook re-runs forward; the reverse of a change
  is its own converging task. Provisioning state carries the previous shape and never the previous data.

Read [`${CLAUDE_SKILL_DIR}/references/reversibility.md`] when a change touches data, secrets, certificates, DNS,
storage, identifiers, addressing, or a version with an on-disk or API format — it carries whether the reverse exists,
what it costs, and what to capture per class.

## Secrets and credentials

- **State and plan files hold every secret the configuration defined, in plaintext.** `sensitive` redacts output only.
  They never enter Git, a CI artifact, or a PR comment unredacted.
- **A secret on a command line is readable by every user on the host.** Pass it by stdin, environment, or file.
- **Pin every action to a full commit SHA and every image to a digest.** `tj-actions/changed-files` (2025-03-14) and the
  Trivy actions (2026-03-19) had their existing tags repointed at commits that dumped runner memory into public logs;
  every consumer pinned by tag ran the payload. The scanner is in the supply chain too.
- **Rotate a compromised credential in one pass.** Trivy's second compromise came through a rotation spread over days,
  during which a still-valid token exfiltrated the fresh ones.
- **CI reaches a cloud through OIDC with a constrained subject and role**, never a stored long-lived key.
- **Public certificate lifetime is 200 days from 2026-03-15, 100 from 2027-03-15, 47 from 2029-03-15.** Let's Encrypt
  sends no expiry mail and answers no OCSP; the operator's monitor watches the served certificate.

Read [`${CLAUDE_SKILL_DIR}/references/secrets.md`] when a change handles a secret, a token, a CI identity, or a
certificate — it carries the leak surfaces, the credential-scope incidents, the Let's Encrypt profiles and limits, and
the certificate schedule.

## Verification

- **A scanner proves a property of an artifact.** Trivy, checkov, tflint, KICS, conftest, and Kyverno CLI evaluate files
  and plans; goss and testinfra assert host state; cosign proves who signed; SLSA v1.2 levels describe build and source
  integrity. None of them proves that a service answers. Their clean run is a precondition of the effect check, not a
  substitute for it.
- **`plan -detailed-exitcode` is the drift gate** (0 clean, 1 error, 2 drift); a plain plan exits 0 either way.
- **Do not add a dead tool.** terrascan is archived (2025-11-20), tfsec is superseded by Trivy, driftctl is in
  maintenance with no successor.

Read [`${CLAUDE_SKILL_DIR}/references/verification.md`] when choosing, running, or trusting a scanner, a policy engine,
a host assertion, a signing tool, or a native test framework — it carries what each proves, what it cannot see, its
status, and the Terraform and OpenTofu split.

## Recovery

- **A backup is proven by a timed restore whose result was opened.** The deliverable for a stateful change records the
  backup identifier, the restore target, the elapsed time, and the application-level check that passed.
- **A filesystem copy of a running database is not a backup.** The engine's own tool, or an atomic snapshot of the whole
  data directory, is. A VM snapshot is crash-consistent; the guest agent freezes the filesystem, not the application.
- **The keys to the backup and the credential that can delete it are part of the backup.** Store them under a different
  failure domain and a different credential than the data; keep one copy immutable.
- **Parity is not a backup**, and a reconciliation controller does not restore data.

Read [`${CLAUDE_SKILL_DIR}/references/recovery.md`] before a destructive change and when designing or verifying a backup
— it carries the consistency rules per engine, what restic, Borg, vzdump, and proxmox-backup-client capture and skip,
state and key custody, and recovery order. Read [`${CLAUDE_SKILL_DIR}/references/gitops.md`] when Argo CD or Flux is in
the path — it carries what each controller reconciles, ignores, prunes, and what the Argo CD 3.0 defaults changed.

## Deliverable

A change is done when its record carries all of these, and states any it lacks as missing rather than omitting it:

- the target identifiers and the credential scope used;
- the plan or diff, its generation time, and the objects it touches, with destroy and replace counts;
- the effect check, its command, and its output on the consumer's path;
- the second-run result;
- the reverse, exercised, with its duration, or the captured reverse for a class a revert cannot restore;
- for a stateful change, the backup and its restore time;
- the monitor that pages on regression and what it showed after the change.

## Application

When **making** a change, apply these rules silently; do not narrate a rule while following it. Where the target's
existing practice contradicts one, follow the practice for the change at hand and flag the divergence once. Stop and
report rather than proceed when a destructive path is guarded by prose alone, when the plan shows an unexplained
destroy, or when the state does not match the target.

When **reviewing** a change, cite the missing evidence and name the check that would supply it. Do not lecture.

## Integration

This skill governs what a change must carry, how it is applied, and the evidence that closes it. The **ansible**,
**containers**, **proxmox**, and **networking** skills govern how their artifact is written and what it does, and each
wins on that question. The **coding** skill governs the shape of the work. All are active at once; this skill runs once,
across the whole change, not before and after the tool skill.
