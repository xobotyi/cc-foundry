# Long Context

Depth on arranging large inputs. Everything here is about text you write; the boundary where it stops being a prompt
problem is stated at the end.

## Nominal context is not usable context

A stated window size is a true claim about what the API accepts and a misleading shorthand for what the model can use.
Effective capacity runs well below the advertised number, and degradation is not graceful — quality holds, then falls
off rather than sloping down.

Two consequences that change how you write:

- **Fitting is not the bar.** "It fits in the window" says nothing about whether the model will use the part that
  matters.
- **The failure is silent.** Nothing errors. The model answers from whatever it attended to, with the same confidence it
  would have had reading a well-arranged prompt.

**The measured shape of the problem**: holding task and checks fixed, a coding agent passed 8/10 runs at ~11k characters
of clean context and 3/10 at ~299k — with the same drop whether the added material was topically relevant or irrelevant.
Two-sided Fisher `p = 0.0698`, so treat this as a strong trend rather than a settled law. The directional finding is the
usable part: **volume itself carries a cost that relevance does not offset.**

## Document organization

### The standard multi-document arrangement

```xml
<documents>
  <document index="1" source="policy-handbook.pdf" type="policy" date="2026-03-14">
    ...content...
  </document>
  <document index="2" source="ticket-4417" type="support-thread" date="2026-08-02">
    ...content...
  </document>
</documents>

<instructions>
Using only the documents above, answer the question. Before answering, quote the
passages you rely on inside <evidence> tags, each tagged with its document index.
If the documents do not contain the answer, say so rather than inferring.
</instructions>

<question>
...the actual question, last...
</question>
```

Four properties make this work, and dropping any one degrades it:

- **Material first, instruction after, question last.** The instruction should be readable as operating on something the
  model has already seen.
- **Every document individually wrapped and labeled.** An index alone is enough to enable citation; source, type, and
  date make a wrong retrieval visible.
- **An explicit no-answer path.** Without it the model infers rather than declining, and inference from adjacent
  documents is the dominant long-context error.
- **Evidence before conclusion.** Ordering matters — quotes requested _after_ the answer become post-hoc justification.

### Ordered relevance

When you have a relevance signal from retrieval, order documents by it — but place the **most** relevant nearest the
question, not first. The end of the prompt is the second strong attention zone and it is the one adjacent to the task.

### Metadata that earns its place

Include what the model would need to disambiguate two documents that say different things: source, date, version,
authority. Omit what it cannot act on — internal ids nobody will resolve, storage paths, ingestion timestamps.

## Quote-grounding

The single highest-leverage pattern for large inputs, because it converts an invisible failure into a visible one.

```text
Before answering, extract the passages that bear on the question into <evidence>
tags, each labelled with its document index. Then answer using only those passages.
If the evidence is insufficient, say so instead of filling the gap.
```

What this buys: a wrong answer arrives with its wrong source attached. Without grounding, a model that attended to the
wrong document produces a fluent answer with no signal that anything went astray — the most expensive failure mode in
this file, because it survives review.

## Chunking

When the material does not fit, or fits but degrades:

- **Map-reduce** — process each chunk independently against the same question, then synthesize the per-chunk answers in
  a second pass. Correct when chunks are genuinely independent. Loses cross-chunk relationships entirely, so it is wrong
  for anything requiring a comparison the chunks do not each contain.
- **Sliding window with overlap** — sequential chunks sharing a boundary region, for material where local continuity
  matters (transcripts, narratives, logs). The overlap costs tokens and buys the ability to resolve references that
  straddle a cut.
- **Logical chunking** — split on the document's own structure rather than a token count. A chunk that ends mid-clause
  produces an answer that reflects the cut.

Chunk on meaning where the material has structure; chunk on size only when it does not.

## Long-running agents

A standing context that has grown is the same problem arriving by a different route.

- **Maintain state as an object, not as a transcript.** Re-deriving the current state from an accumulating history each
  turn is how agents drift; the derivation compounds its own errors.
- **A skill loaded into 50k tokens of surrounding context is not the skill you tested in isolation.** Its rules compete
  with everything else present. This is the reason the deletion test matters more in persistent context than anywhere
  else.
- **Cut before you add.** When a long-running agent answers wrong, the reflex is to add clarifying context. Removing
  present-but-not-load-bearing material is the higher-yield move and the one nobody tries first.

## Where this stops being a prompt problem

Arranging text is prompting. These are not, and reaching for words here is the wasted motion:

- **The conversation itself is the volume** → compaction and reasoning persistence, at the harness.
- **The right documents are not in the prompt** → retrieval. No arrangement rescues an absent source.
- **The material is deterministic and machine-queryable** → let the model call code against it instead of reading it.
- **State must survive across sessions** → a memory surface, not a longer prompt.

The tell is whether better arrangement of what you already have could plausibly fix it. If not, stop writing.
