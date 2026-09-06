# Secrets, Credentials, and Certificates

Where a secret leaks that the change did not name, how much authority a credential grants, and the certificate lifecycle
facts that changed in 2025 and 2026.

## Where a secret ends up

- **Terraform and OpenTofu state is plaintext**, and it holds every secret value the configuration defined. Saved plan
  files hold them too. `sensitive = true` redacts output; it does not keep the value out of state. Ephemeral values
  (Terraform 1.10) and write-only arguments (Terraform 1.11) are the constructs that keep a value out of state and plan.
  OpenTofu 1.7 encrypts state and plan at rest instead. Treat state and plan artifacts as secret-bearing: never in Git,
  never in a CI artifact or PR comment without redaction.
- **A secret passed as a command-line argument is readable by every user on the host** through `/proc/<pid>/cmdline` and
  `ps`, because `/proc` is mounted with `hidepid=0` by default. Pass secrets by stdin, environment, or file, and check
  the CI runner's trace mode, which echoes commands.
- **A secret reaches logs and diffs through the tool that consumed it.** Ansible `no_log` suppresses task results but
  not `ANSIBLE_DEBUG` output; Terraform prints values in plan diffs; a GitOps controller writes the rendered manifest
  into the cluster where anyone with read access on the namespace sees it. Diff the artifact, not the source, when
  checking for exposure.
- **A CI runner's memory holds every secret the job was given.** The 2025 `tj-actions/changed-files` and 2026 Trivy
  action compromises both dumped `Runner.Worker` memory to harvest them; the payload was a repointed tag. Scope job
  secrets to the job that needs them, and pin actions by commit SHA.
- **A compromised credential must be rotated atomically.** Trivy's second compromise (2026-03-19) came through a
  rotation that revoked credentials over several days; a still-valid token exfiltrated the freshly rotated ones during
  the window. Revoke everything, then issue everything, in one pass.

## How much a credential can do

- **A credential's scope is the blast radius, whatever the instruction says.** An agent that met a staging credential
  mismatch in April 2026 found a Railway token scoped for any operation, guessed that a volume delete would be limited
  to staging, and removed the production database and the backups on the same volume in one call. A Replit agent in July
  2025 deleted a production database during an explicit code freeze. Prose is not a boundary; the token is.
- **Never use a broader credential than the change needs**, and never use one found lying around. A credential that can
  delete a backup is not a production credential; it is a disaster.
- **CI authenticates to a cloud through OIDC, not a stored long-lived key.** The cloud issues a token valid for one job
  that expires on its own; there is no repository secret to steal. OIDC alone is not least privilege: a trust policy
  that accepts any branch of any repository into an administrator role has the blast radius of the key it replaced.
  Constrain issuer, audience, subject (repository, ref, environment), and the destination role.
- **Vault is source-available (BUSL 1.1 from 2023-08-10), not open source.** OpenBao is the MPL-licensed fork under the
  OpenSSF. **SOPS with age** encrypts values in files committed to Git; the recipients list is the access control and
  the metadata (keys, structure) stays readable. Scan the rendered output as well as the source.

## Certificates

- **Public TLS certificate lifetimes are on a fixed schedule** (CA/Browser Forum ballot SC-081v3, passed 2025-04-11,
  written into the Baseline Requirements): maximum validity 200 days from 2026-03-15, 100 days from 2027-03-15, 47 days
  from 2029-03-15; domain and IP validation reuse 200, 100, and 10 days on the same dates. A manual renewal process
  cannot keep up from the first step; ACME automation with a daily timer is the floor.
- **Let's Encrypt profiles** (page updated 2026-07-14): `classic` 90 days, the default, up to 100 names, CRL URL;
  `tlsserver` 45 days, 25 names, no common name; `shortlived` 160 hours, the only profile that issues IP-address
  certificates (`http-01` and `tls-alpn-01` challenges only), generally available since 2026-01-15, no OCSP or CRL URL.
  Short-lived certificates renew every two to three days with a client that runs at least daily and honours ARI (RFC
  9773).
- **Let's Encrypt sends no expiry emails** (ended 2025-06-04) and **runs no OCSP responder** (off 2025-08-06; CRLs
  replace it, OCSP URLs dropped from certificates 2025-05-07). Expiry monitoring is the operator's; a monitor that reads
  OCSP for Let's Encrypt certificates reads nothing.
- **Rate limits** (page updated 2026-08-05): 5 certificates per exact identifier set per 7 days with no override, 50 per
  registered domain per 7 days, 5 authorization failures per identifier per account per hour, and an account pause after
  1,152 consecutive failures. ARI renewals are exempt from every limit; non-ARI renewals still hit the duplicate limit.
  A renewal loop that retries on failure exhausts the failure limit within an hour.
- **A renewed file is not a served certificate** until the process reloads; the check is the live socket (see
  [`${CLAUDE_SKILL_DIR}/references/effect.md`]). The Bank of England's CHAPS settlement stopped for 91 minutes on
  2024-07-31 on an expired certificate.
