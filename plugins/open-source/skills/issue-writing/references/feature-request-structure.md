# Feature Request Structure

Distilled from the arXiv study on developer engagement with feature requests (Pragyan et al., 2025), the CONTRIBUTING.md
Generator template, opensource.guide, and the OpenSSF AI-slop discussion.

## Why Structure Matters

Research on OSS feature requests found that 68% contain natural language defects (ambiguity or incompleteness).
Developers rarely ask clarifying questions — in 39 out of 50 analyzed issues, developers made decisions without seeking
clarification. Requests that follow structured templates get significantly more engagement than free-form submissions.

The burden of clarity falls entirely on the requester. If your request is ambiguous, it will be closed or misinterpreted
— not clarified.

## Title

Clear, descriptive title that identifies the requested capability. Frame as the desired behavior, not a vague wish.

- Good: "Add CSV export option to the analytics dashboard"
- Good: "Support authentication via SAML 2.0 in addition to OIDC"
- Bad: "Export feature"
- Bad: "Better authentication"
- Bad: "Would be nice to have X"

## Body Structure

### 1. Problem or Motivation

Explain the problem you're trying to solve, not the solution you've imagined. Developers prioritize requests that align
with project goals — they assess alignment by understanding your problem, not your proposed solution.

- What are you trying to accomplish?
- Why can't you accomplish it with the current software?
- How does this problem affect your workflow?

**Good:**

```
When analyzing user behavior data, I need to share weekly reports with stakeholders who
don't have access to the dashboard. Currently I have to screenshot charts and paste them
into documents manually, which takes ~30 minutes per report and loses interactive filtering.
```

**Bad:**

```
Please add an export button.
```

### 2. Proposed Solution

Describe the behavior you'd like to see. Be concrete about what the feature does, not how it should be implemented
internally.

- What would the user-visible behavior look like?
- What inputs and outputs are involved?
- How would it integrate with existing features?

### 3. Alternatives Considered

Show you've thought about other approaches. This demonstrates investment and helps developers evaluate trade-offs.

- What workarounds have you tried?
- What other tools or approaches partially solve this?
- Why are those alternatives insufficient?

### 4. Additional Context

Supporting material that strengthens the request:

- **Mockups or wireframes** — even rough sketches clarify intent far better than prose
- **Code snippets** — if proposing an API change, show the desired interface
- **Links to similar implementations** — "Project X solved this with Y" provides concrete reference points
- **Scope suggestion** — who benefits? Power users only? All users? What percentage of the user base?

## What Makes Developers Engage

Research-backed factors that increase the chance of a productive response:

- **Clear problem statement** — developers focus on goal alignment over implementation details
- **Structured format** — template-following requests correlate with constructive responses
- **Implementation cues** — mockups, code snippets, or links to similar projects lower cognitive load and demonstrate
  commitment
- **Scope awareness** — showing the feature benefits the broader user base, not just your edge case
- **Project alignment** — framing the request in terms of the project's existing goals and direction

## What Gets Requests Closed Immediately

- **Duplicate** — the feature was already requested. Always search first.
- **Out of scope** — the feature doesn't align with the project's goals or direction
- **Already exists** — the functionality is available but the requester didn't find it
- **Security/privacy concern** — the feature would introduce vulnerabilities or legal issues
- **No justification** — "please add X" with no explanation of why

## What Not to Do

- Do not frame feature requests as demands or complaints
- Do not claim urgency without justification
- Do not submit vague one-liners — they will be closed without discussion
- Do not propose solutions without explaining the problem they solve
- Do not submit AI-generated feature requests without verifying every claim against the project's actual state
