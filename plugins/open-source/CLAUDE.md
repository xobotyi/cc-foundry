# open-source Plugin

Open-source contribution discipline: structured issue creation and pull request submission for external projects.

## Skills

| Skill             | Purpose                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `issue-writing`   | Issue creation for external repos: bug reports, feature requests, preparation pipeline, anti-slop verification, gh CLI usage |
| `pr-contribution` | PR submission for external repos: descriptions, titles, fork workflow, contribution compliance, agent-specific discipline    |

## Skill Dependencies

The two skills are complementary but independent. `issue-writing` covers filing issues (bug reports, feature requests).
`pr-contribution` covers submitting code changes (PRs/MRs). Both include their own preparation pipeline (read
CONTRIBUTING.md, search for duplicates, understand project norms).

Neither skill covers the actual implementation work — that comes from `the-coder` and language-specific plugins. Neither
skill covers commit message formatting — that comes from `git-commit`.

## Plugin Scope

This plugin covers the external-facing communication artifacts of open-source contribution — the issues and pull
requests that maintainers see. It does not cover:

- Code generation or implementation (the-coder's domain)
- Commit message formatting (git-commit's domain)
- Internal issue tracking (the-blueprint's domain)
- Maintaining your own OSS projects (out of scope)

Both skills enforce a preparation-first workflow: read the project's guidelines, search for duplicates, verify claims,
then create the deliverable. This pipeline exists because agent-generated contributions are held to a higher standard
than human contributions — projects are actively implementing AI contribution policies.
