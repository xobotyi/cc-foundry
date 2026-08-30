# the-writer

Prose discipline for agent-authored text: make what agents write read like a human wrote it, without lying about
anything and without flattening whoever wrote it first.

## The Problem

Agents write a lot of prose now: READMEs, docs, release notes, blog posts, reports. Most of it carries the same
fingerprints — inflated significance ("marks a pivotal moment"), hedged comparisons ("prioritizes correctness rather
than raw speed"), participle padding (", ensuring optimal performance"), chat-register leaks ("Let's dive in!"), and the
occasional `oaicite` token nobody cleaned up. Readers notice, and the substance gets discounted along with the style.

The usual fix is a flat list of 30 to 160 named patterns, applied to every draft that arrives. That fails twice. Lists
go stale — the words that convicted a 2023 draft are not the words that convict a current one — and mechanical
application over-edits: a controlled study of model editing found rubric-guided rewrites lifted weak drafts on every
dimension while pushing already-good drafts down on coherence and framing, both significant. A humanizer that rewrites
everything it is handed damages the best text it touches.

## The Solution

`the-writer` treats AI-sounding prose as a symptom of what post-training rewarded, and it decides whether to edit before
deciding what to edit.

The mechanisms:

- **Performed helpfulness** — the text performs service to a reader who is not there
- **Unearned significance** — weight substituted for the specific the model lacks
- **Hedged commitment** — rhetorical shapes that perform thought without making a claim
- **Markdown in prose** — structural training leaking into text that is not a chat reply
- **Assembly, not composition** — sentences placed beside each other instead of built on each other
- **Machine residue** — citation tokens, placeholders, tracking parameters, invisible characters

An agent that knows the mechanisms catches variants no list contains, and knows when not to edit — because clusters
convict while single tells do not, and because a strong draft is measurably better left alone.

Three constraints make it safe to run on text you care about. It never fabricates specifics, it never injects voice or
stakes the source did not carry, and it conserves every claim in the original — rewrite, not summary. Its goal is
readability for humans, explicitly not AI-detector evasion: detectors fire on post-training artifacts and flag
second-language writing at the same time, so a detector score is not a target worth hitting.

## Skills

### humanize

Removes AI-writing tells from prose, prevents them while drafting, and reviews suspect text.

- **Decide first** — judge the draft whole, then review a strong one and rewrite a weak one
- **Sweep in order** — structure, then cohesion, then wording, then formatting density, then residue. Local word swaps
  leave the measured gap open; structural edits close it
- **Mark against thresholds** — labeled-bullet share, three-item density, adjacent-sentence cohesion, em-dash density
  against the human band rather than against zero
- **Acquit deliberately** — perfect grammar, formal vocabulary, contraction density, and even sentence lengths are not
  evidence, and the skill says so with the measurements behind it

The skill ships with a pattern catalog (`references/patterns.md`) organized by mechanism, and a baselines file
(`references/baselines.md`) carrying every number it states with the corpus, the date, and the caveat — including the
markers that failed to replicate and the ones no study has measured.

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
- "Write the release announcement" (the drafting constraints engage automatically)

To match a specific voice, provide a writing sample: "Humanize this, matching the style of `docs/old-post.md`."
