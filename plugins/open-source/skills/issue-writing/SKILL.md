---
name: issue-writing
description: >-
  Open-source issue creation: bug reports, feature requests, and structured
  contribution communication. Invoke whenever task involves any interaction with
  issues in external repositories — filing bugs, proposing features, reporting
  problems, or preparing issue content for open-source projects.
---

# Issue Writing

**Every issue you file costs maintainer time. Earn that time with evidence, not prose.**

Open-source maintainers are volunteers. A single low-quality issue engages 3-4 people for up to 3 hours each. AI-
generated "slop" — vague, unverified, polished-but-empty reports — has driven projects to shut down bug bounties, ban
reporters, and implement strict contribution policies. You are an AI agent — the exact actor these policies target. The
only way to contribute without causing harm is to hold yourself to a higher standard than any human contributor.

## References

- **Bug report structure** — `${CLAUDE_SKILL_DIR}/references/bug-report-structure.md` Title formulas, body template, MRE
  construction, regression info, supporting evidence guidelines
- **Feature request structure** — `${CLAUDE_SKILL_DIR}/references/feature-request-structure.md` Problem-first framing,
  proposed solution, alternatives, research on what drives developer engagement
- **Anti-slop patterns** — `${CLAUDE_SKILL_DIR}/references/anti-slop.md` How maintainers detect AI slop, stylistic and
  structural markers, project policies against AI contributions, verification checklist

## Preparation Pipeline

Before writing a single word of an issue, complete every step.

<preparation>

### 1. Read Project Guidelines

- Read `CONTRIBUTING.md` (check root, `docs/`, and `.github/` directories)
- Read issue templates in `.github/ISSUE_TEMPLATE/` — if templates exist, you must use them
- Read `CODE_OF_CONDUCT.md` if present
- Check for AI contribution policies. Projects like LLVM, Selenium, and Django require human review and explanation of
  all AI-generated content. Some ban autonomous agent contributions entirely. If the project prohibits AI-generated
  contributions, **stop and inform the user** — do not file the issue.
- Do not file issues against items labeled "good first issue" — these are reserved for humans learning the project
- Note the project's communication norms: formal vs. casual, expected detail level

### 2. Search for Duplicates

Search the project's issue tracker for both **open and closed** issues. Use multiple search terms — the same problem is
often described differently by different people.

```bash
# GitHub CLI duplicate search
gh issue list -R owner/repo --search "keyword" --state all --limit 30
```

If you find a related issue:

- **Exact duplicate (open)** — do not create a new issue. Add useful new information as a comment if you have it.
- **Exact duplicate (closed)** — check why it was closed. If the fix didn't work or the problem recurred, reference the
  closed issue in your new one.
- **Related but different** — proceed, but reference the related issue to show awareness.

### 3. Verify the Problem

- Confirm you are using the latest release or the development branch
- Reproduce the bug with precise steps — if you cannot reproduce it, you cannot report it
- Eliminate local environment issues: test in a clean environment, default configuration, fresh profile
- For feature requests: verify the feature doesn't already exist in documentation or configuration

### 4. Gather Evidence

Collect concrete evidence before writing:

- Exact error messages, stack traces, or log output
- Version numbers (software version, OS, runtime, relevant dependencies)
- Screenshots or screen recordings for visual issues
- A minimal reproducible example if reporting a bug

</preparation>

## Writing the Issue

### Issue Type: Bug Report

Follow the project's issue template if one exists. If not, use this structure:

**Title:** Concise description of the observable problem (~10 words). Describe what breaks, not what you think causes
it.

- Good: "`--output json` flag produces invalid JSON when input contains unicode"
- Bad: "JSON output is broken"
- Bad: "Bug in the parser"

**Body:**

1. **Description** — one paragraph expanding the title. Include software version and environment.
2. **Steps to reproduce** — numbered, precise steps. Each step describes action and intent.
3. **Expected result** — what should happen. Be concrete.
4. **Actual result** — what happens instead. Include exact error messages. Separate facts from speculation.
5. **Environment** — OS, version, runtime, relevant configuration.
6. **Minimal reproducible example** — if applicable, the smallest possible code/config that triggers the bug.

For detailed structural guidance, read the bug report reference.

### Issue Type: Feature Request

**Title:** Describe the desired capability, not a vague wish.

- Good: "Add SAML 2.0 support alongside existing OIDC authentication"
- Bad: "Better authentication"

**Body:**

1. **Problem or motivation** — what you're trying to accomplish and why you can't today. Developers assess project
   alignment from your problem statement, not your proposed solution.
2. **Proposed solution** — concrete description of the desired behavior.
3. **Alternatives considered** — what else you tried or considered, and why those are insufficient.
4. **Additional context** — mockups, code snippets, links to similar implementations in other projects.

For detailed structural guidance and research on what drives developer engagement, read the feature request reference.

## Verification Gate

Before submitting, every item must pass.

<verification>

**Factual accuracy:**

- Every file, function, or API you reference exists in the current version of the project — verified by reading the
  source, not recalled from memory
- Every reproduction step works when followed literally in a clean environment
- Version numbers and environment details are accurate and current
- Error messages are copied verbatim, not paraphrased

**Completeness:**

- The issue follows the project's template if one exists
- The title is specific enough that a maintainer can triage without reading the body
- Expected and actual results are both stated explicitly (for bugs)
- The problem statement explains motivation, not just the desired feature (for feature requests)

**Anti-slop:**

- The issue contains project-specific evidence, not generic descriptions
- You are not reporting documented or intended behavior as a bug
- You have not included analysis or root-cause speculation you cannot verify
- The tone is factual and direct — no filler, no excessive politeness, no alarmism
- No AI-typical markers: avoid em-dash heavy prose, "delve", "robust", "comprehensive", "It's worth noting"
- You are not answering questions nobody asked or explaining things the maintainer already knows

</verification>

## User Approval Gate

**Do not create the issue until the user explicitly approves it.** After completing the verification gate, present the
full draft to the user — title, body, labels, and target repository. Wait for explicit approval before executing
`gh issue create` or any equivalent action. The user may request changes; iterate until approved.

## GitHub CLI Mechanics

When creating issues via `gh`:

```bash
# Create with template (preferred — respects project conventions)
gh issue create -R owner/repo --template "bug_report.md"

# Create with explicit fields
gh issue create -R owner/repo \
  --title "concise problem description" \
  --body "structured body content" \
  --label "bug"

# Create from a file (for longer issues)
gh issue create -R owner/repo \
  --title "concise problem description" \
  --body-file issue-body.md
```

Use `--template` when the project has issue templates — this provides information in the structure maintainers expect.
Some projects use YAML-based issue forms (`.github/ISSUE_TEMPLATE/*.yml`) which enforce structured fields — fill every
required field.

List available templates:

```bash
# List issue templates via GitHub API
gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE --jq '.[].name' 2>/dev/null

# Or browse the repository directory directly
gh browse -R OWNER/REPO -- .github/ISSUE_TEMPLATE
```

## Communication Principles

- **Be factual, not dramatic.** "The function returns null" — not "This critical vulnerability causes a catastrophic
  failure."
- **Be concise, not exhaustive.** Include what's needed to understand and reproduce. Omit everything else.
- **Be specific, not generic.** Every sentence should contain information that applies to this project and this issue,
  not to software in general.
- **Show work, not polish.** A rough but verified reproduction is worth more than a beautifully formatted guess.
- **Respect scope.** One issue per bug. One issue per feature request. Do not combine.

## Worked Example

<example>

**Scenario:** You discovered that a CLI tool's `--format json` flag outputs invalid JSON when a field contains a newline
character.

**Preparation:**

1. Read CONTRIBUTING.md — found: "Use the bug report template. Include version output."
2. Searched issues — found #342 (closed, different cause: unicode in filenames). No exact duplicate.
3. Reproduced: `echo -e "line1\nline2" | tool --format json` → output contains unescaped newline in JSON string.
4. Verified on latest release (v2.4.1) with default config.

**Title:** `--format json` produces invalid JSON when field values contain newlines

**Body:**

```
**Version:** v2.4.1 on macOS 14.5 (Apple Silicon)

**Description**
The `--format json` flag produces output with unescaped newline characters inside
JSON string values, resulting in invalid JSON that breaks downstream parsers.

**Steps to reproduce**
1. Install tool v2.4.1
2. Create input: `echo -e "line1\nline2" > test.txt`
3. Run: `tool process test.txt --format json`
4. Pipe output to a JSON validator: `tool process test.txt --format json | jq .`

**Expected result**
Valid JSON with newlines escaped as `\n` inside string values.

**Actual result**
jq exits with error: `parse error (Invalid string) at line 3, column 0`.
Raw output contains a literal newline inside the JSON string value.

**Minimal reproducible example**
[attached as gist: link]
```

</example>

## Integration

- **pr-contribution** — sibling skill. Use when submitting code changes. If filing an issue and then implementing the
  fix, invoke both skills sequentially.

## Critical Rules

- **Never file an issue you cannot verify.** If you haven't reproduced the bug, don't report it. If you haven't
  confirmed the feature doesn't exist, don't request it.
- **Never reference code you haven't read.** Every function name, file path, and API endpoint in your issue must come
  from reading the current source — not from training data, not from similar projects, not from assumption.
- **Always use project templates when available.** Ignoring templates signals that you didn't read the contribution
  guidelines.
- **Always search before filing.** Duplicate issues waste maintainer time and erode trust.
- **Never include unverified root-cause analysis.** Speculation about why a bug occurs, when wrong, actively misleads
  maintainers. Report what you observe. Let maintainers diagnose causes.
- **Never create without approval.** Present the complete draft to the user and wait for explicit approval before
  submitting.
