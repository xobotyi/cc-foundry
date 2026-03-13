# Vault and Security

## Ansible Vault Overview

Vault encrypts sensitive data (passwords, keys, certificates) so it can live alongside
playbooks in version control. Encryption uses AES-256.

## Encryption Scope

Two levels of encryption:

### File-level encryption

Encrypt an entire file:

```bash
ansible-vault encrypt group_vars/production/vault.yml
ansible-vault decrypt group_vars/production/vault.yml
ansible-vault edit group_vars/production/vault.yml
ansible-vault view group_vars/production/vault.yml
```

### Variable-level encryption (encrypt_string)

Encrypt individual values inline:

```bash
ansible-vault encrypt_string 'supersecret' --name 'db_password'
```

Produces:

```yaml
db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  62313365396662343061393464336163...
```

Use `encrypt_string` when only a few values in a file need protection.

## The vars/vault Pattern

Best practice for managing encrypted variables with visible names:

1. Create `group_vars/<group>/vars.yml` with all variable names (including
   sensitive ones)
2. Create `group_vars/<group>/vault.yml` with the actual secret values,
   prefixed with `vault_`
3. Reference vault values from vars:

```yaml
# group_vars/production/vars.yml
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
ssl_cert_passphrase: "{{ vault_ssl_cert_passphrase }}"

# group_vars/production/vault.yml (encrypted)
vault_db_password: "actual_password_here"
vault_api_key: "actual_key_here"
vault_ssl_cert_passphrase: "actual_passphrase_here"
```

This pattern keeps variable names searchable with `grep` while protecting values.

## Vault IDs

Use vault IDs to manage multiple passwords (e.g., per-environment):

```bash
ansible-vault encrypt --vault-id prod@prompt group_vars/production/vault.yml
ansible-vault encrypt --vault-id dev@prompt group_vars/development/vault.yml

ansible-playbook site.yml --vault-id prod@prompt --vault-id dev@prompt
```

Vault IDs label which password decrypts which content.

## Password Sources

| Method | Command | Use case |
|--------|---------|----------|
| Prompt | `--vault-id @prompt` | Interactive sessions |
| File | `--vault-password-file vault_pass.txt` | CI/CD (file in `.gitignore`) |
| Script | `--vault-password-file vault_pass.py` | Fetch from secrets manager |

## Password Automation

Never type vault passwords manually for every run:

### Password file (local dev)

```bash
echo 'my_vault_password' > .vault_pass.txt
chmod 600 .vault_pass.txt
echo '.vault_pass.txt' >> .gitignore
ansible-playbook site.yml --vault-password-file .vault_pass.txt
```

### Password script (team environments)

```bash
#!/bin/bash
# .vault_pass.sh -- retrieves password from a central secrets manager
vault kv get -field=ansible_vault_password secret/ansible/production
```

### CI/CD pipelines

```yaml
env:
  ANSIBLE_VAULT_PASSWORD_FILE: /tmp/vault_pass.txt
steps:
  - run: echo "$VAULT_PASSWORD" > /tmp/vault_pass.txt
  - run: ansible-playbook site.yml
  - run: rm -f /tmp/vault_pass.txt
```

Store `VAULT_PASSWORD` as a protected pipeline secret, never in scripts.

## External Secret Managers

For enterprise or compliance-heavy environments, shift from static encrypted
vault files to runtime secret fetching via lookup plugins. Secrets are never
stored on disk -- they are fetched at playbook execution time.

### HashiCorp Vault

```yaml
- name: Fetch database password from HashiCorp Vault
  ansible.builtin.set_fact:
    db_password: "{{ lookup('hashi_vault', 'secret/data/db:password') }}"
  no_log: true
```

### AWS Secrets Manager

```yaml
- name: Fetch API key from AWS Secrets Manager
  ansible.builtin.set_fact:
    api_key: "{{ lookup('amazon.aws.aws_secret', 'myapp/api_key') }}"
  no_log: true
```

### When to use external managers vs Ansible Vault

| Scenario | Recommendation |
|----------|---------------|
| Small team, simple setup | Ansible Vault with `vault_` prefix convention |
| Enterprise, compliance requirements | External secret manager with lookup plugins |
| Mixed | Ansible Vault for static config, external manager for rotating secrets |

## Content Signing and Verification

Prevent unauthorized tampering with automation code using cryptographic signing.

### ansible-sign Workflow

`ansible-sign` uses GPG to sign and verify project content:

1. Create `MANIFEST.in` in project root specifying files to protect:
   ```
   include inventory
   recursive-include playbooks *.yml
   ```

2. Sign the project:
   ```bash
   ansible-sign project gpg-sign .
   ```
   Creates `.ansible-sign/sha256sum.txt` (checksum manifest) and
   `.ansible-sign/sha256sum.txt.sig` (detached GPG signature).

3. Verify locally:
   ```bash
   ansible-sign project gpg-verify .
   ```

### Automation Controller Integration

- Add GPG public key as a "GPG Public Key" credential in AAP
- Set the "Content signature validation credential" on the project
- On sync, controller verifies signature and recalculates checksums
- If any file changed, was added, or was removed: project update fails,
  no jobs launch

### Automated Signing in CI

```bash
# Store GPG private key as CI secret, import into GnuPG
export ANSIBLE_SIGN_GPG_PASSPHRASE="${VAULT_GPG_PASSPHRASE}"
ansible-sign project gpg-sign .
```

Exit codes: 0 = success, 1 = general failure, 2 = checksum mismatch,
3 = signature verification failure, 4 = signing process failure.

## CIS Benchmark Automation

### Hardening Roles

Use community-vetted CIS roles (e.g., `ansible-lockdown` project):
- Customization via `defaults/main.yml` or extra vars -- never edit tasks
- Tags for precision: `level1-memberserver`, `level2-domaincontroller`
- Idempotent: rerun at any time to detect and correct configuration drift

### Compliance Scanning

- Integrate OpenSCAP for automated compliance checks and HTML/XML reports
- Build validation playbooks that verify system state against benchmarks
- Run as scheduled jobs in AAP for continuous auditing
- Combine with SIEM/logging integration to prove compliance from Git history

### Security Smells in IaC

Common security anti-patterns detected by linting and scanning:
- Insecure configuration: allowing root login over SSH
- Command injection: unsanitized user input in shell commands
- Credential exposure: plaintext secrets in playbooks
- Outdated dependencies: packages without version constraints
- Path traversal: unvalidated user-supplied file paths

## Audit

Track vault access with a wrapper script that logs who decrypts what and when.
In regulated industries, combine Ansible's audit trails with SIEM/logging
integration to prove infrastructure compliance from Git history.

## Security Practices

### Non-negotiable defaults

- Never store passwords in plain text inventory or variable files
- Never commit vault password files to version control
- Use `no_log: true` on tasks that handle secrets
- Use `ansible_password` and `ansible_become_password` only via Vault

### Principle of least privilege

- Use `become: true` only on tasks that require it, not at the play level
- Prefer `become_user` scoped to specific tasks over blanket root access
- Use SSH key authentication, not password authentication

### Secret rotation

- Rekey vault files when passwords change: `ansible-vault rekey file.yml`
- Rotate vault passwords periodically
- Document which vault IDs correspond to which environments

### Sensitive output

```yaml
- name: Set database password
  ansible.builtin.user:
    name: dbuser
    password: "{{ db_password | password_hash('sha512') }}"
  no_log: true  # prevents password from appearing in output
```
