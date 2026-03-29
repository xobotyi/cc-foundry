# Contribution Compliance

Legal and procedural requirements for contributing to open-source projects. These are non-negotiable — a technically
perfect PR will be rejected if compliance requirements are not met.

## Contributor License Agreements (CLAs)

A CLA is a legal agreement granting the project maintainers rights to license your contribution as part of the project.

### Types

- **Individual CLA (ICLA)** — signed by individual contributors who own the copyright to their work (hobbyists,
  independent developers)
- **Corporate CLA (CCLA)** — required when contributing as part of your employment, since the employer typically holds
  copyright. The corporation assigns a CLA Manager to sign on behalf of the organization.

### How to Handle

- Check if the project requires a CLA — look for CLA bot comments on existing PRs, mentions in CONTRIBUTING.md, or a CLA
  file in the repository
- Common CLA management tools: CLA Assistant, EasyCLA (Linux Foundation), Gerrit
- Sign before or when prompted — CLA bots typically block merge until signed
- If contributing on behalf of an employer, verify your organization has a CCLA in place or get one signed before
  submitting

## Developer Certificate of Origin (DCO)

The DCO is a lightweight alternative to CLAs, created by the Linux Foundation. Instead of signing a legal agreement, you
certify each commit by adding a `Signed-off-by` trailer.

### How to Apply

Add the sign-off to every commit:

```
git commit -s -m "Fix rate limiting logic"
```

This appends `Signed-off-by: Your Name <your@email.com>` to the commit message. The email must match the commit author
email.

To sign off all commits in a branch retroactively:

```
git rebase --signoff HEAD~N   # where N is the number of commits
```

### Enforcement

Projects using DCO typically run the GitHub DCO App, which checks that every commit in a PR contains the `Signed-off-by`
line. PRs with unsigned commits will be blocked.

## CLA vs DCO

- **CLA** — more formal, legally binding, can be a barrier to entry. Used by larger projects with complex legal needs
  (Apache, Google, Microsoft). May require legal team involvement for corporate contributors.
- **DCO** — lighter weight, relies on community trust. Used by Linux kernel, many CNCF projects. Lower barrier but less
  legal protection.

The project chooses which to use — as a contributor, you comply with whatever they require.

## Project Guidelines Discovery

Before contributing, read these files in the repository root (or `.github/` directory):

- **CONTRIBUTING.md** — contribution process, coding standards, PR requirements, template instructions
- **CODE_OF_CONDUCT.md** — behavioral expectations for participants
- **LICENSE** — the project's license (confirms it is actually open source)
- **.github/pull_request_template.md** — PR template you must follow
- **README.md** — project vision, setup instructions, and sometimes contribution notes

If CONTRIBUTING.md exists, treat it as authoritative. Ignoring documented contribution guidelines is the fastest way to
get a PR closed.

## AI Contribution Transparency

The open-source community is actively debating AI-generated contributions. Current best practices:

- If the project has an explicit policy on AI-generated code, follow it exactly
- If no policy exists, be transparent — mention AI assistance if it played a significant role
- Demonstrate understanding of the changes regardless of how they were produced
- Never submit AI-generated code you have not reviewed and tested yourself
- Some projects apply "SLOP" labels or automatically close suspected AI-generated PRs — high-quality, well-explained
  contributions avoid this treatment
