# Pattern Catalog

Per-pattern before/after examples for the six mechanism families in SKILL.md, plus extended words-to-watch lists and
source notes. Examples are original, set in the domains agents actually write for: docs, READMEs, articles, release
notes, reports.

## Family 1: Inflated importance

### Significance puffery

Watch for: stands/serves as, is a testament/reminder to, a crucial/pivotal/vital/significant/key role/moment,
underscores/highlights its importance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the,
setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal
point, indelible mark, deeply rooted.

**Before:**

> The 2.0 release marks a pivotal moment in the project's evolution, setting the stage for a new era of extensibility
> and reflecting the team's enduring commitment to developer experience.

**After:**

> The 2.0 release replaces the plugin API. Extensions now declare capabilities in a manifest instead of patching
> internals, which is what most breakage in 1.x came from.

### Superficial `-ing` analysis

Watch for: sentence-final participle clauses — ", highlighting...", ", underscoring...", ", emphasizing...", ",
ensuring...", ", reflecting...", ", symbolizing...", ", contributing to...", ", fostering...", ", showcasing...", ",
enhancing...". Corpus data ranks "ensuring" as the single strongest word-level tell of 2026 (4.3× over-represented in AI
text).

**Before:**

> The scheduler batches writes every 50ms, ensuring optimal throughput and reflecting the system's design philosophy of
> efficiency at every layer.

**After:**

> The scheduler batches writes every 50ms. In our benchmark that cut disk IOPS by 70% under sustained load.

The participle clause performs analysis without making a checkable claim. Either the claim is real (then state it with
evidence as its own sentence) or it isn't (then cut it).

### Promotional tone

Watch for: vibrant, rich (figurative), profound, boasts a, nestled, in the heart of, breathtaking, stunning, renowned,
groundbreaking (figurative), must-visit, must-have, seamless, cutting-edge, state-of-the-art, natural beauty, commitment
to excellence.

**Before:**

> Nestled in the vibrant ecosystem of modern JavaScript tooling, this library boasts a rich feature set and a seamless
> developer experience.

**After:**

> The library covers parsing, validation, and serialization. Setup is one function call; no config file.

### Symbolic gloss

Watch for: represents, symbolizes, embodies, speaks to, is emblematic of — applied to mundane facts.

**Before:**

> The monorepo migration represents the team's embrace of collaborative development culture.

**After:**

> The team merged five repositories into one to stop coordinating releases across them.

### Vague authority

Watch for: experts argue, industry reports suggest, observers have noted, it is widely regarded, many developers
believe, studies show (unnamed).

**Before:**

> Many experts consider structured logging to be essential for modern observability practices.

**After:**

> Honeycomb's incident writeups repeatedly trace slow debugging to unstructured logs; their guidance is to emit one wide
> event per request.

If no source exists, the honest fix is to drop the authority and own the claim: "Structured logs are easier to query
during incidents."

### Notability name-dropping

Watch for: featured in [A], [B], and [C]; has been cited in; active social media presence; used by thousands of
developers worldwide.

**Before:**

> The framework has been featured in Hacker News, Reddit, and multiple industry newsletters, and maintains an active
> community with over 40,000 GitHub stars.

**After:**

> The 2025 State of JS survey put it at 12% adoption, up from 3% the year before.

### Generic upbeat conclusions

Watch for: the future looks bright, exciting times ahead, journey toward excellence, step in the right direction,
"Challenges and Future Prospects" sections, despite these challenges ... continues to thrive.

**Before:**

> Despite these challenges, the project continues to evolve, and the future looks bright as the team pushes toward new
> horizons of innovation.

**After:**

> Two problems remain open: cold-start latency and the migration path off 1.x. Both are scheduled for Q3.

## Family 2: Performed deliberation

### Hedging verbs as padding

Watch for: ensures, supports, reflects, highlights, facilitates, enables, empowers — attaching an idea to an unearned
benefit. Corpus ranking (WriteHuman, 80k pairs, 2026): ensuring, highlights, supports, reflects all in the top ten
word-level tells.

**Before:**

> The retry mechanism ensures reliability while the circuit breaker supports graceful degradation, reflecting a robust
> approach to fault tolerance.

**After:**

> Failed calls retry three times with exponential backoff. After five consecutive failures the circuit opens and
> requests fail fast for 30 seconds.

### Hedged comparison ("rather than")

Watch for: rather than, as opposed to, instead of — where the contrast adds no information. "rather than" is the
strongest phrase-level tell in 2026 corpus data (17,251 occurrences in AI inputs vs 6,859 in humanized outputs).

**Before:**

> The parser prioritizes correctness rather than raw speed, favoring maintainability rather than clever optimizations.

**After:**

> The parser is correct first: it rejects malformed input that the old regex approach silently accepted. It's also about
> 2× slower; we haven't needed to optimize it yet.

A real comparison names the cost. If there's no cost worth naming, there's no comparison worth writing.

### Negative parallelism

Watch for: not just X, but Y; not only ... but also; it's not about X, it's about Y; tailing negation fragments ("no
guessing", "no config", "no surprises").

**Before:**

> This isn't just a linter — it's a complete code quality platform. No configuration. No surprises. No wasted time.

**After:**

> It lints, formats, and sorts imports with one binary. The defaults work without a config file.

### Contrast-frame pileup

Watch for: "it is X, not Y", "X, not Y", "not X but Y" — recurring through a text. Distinct from hedged comparison (a
single empty contrast) and negative parallelism (the not-just-but escalation): here each instance may be individually
fine, and the density is the tell. Every current model reaches for the contrast frame as a default sentence shape;
humans use it for one deliberate emphasis, not as a rhythm.

**Before:**

> The pipeline is a discipline, not a formality. Reviews exist to catch design drift, not typos. The goal is
> correctness, not coverage. What matters is the reader's time, not the writer's convenience.

**After:**

> The pipeline is a discipline, not a formality. Reviews exist to catch design drift; typos are the linter's job. The
> goal is correctness — coverage follows from it. Write for the reader's time.

Keep the strongest contrast (usually the first or the one carrying a genuine surprise) and restate the rest as direct
claims without the foil.

Often the frame stands in for one precise word the sentence never found — the fix is that word, not two clauses:

**Before:**

> The walk itself is enforced, not entrusted.

**After:**

> The walk is programmatic.

### Rule of three

Watch for: any list of exactly three abstractions, especially adjectives or gerunds: "innovation, inspiration, and
insights"; "fast, reliable, and scalable".

**Before:**

> The migration delivers speed, safety, and scalability across the entire stack.

**After:**

> The migration cut p99 latency from 900ms to 200ms. Schema changes are now applied through reviewed migrations instead
> of manual SQL.

### Intensifiers without evidence

Watch for: significantly, dramatically, effectively, efficiently, seamlessly, substantially, greatly.

**Before:**

> The new cache significantly improves performance and dramatically reduces database load.

**After:**

> The cache serves 85% of reads; database CPU dropped from 60% to 15% at peak.

If you don't have the number, say what changed and mark the measurement as pending — don't imply it with an adverb.

### The role formula

Watch for: plays a crucial/critical/key/vital/important role in (shaping/driving/enabling). Trigram analysis ranks
"crucial role in" / "critical role in" / "role in shaping" among the most formulaic sequences LLMs produce.

**Before:**

> Caching plays a crucial role in shaping the performance characteristics of modern web applications.

**After:**

> Most page loads here hit three services; the cache keeps two of those calls off the hot path.

### False ranges

Watch for: from X to Y — where X and Y aren't endpoints of a real scale.

**Before:**

> The guide covers everything from basic setup to the enigmatic art of distributed tracing, from your first request to
> production-grade observability.

**After:**

> The guide covers setup, instrumentation, and how to read a trace during an incident.

### Aphorism formulas

Watch for: X is the Y of Z; X is the new Y; the currency/language/architecture of; not a tool but a mirror; X becomes a
trap.

**Before:**

> Documentation is the currency of collaboration. Tooling becomes a trap when teams forget the human layer.

**After:**

> Teams that document decisions onboard new members faster. Tooling helps only if someone maintains it.

### Fake-profound framing

Watch for: the real question is, at its core, in reality, what really matters, fundamentally, the deeper issue, the
heart of the matter.

**Before:**

> At its core, the real question isn't which framework to choose — it's what kind of team you want to be.

**After:**

> Pick the framework your team can hire for and debug at 3am. Here that's the boring one.

### Hedged enumeration openers

Watch for: there are several ways to, there are a few things to consider, generally speaking, in general, it is
generally a good idea to.

**Before:**

> There are several approaches to consider when handling authentication in microservices, and there are a few trade-offs
> to keep in mind.

**After:**

> Use a gateway that validates tokens once and forwards identity in a signed header. Per-service validation is the
> fallback when you can't trust the network.

### Excessive hedging

Watch for: could potentially, may possibly, might arguably, it could be argued that — stacked qualifiers.

**Before:**

> This change could potentially possibly introduce some issues that might affect certain users in specific scenarios.

**After:**

> This change breaks clients that rely on the undocumented `sort` parameter. Server logs show 12 such clients.

## Family 3: Leaked context

### Chat correspondence

Watch for: I hope this helps, Of course!, Certainly!, Here is a..., Would you like me to..., Want me to...?, Should I
continue?, let me know if.

**Before:**

> Here's an overview of the deployment process. I hope this helps! Let me know if you'd like me to expand any section.

**After:**

> Deployment runs in three stages: build, canary, full rollout.

### Sycophancy

Watch for: Great question!, You're absolutely right, That's an excellent point, What a fascinating topic.

**Before:**

> Great question! You're absolutely right that connection pooling is a complex topic.

**After:**

> Connection pooling has one non-obvious failure mode worth knowing about.

### Signposting

Watch for: let's dive in, let's explore, let's break this down, here's what you need to know, without further ado, now
let's look at, buckle up.

**Before:**

> Let's dive into how the scheduler works. Here's what you need to know about its internals.

**After:**

> The scheduler keeps two queues: one for interactive requests, one for batch.

### Engagement hooks and staccato drama

Watch for: The catch?, The kicker?, Here's the thing., The brutal truth?, Sound familiar?, Honestly?, Look, — as
standalone theatrical hooks; runs of clipped declarative fragments manufacturing drama.

**Before:**

> The benchmarks looked great. Too great. The catch? They never ran against production data. Not once. Not ever.

**After:**

> The benchmarks looked great, but they never ran against production data, so they missed the skewed key distribution
> that dominates real load.

One short sentence for emphasis is a legitimate human move. Three in a row is a drum machine.

### Reasoning scaffold

Watch for: Let me think through this, Breaking this down, Step 1: (in prose that isn't a procedure), First, I'll — the
model's working notes left in the artifact.

**Before:**

> Let me break down why the migration failed. First, I'll examine the schema changes.

**After:**

> The migration failed on the schema change: the new NOT NULL column had no default, and the table had existing rows.

### Knowledge-cutoff residue and speculative gap-filling

Watch for: as of my last update, as of [date] (unprompted), while specific details are limited/scarce, based on
available information, not publicly available, maintains a low profile, keeps personal details private, likely [grew
up/studied/began], it is believed that.

**Before:**

> While specific details about the outage are not publicly documented, it likely stemmed from a configuration error,
> suggesting the team maintains limited public postmortem practices.

**After:**

> The vendor hasn't published a postmortem. Status page timestamps show 43 minutes of downtime on March 3.

Say what is known with a source; say what isn't known plainly; never dress a guess as fact.

### Diff-anchored writing

Watch for: was added to replace, now uses, has been updated to, previously, the old approach — in documents that should
describe current state. Changelogs, release notes, and migration guides are exempt: they are inherently version-scoped.

**Before:**

> This module was rewritten to use a hash map, replacing the previous list-based approach which caused O(n²) lookups.

**After:**

> Lookups use a hash map and run in O(1).

### Fragmented headers

Watch for: a heading followed by a one-liner that restates it before real content starts.

**Before:**

> ## Error handling
>
> Errors matter in distributed systems.
>
> When a downstream call fails, the client retries idempotent requests only.

**After:**

> ## Error handling
>
> When a downstream call fails, the client retries idempotent requests only.

## Family 4: Uniform texture

### Flat cadence

No word list — read the paragraph aloud. If every sentence has the same length and shape, reshape. Corpus term: low
burstiness. Human writing mixes 5-word sentences with 30-word ones.

**Before:**

> The system processes requests in batches. The batches are flushed every second. The flush operation writes to disk.
> The disk writes are sequential. The sequential writes improve throughput.

**After:**

> Requests accumulate into batches that flush once per second, and because the flush writes sequentially, throughput
> stays high even on spinning disks. That's the whole trick.

### Synonym cycling

Watch for: one referent named three or more ways in a passage ("the service", "the platform", "the system", "the
solution").

**Before:**

> The gateway validates tokens. The proxy layer then forwards requests. This middleware component also handles rate
> limiting, making the traffic-management solution self-contained.

**After:**

> The gateway validates tokens, forwards requests, and rate-limits. Nothing else sits between clients and services.

### The treadmill

Watch for: in other words, put simply, essentially, that is to say, to put it another way — restating instead of
advancing.

**Before:**

> The index is eventually consistent. In other words, reads may not reflect recent writes. Put simply, what you just
> wrote might not show up immediately. Essentially, there's a propagation delay.

**After:**

> The index is eventually consistent: a read within ~2 seconds of a write may miss it.

### Reshuffling immunity

Test: can paragraphs 2 and 4 swap without breaking anything? If yes, the text is a list wearing a prose costume. Fix:
make each paragraph depend on the previous one, or admit it's a list and format it as one.

### Recap closers

Watch for: paragraphs ending "Whether you're a beginner or an expert...", sections ending In summary, To sum up,
Overall, In conclusion.

**Before:**

> Whether you're running a small side project or a large production system, monitoring matters. In summary, the tools
> above cover every observability need.

**After:**

> Start with the metrics endpoint; add tracing when you have more than three services.

### Copula avoidance

Watch for: serves as, stands as, functions as, acts as, boasts, features, offers — where "is" or "has" is the honest
verb.

**Before:**

> The config file serves as the single source of truth and features over forty tunable parameters.

**After:**

> The config file is the single source of truth. It has about forty parameters; four matter.

### Filler phrases

- "in order to" → "to"
- "due to the fact that" → "because"
- "at this point in time" → "now"
- "in the event that" → "if"
- "has the ability to" → "can"
- "it is important to note that X" → "X"
- "for the purpose of" → "for"

### Agentless passive

Watch for: no configuration is needed, it is recommended that, changes were made, results are preserved, mistakes were
made.

**Before:**

> No configuration file is needed. It is recommended that backups be verified regularly.

**After:**

> You don't need a config file. Verify your backups monthly; the restore script checks integrity automatically.

### Uniform hyphenation

Watch for: compounds hyphenated in predicate position: "the report is high-quality", "the API is easy-to-use".
Attributive position keeps the hyphen ("a high-quality report"); predicate position drops it ("the report is high
quality").

## Family 5: Default formatting

### Em and en dashes

Replace each, in rough preference order: period (new sentence), comma (tight aside), colon (introducing explanation),
parentheses (true aside), or restructure. Also catch spaced em dashes (`—`) and double hyphens (`--`).

**Before:**

> The cache — which was added in 2.0 — solves most of this — though not the cold-start problem.

**After:**

> The cache, added in 2.0, solves most of this. Cold starts remain slow.

Exception: the author's own writing sample or the project's house style uses them deliberately. Match the corpus you're
writing into.

### Bold overuse and erratic bolding

**Before:**

> The system uses **OKRs**, **KPIs**, and tools such as the **Business Model Canvas** to ensure **alignment** across
> **teams**.

**After:**

> The system uses OKRs, KPIs, and the Business Model Canvas to keep teams aligned.

Keep bold for glossary terms on first definition and for UI labels users must find on screen.

### Inline-header bullets

**Before:**

> - **Performance:** Performance has been significantly improved through optimized algorithms.
> - **Security:** Security has been strengthened with end-to-end encryption.

**After:**

> The update speeds up common queries (new composite indexes) and adds end-to-end encryption.

### Title Case, emoji, structural quirks

- Headings: sentence case unless house style says otherwise.
- Emoji on headings/bullets: delete unless the venue expects them (some READMEs do — house style wins).
- Skipped heading levels (H1 → H3): restore proper hierarchy.
- Thematic breaks (`---`) before every heading: delete; keep a break only where a real division exists.
- Curly quotes: weak signal alone (macOS, Word, and most CMSes auto-curl); normalize to the document's convention.

### Prose-as-table

**Before:**

> | Metric      | Value |
> | ----------- | ----- |
> | Market size | $2.1B |
> | Growth      | 14%   |

**After:**

> The market was worth about $2.1B in 2024 and grew 14% year over year.

A two-row table is a sentence in a cage. Tables earn their place for genuinely 2D data: multiple entities compared
across multiple attributes.

## Family 6: Machine residue

Always remove; no judgment call. Detection regexes are in SKILL.md's mechanical pass.

- **ChatGPT tokens:** `contentReference[oaicite:0]{index=0}`, `oai_citation`, `citeturn0search0`, `attributableIndex`,
  stray `+1` reference markers.
- **Gemini tokens:** `[cite: 1]`, `[span_1](start_span)`.
- **Grok tokens:** `grok_card`, `grok_render_citation_card_json`.
- **DeepSeek tokens:** lenticular brackets (【】), stray dagger symbols.
- **Perplexity tokens:** `attached_file`, `ppl-ai-file-upload`.
- **Placeholders:** `[Your Name]`, `[INSERT SOURCE URL]`, `[Specific Topic]`, `2025-XX-XX` dates, `PASTE_URL_HERE`,
  `SOURCE_PUBLISHER`.
- **Tracking:** `utm_source=chatgpt.com`, `utm_source=openai`, `utm_source=copilot.com`, `referrer=grok.com`.
- **Invisible characters:** zero-width space (U+200B), zero-width joiner (U+200D), soft hyphen (U+00AD), BOM (U+FEFF),
  Cyrillic/Greek homoglyphs in Latin text. These sometimes indicate deliberate detector-dodging in source material —
  normalize them out.

## Source notes

- **Wikipedia, "Signs of AI writing"** (WikiProject AI Cleanup) — the canonical field guide; families 1, 3, 5, and 6
  draw heavily on its catalog and its central caveat: signs are symptoms, clusters convict, and human detection accuracy
  without LLM experience is near chance.
- **WriteHuman corpus study (April 2026, 80,141 humanization pairs)** — word/phrase/trigram rankings used in families 1
  and 2: "ensuring" 4.3× over-represented, "rather than" the top phrase tell, the role formula the top trigram family.
  Em dash present in only 18.5% of AI inputs — a real but weakening signal.
- **Bloomberry "AI Sentence DNA" (June 2026, 7,400+ catalogued signals)** — the cluster thesis: AI writing becomes
  recognizable when signals stack across vocabulary, cadence, structure, and framing, not from any single marker.
- **Kobak et al. 2025 (excess vocabulary, 15M PubMed abstracts)** — post-ChatGPT frequency spikes for delve, showcasing,
  underscores, pivotal (up to 28× baseline); basis for Tier 1 vocabulary.
- **Reinhart et al. 2025 (PNAS, "Do LLMs write like humans?")** — grammatical and rhetorical style variation; basis for
  the `-ing` analysis and performed-deliberation families.

Word lists decay as models change; mechanisms persist. When updating this catalog, re-verify tier assignments against
current corpus data before trusting any specific word.
