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

1. The header: `# <plugin-name>` and one badge per line, centered together in one `<div align="center">` block:
   ```
   [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
   [![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757.svg)](https://code.claude.com/docs/en/plugins)
   [![XERJ Corpus Hub contributor](https://hub.xerj.org/contributors/xobotyi/badge.svg)](https://hub.xerj.org/contributors/xobotyi)
   ```
   A mod's Claude Code badge states the minimum version it runs on and links to
   `https://claude.com/blog/claude-code-mods`. The XERJ badge appears only on a plugin that has a corpus on the XERJ
   Corpus Hub, named `xobotyi--cc-foundry-<plugin-name>` or `xobotyi--cc-foundry-<plugin-name>-<skill>`.
2. Below the header, one or two sentences on what the user gets, stated as the outcome. Never open with a category label
   such as "Go language discipline: conventions, idioms, and toolchain".
3. A sample of real output, when the plugin produces one this repository can cite: a commit from the log, the text a
   hook injects, a line a script prints. Link its source, then add one sentence on what the reader should notice. Never
   construct a sample; a plugin with no citable output skips this step.
4. `## The Problem` — the failures the plugin fixes and what each costs the user, in at most three prose paragraphs.
5. `## The Solution` — what each skill does, when it fires, and how the skills relate to each other.
6. `## Installation` — prerequisites such as a Node version or a language-server binary, then the one-step command,
   which `claude plugin validate .` advises. No form for older Claude Code releases, since Claude Code updates itself,
   and no manual `cp` or `ln` installation:
   ```
   /plugin install <plugin-name> --marketplace xobotyi/cc-foundry
   ```
7. Plugin-specific sections as the plugin needs them (usage, configuration, limits), then `## License`.

## Root README

- The header is the plugin header with `# cc-foundry`, the XERJ badge included, and a Claude Code badge that reads
  `plugin marketplace` and links to `https://code.claude.com/docs/en/plugin-marketplaces`.
- Each plugin gets a `### <plugin-name>` section under its group heading: two or three sentences on the failure it fixes
  and what it does, ending in `[Read more](plugins/<plugin-name>/)`. The depth stays in the plugin README.

## Every README

- Update the README in the same session as any change that alters what a user sees or installs.
- Format with `vp fmt <file>`.
