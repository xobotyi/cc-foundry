---
name: pr-contribution
description: >-
  Open-source pull request creation: PR descriptions, titles, fork workflows,
  and contribution compliance. Invoke whenever task involves any interaction
  with pull requests for external repositories — contributing code, opening PRs
  from forks, writing PR descriptions, or preparing changes for upstream
  submission.
---

# PR Contribution

**Every PR is a proposal to a stranger's codebase. Respect their time, follow their rules, prove your change deserves to
exist.**

Agent-generated PRs are rejected more often than human PRs — not because the code is wrong, but because they lack
context, violate implicit norms, and burden maintainers with unnecessary review work.

## References

- **PR descriptions** — `${CLAUDE_SKILL_DIR}/references/pr-descriptions.md` Full description anatomy:
  summary/body/metadata structure, templates, anti-patterns, scaling description depth to change size
- **Agent PR quality** — `${CLAUDE_SKILL_DIR}/references/agent-pr-quality.md` Why agent PRs get rejected: seven
  agent-only failure modes, measurable quality gaps, implicit knowledge problem, trust-building signals
- **Fork workflow** — `${CLAUDE_SKILL_DIR}/references/fork-workflow.md` Fork setup, branch discipline, upstream sync,
  pre-submission cleanup, gh CLI submission, review response protocol
- **Contribution compliance** — `${CLAUDE_SKILL_DIR}/references/contribution-compliance.md` CLAs, DCOs, project
  guideline discovery, AI contribution transparency

## Preparation Pipeline

Before writing any code or opening any PR, complete these checks. Skipping preparation is the primary cause of
rejection.

### Read the Project

- Read `CONTRIBUTING.md` — it is authoritative. Follow every instruction it contains.
- Read `README.md` for project vision, scope, and setup
- Read `CODE_OF_CONDUCT.md` if present
- Check for a PR template (`.github/pull_request_template.md`) — you must use it

### Check for Duplicates

- Search open AND closed issues for the problem you are solving
- Search open AND closed PRs for similar changes
- If a related issue exists, comment on it before starting work
- If a related PR was rejected, understand why before attempting the same change

### Understand Project Norms

- Read 3-5 recent merged PRs to learn:
  - Title conventions (imperative mood? conventional commits? ticket references?)
  - Description depth and structure
  - Commit message style
  - Review turnaround expectations
- Identify the project's code style: linter configs, `.editorconfig`, formatting tools
- Check CI configuration to understand what automated checks will run

### Verify Legal Requirements

- Determine if the project requires a CLA or DCO sign-off
- If CLA: sign it before submitting (check for CLA bot on existing PRs)
- If DCO: add `Signed-off-by` trailer to every commit (`git commit -s`)
- If contributing on behalf of an employer, verify corporate CLA coverage

### Scope the Change

- For non-trivial changes, open an issue first to discuss the approach with maintainers
- Do not solve issues labeled "good first issue" — these are reserved for humans learning the project
- One logical change per PR — never bundle unrelated fixes
- Separate refactoring from behavioral changes into distinct PRs
- Keep PRs small: 100 lines is reasonable, 1000 lines is almost always too large. Reviewers can reject a change solely
  for being too large.
- When splitting large work, use concrete strategies: split by layer (model/API/client), split by feature (vertical
  slices), or stack dependent changes as a series of PRs
- If work requires multiple PRs, state the plan in the first one
- Include related test code in the same PR as the code change — do not submit tests separately unless they are
  independent validations of pre-existing code

## PR Titles

The title is the first thing a reviewer reads — it determines whether they engage now, later, or never.

**Rules:**

- Use imperative mood: "Fix", "Add", "Remove" — not "Fixed", "Adding", "Removed"
- Describe **what** the change does, not what area it touches
- Be specific enough to distinguish from other PRs in the same project
- Keep under ~70 characters when possible
- Match the project's title convention (check recent merged PRs)
- Include ticket/issue references if the project convention expects them in titles

**Calibration examples:**

<examples>

- Bad: "Fix bug"
- Good: "Fix login button unresponsive on Safari"

<!-- -->

- Bad: "Update CSS"
- Good: "Refine grid layout for mobile responsiveness"

<!-- -->

- Bad: "Changes for tax calculation"
- Good: "Add Swiss tax calculation for new regulation"

<!-- -->

- Bad: "Phase 1" / "Add patch" / "Various improvements"
- Good: "Add rate limiting to authentication endpoint"

</examples>

If the project uses conventional commits for PR titles:

```
fix(auth): resolve session expiry race condition
feat(api): add rate limiting to public endpoints
docs(readme): update installation instructions for v3
```

## PR Descriptions

The description is a permanent record. It must communicate **what** changed and **why** — not just repeat the diff.

### Required Elements

- **Summary** — one sentence stating what the PR does (imperative mood)
- **Problem** — what was wrong, missing, or needed; link to the issue
- **Approach** — why this solution; mention alternatives if the choice is non-obvious
- **Testing** — how changes were verified

### Conditional Elements

- **Trade-offs** — known limitations or deferred work (include when applicable)
- **Visual evidence** — before/after screenshots for UI changes (always include for visual changes)
- **Migration notes** — if the change requires action from others
- **Scope boundaries** — what was explicitly not addressed

### Anti-Patterns

- Do not narrate the diff — "Changed X to Y on line 42" adds nothing
- Do not leave descriptions empty — ever
- Do not use filler language: "This comprehensive PR improves...", "I've made the following enhancements..."
- Do not over-explain trivial changes — a typo fix needs one line
- If a PR template exists, fill every section. Do not delete sections; write "N/A" if genuinely not applicable.

For detailed description structure, templates, and scaling guidance, read
`${CLAUDE_SKILL_DIR}/references/pr-descriptions.md`.

## Fork Workflow

When contributing to a repository you do not have write access to:

- Fork the repository, clone your fork, add `upstream` remote pointing to the original
- Never commit to your fork's default branch — create a feature branch for each contribution
- Sync with upstream before starting work and before submitting
- Rebase onto latest upstream before opening the PR to minimize merge conflicts
- Enable "Allow maintainer edits" so maintainers can push small fixes to your branch

For complete fork mechanics and gh CLI commands, read `${CLAUDE_SKILL_DIR}/references/fork-workflow.md`.

## User Approval Gate

**Do not create the pull request until the user explicitly approves it.** After completing the pre-submission checklist,
present the full draft to the user — title, description, target repository, base branch, and any labels. Wait for
explicit approval before executing `gh pr create` or any equivalent action. The user may request changes; iterate until
approved.

## GitHub / gh CLI

When the target project is on GitHub, use `gh` for PR creation:

```bash
# Check for existing PRs and issues first
gh search prs --repo OWNER/REPO "keywords" --state all
gh search issues --repo OWNER/REPO "keywords" --state all

# Create PR from fork
gh pr create \
  --title "Fix login timeout on slow connections" \
  --body "$(cat pr-description.md)" \
  --base main

# Create draft PR for early feedback
gh pr create --draft --title "[WIP] Add rate limiting" --body "..."

# Check CI status after submission
gh pr checks
```

For non-trivial changes, open a draft PR early — before the work is complete. This gets feedback on approach before
heavy investment, and signals to maintainers that you're working on the problem.

## Agent-Specific Discipline

AI agents producing PRs must apply extra rigor to avoid the failure patterns that cause maintainer distrust.

- **Prove the change was requested** — link to an issue, discussion, or maintainer request. PRs that appear from nowhere
  with no connected issue trigger suspicion.
- **Demonstrate understanding** — the PR description must show you understand the problem and the codebase, not just
  that you generated code that compiles.
- **Do not over-engineer** — solve exactly the stated problem. Do not add abstraction layers, configuration flags,
  helper classes, or "comprehensive" features nobody asked for. A five-line fix should not become a new module.
- **Do not produce oversized PRs** — agents tend to generate larger changes than necessary. Split aggressively. If a
  reviewer has to set aside 30+ minutes, the PR is likely too large.
- **Match the project's voice** — mirror the style, terminology, and level of formality you see in the project's
  existing PRs and documentation. Do not use a different register.
- **Review your own output** — before submitting, review the diff as a skeptical maintainer would. Look for: dead code,
  debug artifacts, unnecessary formatting changes, over-catching exceptions, hardcoded values, missing error handling.
- **Respect the project's AI policy** — projects like LLVM, Selenium, and Django require human review and explanation of
  all AI-generated content. Some ban autonomous agent contributions entirely. If the project prohibits AI-generated
  contributions, **stop and inform the user** — do not submit the PR. If no policy exists, be transparent about AI
  assistance when asked.

For detailed rejection data, failure modes, and trust-building strategies, read
`${CLAUDE_SKILL_DIR}/references/agent-pr-quality.md`.

## Worked Example

<example>

**Scenario:** You fixed a bug where the login button becomes unresponsive on Safari when Content Security Policy headers
are strict. Issue #247 reported the problem.

**Preparation:**

1. Read CONTRIBUTING.md — requires: conventional commit titles, DCO sign-off, tests for bug fixes.
2. Searched PRs — no prior attempts to fix #247. Found #201 (closed, related Safari issue, different root cause).
3. Read 3 recent merged PRs — titles use `fix(scope):` format, descriptions use the project template.
4. Verified DCO — `git commit -s` on all commits.
5. Scoped: one logical fix, 47 lines changed (well under review threshold).

**Title:** `fix(auth): resolve login button unresponsive on Safari with strict CSP`

**Description:**

```
## What

Fix login button click handler failing silently on Safari when
Content-Security-Policy headers block inline event handlers.

Closes #247.

## Why

Safari enforces CSP `script-src` more strictly than Chrome/Firefox
for dynamically attached event listeners. The login handler used
`setAttribute('onclick', ...)` which Safari blocks under strict CSP.

## How

Replace `setAttribute('onclick', ...)` with `addEventListener('click', ...)`
in the auth module. This is CSP-compliant across all browsers.

See also #201 (different Safari auth issue, confirmed unrelated).

## Testing

- Added integration test: login flow with strict CSP headers (Safari UA)
- Verified existing auth tests pass
- Manual test on Safari 17.2, Chrome 120, Firefox 121

## Trade-offs

None — `addEventListener` is strictly better here. No behavioral change
for Chrome/Firefox users.
```

</example>

## Integration

- **issue-writing** — sibling skill. Use when filing issues. If reporting a bug and then submitting a fix, invoke both
  skills — file the issue first, then reference it in the PR.

## Pre-Submission Checklist

Before opening the PR, verify:

- [ ] Read CONTRIBUTING.md and followed its instructions
- [ ] Searched for duplicate issues and PRs
- [ ] One logical change per PR — no unrelated bundled changes
- [ ] All existing tests pass
- [ ] New tests cover the changes
- [ ] Code matches project style (linting, formatting)
- [ ] Commit history is clean — no "fixup" or "oops" commits
- [ ] CLA signed or DCO sign-off on all commits (if required)
- [ ] PR title is specific, imperative, matches project convention
- [ ] PR description explains what and why, links to issue
- [ ] PR template filled completely (if one exists)
- [ ] Self-reviewed the diff for accidents (debug code, unrelated changes, secrets)
- [ ] Branch is rebased on latest upstream
- [ ] **Full draft presented to user and explicitly approved before submission**
