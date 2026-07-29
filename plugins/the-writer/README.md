# the-writer

Prose discipline for agent-authored text: make what agents write read like a human wrote it — without lying about
anything.

## The Problem

Agents write a lot of prose now: READMEs, docs, release notes, blog posts, reports. Most of it carries the same
fingerprints — inflated significance ("marks a pivotal moment"), hedged comparisons ("prioritizes correctness rather
than raw speed"), participle padding (", ensuring optimal performance"), chat-register leaks ("Let's dive in!"), em
dashes everywhere, and the occasional `oaicite` token nobody cleaned up. Readers notice. The text reads as generated,
and the substance gets discounted along with the style.

Existing "humanizer" prompts attack this with flat lists of 30-50 numbered patterns. Lists go stale as models change,
they miss variants they don't name, and — applied mechanically — they over-edit: gutting voice, flattening specifics,
and sometimes inventing "human" details that were never true.

## The Solution

`the-writer` treats AI-sounding prose as a symptom of a few generative mechanisms and teaches the agent the mechanisms:

- **Inflated importance** — specifics regress into generic significance claims
- **Performed deliberation** — rhetorical shapes stand in for actual commitment to a claim
- **Leaked context** — the conversation, the task, or the model's scaffolding bleeds into the artifact
- **Uniform texture** — even cadence, cycled synonyms, restated ideas
- **Default formatting** — chat-UI habits applied regardless of medium
- **Machine residue** — citation tokens, placeholders, tracking params

An agent that knows the mechanisms catches variants no list contains — and knows when _not_ to edit, because clusters
convict while single tells don't.

Two constraints make it safe to run on text you care about: the skill never fabricates specifics (a vivid lie is worse
slop than a dull truth), and it conserves every claim in the original — rewrite, not summary. Its goal is readability
for humans, explicitly not AI-detector evasion.

## Skills

### humanize

Removes AI-writing tells from prose, prevents them when drafting, and reviews suspect text.

- **Writing mode** — applies the six mechanism families as constraints while composing new prose
- **Editing mode** — voice read → substance inventory → sweep by family → rewrite → self-audit → mechanical residue
  checks (greppable regexes for citation tokens, placeholders, invisible characters)
- **Reviewing mode** — reports clustered tells with locations and mechanisms, without rewriting

The skill ships with a full pattern catalog (`references/patterns.md`): per-pattern before/after examples, extended
words-to-watch lists, and tiered vocabulary grounded in 2026 corpus studies (Wikipedia's "Signs of AI writing",
WriteHuman's 80k-pair analysis, Bloomberry's signal corpus, Kobak et al.'s excess-vocabulary study).

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install the-writer
```

## Usage

The skill activates when a task involves prose for human readers. Invoke it explicitly with:

```
/the-writer:humanize
```

Typical asks:

- "Humanize this blog post draft"
- "Review this README — does it read AI-generated?"
- "Write the release announcement" (writing mode engages automatically)

To match a specific voice, provide a writing sample: "Humanize this, matching the style of `docs/old-post.md`."
