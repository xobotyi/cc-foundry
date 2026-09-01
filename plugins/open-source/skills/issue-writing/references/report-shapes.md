# Report Shapes

Titles and bodies for the three report kinds.

The project's own template overrides everything here. Use these shapes where no template exists, and to decide what goes
in a template's free-text fields.

## Titles

A title is a triage decision made in one line. Describe the observable problem, not the suspected cause.

- Weak: "Software crashes" → Strong: "Cancelling a file-copy dialog crashes the file manager"
- Weak: "JSON output is broken" → Strong: "`--output json` produces invalid JSON when a field contains a newline"
- Weak: "Bug in the parser" → Strong: "Parser rejects a trailing comma in arrays after upgrading to 3.2.0"
- Weak: "Better authentication" → Strong: "Support SAML 2.0 alongside the existing OIDC provider"

Name the component where the project's other titles do. Keep the distinguishing detail early, since trackers truncate.

## Bug report

Lead with what a maintainer needs to decide whether to act.

**Description** — one paragraph: what breaks, in what context, on what version.

**Steps to reproduce** — numbered, each naming the action, starting from a clean environment with default configuration.
Include setup that is not obvious: environment variables, feature flags, required data.

```
1. Install v2.4.1 in a clean profile
2. Create input: printf 'line1\nline2\n' > test.txt
3. Run: tool process test.txt --format json
4. Pipe the output to a validator: ... | jq .
```

**Expected result** — what should happen, concretely. "Valid JSON with newlines escaped as `\n` inside string values",
not "it should work".

**Actual result** — what happened, with the error text copied verbatim rather than paraphrased. Separate what you
observed from what you infer.

**Reproducibility** — always reproducible, intermittent, or seen once. Where intermittent, give attempts and successes.

**Environment** — software version or commit, runtime version, operating system and version, and any configuration that
matters. Say whether you tested the latest release.

**Minimal reproducible example** — reduced until removing anything more makes the defect vanish, and confirmed still
failing after reduction. This is the element developers rate most useful and reporters find hardest, so it is where the
effort pays.

**Regression boundary** — where the behavior used to work, give last known good and first known bad version.

Leave out root-cause speculation you have not verified in the source. A wrong diagnosis costs a maintainer more than no
diagnosis, because they have to disprove it.

## Feature request

Judged on fit with project direction, so lead with the problem rather than the solution.

**Problem** — what you are trying to accomplish, why the current software prevents it, and what it costs you. Concrete:
"sharing weekly reports with stakeholders who have no dashboard access means screenshotting each chart", rather than
"there is no export".

**Desired behavior** — what the user-visible result would be. Inputs, outputs, and how it fits existing features.

**Alternatives tried** — workarounds attempted and why they fall short. This is what separates a request from a wish.

**Scope** — who else this affects. A request framed around one user's edge case is easy to decline.

**Supporting material** — a mockup, a code sketch of the desired interface, or a link to how another project solved it.

Expect no conversation. Clarifying questions are uncommon, so the request has to stand on its first reading.

## Vulnerability report

Goes to the private channel, never the public tracker. Expect a higher bar than a bug report.

- The affected version, tested against the latest release.
- A minimal reproducer.
- Evidence that the finding is real, at whatever bar the project sets. Some demand proof of exploitation and reject
  scanner or AI output without it; that is their stated policy rather than a universal prerequisite.
- Impact stated in terms of what an attacker gains, without a severity score the project did not ask for.
- One finding per report.
- Plain text in the body; attachments delay triage in projects that say anything about it.

Do not publish anything — including a commit, a test, or a question in a public issue — before the project's coordinated
disclosure completes.

## Filling someone else's template

- Fill every field. Where the answer is genuinely unavailable, write what you do know and why the rest is missing.
- Do not delete sections. The diff against the template is visible.
- Check only the checkboxes that are true. A falsely checked "I have searched existing issues" is a false statement
  about work not done.
- Where the template asks for AI disclosure, answer it plainly.
