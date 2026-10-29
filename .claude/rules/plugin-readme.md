---
paths:
  - '**/README.md'
---

# README Authoring

A README is user-facing documentation, and its audience is human. This is the inverse of a CLAUDE.md, which is terse
bullets written for a model. Explanatory prose is correct here; do not compress a README into the bullet register a
CLAUDE.md uses.

## Plugin README

Sections in this order:

1. `# <plugin-name>`, then one or two sentences on what the user gets, stated as the outcome. Never open with a category
   label such as "Go language discipline: conventions, idioms, and toolchain".
2. A sample of real output, when the plugin produces one this repository can cite: a commit from the log, the text a
   hook injects, a line a script prints. Link its source, then add one sentence on what the reader should notice. Never
   construct a sample; a plugin with no citable output skips this step.
3. `## The Problem` — the failures the plugin fixes and what each costs the user, in at most three prose paragraphs.
4. `## The Solution` — what each skill does, when it fires, and how the skills relate to each other.
5. `## Installation` — prerequisites such as a Node version or a language-server binary, then the one-step command,
   which `claude plugin validate .` advises. No form for older Claude Code releases, since Claude Code updates itself,
   and no manual `cp` or `ln` installation:
   ```
   /plugin install <plugin-name> --marketplace xobotyi/cc-foundry
   ```
6. Plugin-specific sections as the plugin needs them (usage, configuration, limits), then `## License`.

## Root README

- Each plugin gets a `### <plugin-name>` section under its group heading: two or three sentences on the failure it fixes
  and what it does, ending in `[Read more](plugins/<plugin-name>/)`. The depth stays in the plugin README.

## Every README

- Update the README in the same session as any change that alters what a user sees or installs.
- Format with `vp fmt <file>`.
