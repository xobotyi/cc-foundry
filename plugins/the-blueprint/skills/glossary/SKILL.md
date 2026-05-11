---
name: glossary
description: >-
  Project glossary for consistent domain terminology. Invoke whenever task
  involves creating, updating, or referencing a glossary, defining domain
  terms, establishing ubiquitous language, or when inconsistent naming
  causes confusion in code or planning artifacts.
---

# Glossary

Consistent terminology prevents agents from inventing names. LLMs are amplifiers — give them a clear vocabulary and they
generate coherent structure; give them a codebase where the same concept has four names, and they'll invent a fifth. The
glossary is structural context that lives alongside agent instructions, consumable by both humans and agents as a single
source of truth for project vocabulary.

## Creating a Glossary

### Phase 1 — Identify Scope

1. Determine whether the project needs one glossary or multiple per bounded context.
   - Single glossary: projects with one domain, one team, one codebase.
   - Per-context glossaries: projects with distinct subdomains where the same word means different things (e.g., "Order"
     in billing vs fulfillment).
2. For per-context projects, name each bounded context and create a separate glossary file per context.

### Phase 2 — Extract Terms

Interview the user to extract domain knowledge. Focus on:

- **Core entities** — what are the main "things" in this domain? What states do they transition through?
- **Business events** — what triggers state changes? What are the verbs?
- **Value objects** — what data is immutable and identified by content, not by ID?
- **Enum values** — what are the specific allowed values for categorical fields? Define them upfront so generated code
  matches the domain model exactly.
- **Aliases to prohibit** — for each term, what synonyms might an agent use that would be wrong? "Session" when the
  domain says "Run". "Permission" when the domain says "Governance Check". This column prevents naming drift.
- **Architectural names** — services, modules, patterns that have specific names in this project.

### Phase 3 — Format

Format each glossary as a markdown table with four columns:

```markdown
| Term | Definition | Aliases (AVOID) | Related Terms |
| --- | --- | --- | --- |
| Order | Aggregate representing a customer's commitment to purchase. States: Draft → Placed → Paid → Fulfilled → Cancelled | Purchase, Transaction, Sale | LineItem, Customer |
| Governance Check | Validation before each tool call. Four phases: allowlist, registry status, connection health, policy budget | Permission Check, Access Control, Authorization | Run, Tool Registry |
| CompletionReason | Value object. Enum: `user_ended`, `inactivity_timeout`, `step_limit_reached`, `tool_call_limit_reached`, `duration_limit_reached` | EndReason, StopReason | Run |
```

The "Aliases (AVOID)" column is the highest-value field — it tells agents what NOT to call things, which is as important
as what to call them.

### Phase 4 — Place

Store glossary files in the project alongside agent instructions:

- **Single glossary:** `docs/glossary.md` or `docs/ubiquitous-language/glossary.md`
- **Per-context:** `docs/ubiquitous-language/{context}-glossary.md` (e.g., `billing-glossary.md`,
  `orchestration-glossary.md`)
- **Reference from CLAUDE.md:** add a pointer early in the file (top sections) so the glossary is discoverable. Early
  placement exploits primacy attention — standards positioned at the start of context reduce naming violations by
  35-40%. Do not inline the glossary in CLAUDE.md — use progressive disclosure:

```markdown
## Domain Vocabulary
See `docs/glossary.md` for project terminology and prohibited aliases.
```

## Referencing a Glossary

When invoked to look up or apply terminology (not to create or update):

1. Locate the glossary file(s) — check `docs/glossary.md`, `docs/ubiquitous-language/`, or ask the user.
2. Read the glossary and find the relevant term(s).
3. Apply the correct name and actively avoid the listed aliases. If the requested concept isn't in the glossary, flag
   the gap — this is a trigger for an update.

## Updating a Glossary

Glossary maintenance is event-driven, not scheduled:

- **Agent naming mistake:** when an agent uses a wrong name that better context would have prevented, add or update the
  term immediately. The mistake is the trigger.
- **New feature / bounded context:** when new domain concepts emerge during DRAFT stages, add them before
  implementation. Discovery and alignment naturally surface new terms — capture them in the glossary when they appear.
- **Term meaning shift:** when a term's definition changes, update the definition and add a brief note about what
  changed and when. The glossary is a living artifact.

Do not create a new file for each update. Edit in place. The glossary is a single source of truth, not a changelog.

## Rules

- **Separate file, not inline.** The glossary lives in the project filesystem, not embedded in CLAUDE.md or conversation
  context. Agents and humans reference the same file.
- **Four-column table.** Term, Definition, Aliases (AVOID), Related Terms. The aliases column is mandatory — without it,
  agents will invent synonyms.
- **One glossary per bounded context.** If the same word means different things in different parts of the system, split
  into separate glossaries. Agents should load only the vocabulary relevant to their current scope.
- **Living artifact.** Updated when mistakes reveal gaps, when new terms emerge, when definitions evolve. Not versioned
  by date — a single file that represents current truth.
- **Consumable by both humans and agents.** Markdown table format is readable in any editor and parseable by any LLM.
  Avoid YAML/JSON unless the project specifically needs machine-parsed structured data.

## Related Skills

- **discovery** — surfaces domain terms during questioning; trigger for initial glossary creation
- **alignment** — pattern surfacing may reveal naming inconsistencies to resolve
- **diagramming** — domain models and context maps complement the glossary visually
