# Anti-Slop: What Maintainers Hate About AI-Generated Issues

Distilled from Daniel Stenberg's "Death by a thousand slops" (curl), the OpenSSF AI-SLOP working group discussion, Ars
Technica coverage of the curl HackerOne situation, and the GitHub community discussion on low-quality contributions.

## The Problem

Open-source maintainers are drowning in low-quality, AI-generated issues and vulnerability reports. By mid-2025, only
~5% of curl's bug bounty submissions were genuine vulnerabilities, with ~20% identified as AI-generated slop. Curl ended
their bug bounty program entirely in January 2026. Node.js raised HackerOne signal requirements after receiving 30+
AI-slop reports during maintainer holidays.

The emotional toll is real. Validating a single slop report engages 3-4 people for 30 minutes to 3 hours each. For
volunteer maintainers with limited hours, this is devastating.

## How Maintainers Spot AI Slop

Detection relies on "vibes" and pattern recognition. There is no reliable technical indicator, but these patterns are
strong signals:

**Stylistic markers:**

- Overly polished presentation — perfect English, excessively polite tone, heavy use of bold and bullet points. "An
  ordinary human never does it like that in their first writing."
- Frequent em dashes and specific vocabulary ("delve", "comprehensive", "robust")
- Alarmist tone that exceeds what the technical details warrant
- Answering questions nobody asked (e.g., defining basic terms, explaining how to use git)

**Structural markers:**

- Non-working or fictitious proof of concepts that fail when actually tested
- Claims that software "always crashes" when it never does
- Citing functions, files, or APIs that do not exist in the project
- Patches that don't apply to the current version
- Reporting intended behavior as a vulnerability due to not reading documentation
- Generic descriptions that could apply to any project, with no project-specific evidence

**Process markers:**

- Accidentally including the AI prompt in the submission (observed: "make it sound alarming")
- Inability to answer follow-up questions about the reported issue
- Suggesting fixes for a different project or tool than the one being reported to

## What This Means For Agents Writing Issues

**You are exactly the kind of actor that creates slop.** An AI agent that generates an issue without deep verification
is indistinguishable from the actors destroying maintainer trust and causing burnout. The bar for AI-generated
contributions is higher than for humans, not lower.

Projects are actively implementing policies against AI-generated contributions:

- **LLVM**: requires human review, understanding, and ability to explain all AI-generated content
- **Selenium**: requires AI assistance disclosure
- **Django**: requires AI disclosure
- **Multiple projects**: ban reporters who submit suspected AI slop

The only defense against producing slop is genuine verification:

- Every factual claim must be verified against the actual codebase, not recalled from training data
- Every reproduction step must be tested, not generated from patterns
- Every function, file, or API reference must be confirmed to exist in the current version
- Every piece of evidence must come from actual observation, not plausible inference

## The Verification Standard

Before submitting any issue, verify:

- [ ] You have actually reproduced the bug (not inferred it should exist)
- [ ] Every file/function/API you reference exists in the current version
- [ ] Your reproduction steps work when followed literally
- [ ] Your expected behavior matches the project's documented behavior
- [ ] You have read the project's CONTRIBUTING.md and issue templates
- [ ] You have searched for duplicates (open AND closed issues)
- [ ] You are not reporting documented or intended behavior as a bug
- [ ] Your description contains project-specific evidence, not generic claims
