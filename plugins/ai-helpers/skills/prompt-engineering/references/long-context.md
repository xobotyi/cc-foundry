# Long Context Prompting

High-volume context prompting (documents, codebases, transcripts) requires deliberate curation and structure. The
challenge is not fitting content into the window — it is keeping the model's attention focused on the right tokens.

---

## Core Principle: Context as a Finite Attention Budget

LLMs use transformer attention: every token attends to every other token (O(n²) relationships). As context grows,
pairwise attention is stretched thin across more tokens. This is not a cliff — it is a gradient of degrading precision
called **context rot**: recall and long-range reasoning degrade steadily as token count rises.

Treat context as a scarce resource with diminishing marginal returns. The goal is the **smallest set of high-signal
tokens** that maximizes the likelihood of the desired output — not the largest set of potentially relevant tokens.

---

## Document Organization Patterns

### KV Label Pattern

Assign a short, unique identifier to each document before it enters context. Reference it in the task instruction.

```xml
<document id="policy-v3">
  [content]
</document>

<document id="policy-v4">
  [content]
</document>

Task: Compare the liability clauses in policy-v3 and policy-v4.
```

- Identifier enables precise citation in model output
- Prevents the model conflating overlapping documents
- Works at any scale (2–50+ documents)

### Ordered Relevance Pattern

Place the most task-relevant documents first, least relevant last. Models attend more precisely to early context; the
primacy effect is well-documented at long context lengths.

- If relevance is unknown, use recency as a proxy (newer = more relevant)
- For symmetric relevance, interleave related documents rather than grouping by source

### Metadata Header Pattern

Prefix each document with structured metadata before the content:

```xml
<document id="report-q4" source="finance" date="2025-12-31" pages="42">
  [content]
</document>
```

- Date metadata enables the model to reason about recency without reading full content
- Source metadata helps when documents have overlapping terminology with different meanings
- Page count signals depth; the model can adjust extraction strategy accordingly

---

## XML Structuring for Multi-Document Context

XML tags outperform markdown for large multi-document prompts because:

- Nesting is unambiguous (no heading level ambiguity)
- Tags survive line wrapping and copy-paste damage
- Models trained on Claude's constitution recognize XML as semantic structure

### Standard Multi-Document Template

```xml
<documents>
  <document id="1" title="Q3 Earnings Report" type="financial">
    <summary>Optional 2-3 sentence abstract for very long docs</summary>
    <content>
      [full document text]
    </content>
  </document>

  <document id="2" title="Analyst Note" type="commentary">
    <content>
      [full document text]
    </content>
  </document>
</documents>

<task>
  [instructions referencing document IDs]
</task>
```

### Inline Citation Prompt

Append to the task section when citations are required:

```
When citing evidence, use the format [doc-id, paragraph N]. Do not summarize without a citation.
```

---

## Query Patterns

**Extraction queries** — ask for specific facts, not summaries. Specific targets reduce hallucination risk because the
model searches rather than paraphrases.

- Weak: "Summarize the contract."
- Strong: "List every termination clause in the contract that applies within the first 90 days."

**Comparative queries** — name both documents explicitly in the question.

- Weak: "How do the policies differ?"
- Strong: "List every claim condition present in policy-v4 but absent in policy-v3."

**Grounded queries** — instruct the model to quote before analyzing.

```
For each finding, first quote the relevant passage verbatim, then explain its significance.
```

**Negative-space queries** — useful for gap analysis.

```
List topics covered in document-A that are not addressed in document-B.
```

---

## Chunking Strategies

When a single document exceeds ~50k tokens, chunking is required. Two primary approaches:

### Map-Reduce

1. Split document into chunks (by section, page count, or token budget)
2. Run extraction query independently on each chunk → collect partial results
3. Run synthesis query on the aggregated partial results

SPL research (arXiv:2602.21257) demonstrates this reduces attention cost from O(N²) to O(N²/k) for k chunks, enabling
parallel execution on cloud or sequential execution locally with identical logic.

Best for: extraction, classification, QA over uniform content (transcripts, legal documents, code files of similar
structure).

### Sliding Window with Overlap

1. Define window size (e.g., 8k tokens) and overlap (e.g., 1k tokens)
2. Each window includes the tail of the previous chunk
3. Run query on each window; deduplicate results by content similarity

Best for: continuous narrative content where chunk boundaries would split logical units (novels, meeting transcripts
with speaker turns, log files with correlated events).

### Logical Chunking via CTE Syntax (SPL pattern)

For structured pipelines, use named intermediate results:

```
Step 1: Extract all action items from transcript → store as action_items
Step 2: Extract all decisions from transcript → store as decisions
Step 3: Cross-reference action_items against decisions → identify conflicts
```

This mirrors SQL's Common Table Expression pattern — each named step has a clear output, and later steps reference
earlier outputs by name. Avoids re-reading the full document for each sub-query.

---

## Context Rot Mitigation

**Compaction** — when a long conversation approaches the window limit, summarize and restart. Preserve:

- Decisions made
- Open questions / unresolved bugs
- Structural constraints (schema, API contracts)
- The 5 most recently accessed files/documents

Discard: raw tool outputs, redundant retrieval results, superseded working notes.

**Tool-result clearing** — once a tool call's output has been processed, strip it from history. The agent has already
incorporated the result; the raw output adds tokens without adding signal.

**Structured note-taking** — agent maintains a `NOTES.md` or equivalent that is small and selective. Notes get pulled
into context at the start of each new turn. The note file replaces, not supplements, the raw history.

**Just-in-time retrieval** — instead of loading all potentially relevant documents up front, load lightweight
identifiers (file paths, IDs, URLs) and retrieve content on demand via tools. This mirrors human cognition: we maintain
references, not full copies, in working memory.

---

## Sub-Agent Architecture for Context Isolation

When a task requires exploring more content than fits in one focused context:

- Parent agent holds high-level plan + synthesized results only
- Sub-agents handle deep-dive tasks in isolated clean contexts
- Sub-agents return condensed summaries (1,000–2,000 tokens) not raw results

Detailed search context stays within sub-agents; the lead agent stays focused on coordination and synthesis. See
`references/agent-patterns.md` for implementation patterns.

---

## Positioning Rules

- **Instructions** → top of system prompt and/or end of user turn (primacy + recency)
- **Documents** → middle of context, between system prompt and final instructions
- **Examples** → immediately before the task, after documents, to prime output format
- **Task** → always last in the user turn; never bury it under documents

Rationale: models exhibit stronger recall at the beginning and end of context (primacy-recency effect). Critical
instructions placed only in the middle of a long document block are at highest risk of being under-attended.

---

## Token Efficiency Checklist

- [ ] Every document in context is directly needed for this specific task
- [ ] Documents have `id` attributes for precise citation
- [ ] Most relevant documents appear first
- [ ] Redundant or superseded documents are removed
- [ ] Tool results from previous turns are cleared after processing
- [ ] The task instruction explicitly names which documents to use
- [ ] Chunking is used if any single document exceeds ~50k tokens
- [ ] Notes/memory file is selective, not a full transcript
