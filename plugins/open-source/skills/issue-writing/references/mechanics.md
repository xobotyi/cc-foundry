# Tracker Mechanics

Templates, forms, the CLI, and the private-reporting path.

## Two kinds of template, and they behave differently

Both live in `.github/ISSUE_TEMPLATE/`.

- **Markdown templates** (`.md`) — prefilled body text. The CLI can use them.
- **Issue forms** (`.yml`) — a YAML-defined structured form with typed elements: `markdown`, `textarea`, `input`,
  `dropdown`, `checkboxes`. The web renders them as fields. **The CLI cannot use them.**

`config.yml` in the same directory controls the chooser: `blank_issues_enabled`, and `contact_links` for routing people
elsewhere. With `blank_issues_enabled: false`, users with Write, Maintain, or Admin still see a **Blank issue** option
labeled **Maintainers only** — so seeing it in a screenshot or a maintainer's workflow does not mean it is available to
you.

**`required` is public-repository-only.** GitHub documents the validation as "Prevents form submission until element is
completed. Only for public repositories." A required field on a private repository's form does not block submission the
same way. This is a statement about web-form validation, not a claim that any programmatic path enforces the same rules
— so never treat "the API accepted it" as evidence the report was complete.

## The CLI defect worth knowing before you run it

`gh issue create --template` takes a **name**, not a filename:

```bash
gh issue create --repo OWNER/REPO --template "Bug Report"
```

And it does not support YAML issue forms at all. `cli/cli#5865`, "Support for issue forms", has been open since 30
June 2022. Against a repository whose templates are `.yml` forms, the CLI can report `no templates found` while the
forms render normally on github.com.

Consequence: check what the repository actually uses before choosing a path.

```bash
gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE --jq '.[].name'
```

- **All `.md`** — `gh issue create --template "Name"` works.
- **Any `.yml` form you need to fill** — do not use `gh issue create`. Prepare the draft for the user to submit through
  the web form, which is the only interface that renders the fields and applies the validation. `gh issue create --web`
  opens it.

Creating an issue through the REST API bypasses form structure entirely — the endpoint takes a `title` and a Markdown
`body`, not a map of form field IDs. Filing that way against a project that publishes a form produces a report that
skips every field the maintainers asked for, which is visible to them.

## Searching for duplicates

Search is an information-retrieval operation, not a duplicate oracle. Vary the vocabulary: the symptom, the exact error
string, and the component name each surface different reports.

```bash
gh search issues --repo OWNER/REPO "keywords" --state all
gh search issues --repo OWNER/REPO "exact error text" --state all
gh issue list --repo OWNER/REPO --search "component" --state all --limit 50
```

Search closed issues as well as open ones. A closed duplicate carries the reason, which is frequently the answer.

## Private vulnerability reporting

Check whether the repository has it enabled before looking anywhere else — GitHub states it is separate from
`SECURITY.md`, and where enabled, anyone may use it without following that file.

The web path is the repository's **Security** tab. Programmatically it is a distinct endpoint from issue creation, under
repository security advisories, requiring `summary` and `description` and a token with repository-security-advisory
write permission.

Where private reporting is not enabled and no policy exists, GitHub's guidance is to open an issue asking for a
preferred security contact. Do not describe the vulnerability in that issue.

## Checking your work before handing off

```bash
gh issue view <number> --repo OWNER/REPO --comments   # after filing, to follow up
gh api repos/OWNER/REPO/contents/.github --jq '.[].name'   # policy files under .github
gh api repos/OWNER/REPO/contents --jq '.[].name'           # root: CONTRIBUTING, SECURITY, AI_POLICY, AGENTS
gh api repos/OWNER/REPO/contents/docs --jq '.[].name'      # docs/, where some projects keep the policy
```

Read `CONTRIBUTING.md`, `SECURITY.md`, and any `AI_POLICY.md` from the repository rather than from memory of the
project. Their content changes and the changes are the point.
