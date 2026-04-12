# Context Engineering

## Definition and Scope

Context engineering is the discipline of designing and building dynamic systems that provide the right information and
tools, in the right format, at the right time, to give an LLM everything it needs to accomplish a task.

Where prompt engineering focuses on crafting a single text string, context engineering has a broader scope: it treats
_all inputs_ to the model as engineered artifacts — system prompts, conversation history, retrieved documents, tool
results, memory outputs, and structured output schemas.

Key distinctions from prompt engineering:

- **Static vs. dynamic** — prompts are reused templates; context is assembled on the fly per query or agent step
- **Instruction vs. information** — prompt engineering shapes _how_ to ask; context engineering shapes _what_ the model
  knows
- **Single-call vs. systemic** — prompt engineering assumes one interaction; context engineering manages state across
  multi-step workflows
- **Tools and memory included** — context engineering explicitly governs when and how external tools, APIs, and memory
  systems participate

Anthropic frames it as: "the set of strategies for curating and maintaining the optimal set of tokens during LLM
inference, including all the other information that may land there outside of the prompts."

## Why Context Engineering Matters

**Most agent failures are context failures, not model failures.** The model receives incomplete, stale, or noisy
information and produces a bad output — not because it lacks capability, but because it lacks situational awareness.

Root causes:

- Context rot: as token count grows, recall accuracy degrades; every token taxes a finite attention budget
- Transformer attention is O(n²) over tokens — longer contexts stretch pairwise relationships thin
- Models were trained predominantly on shorter sequences; long-context behavior is less reliable
- Missing facts at inference time force hallucination; grounded context suppresses it

The payoff of good context engineering:

- Reduces hallucination by grounding outputs in retrieved facts
- Enables multi-turn coherence without the model losing the thread
- Makes behavior steerable and consistent via structured system context
- Allows agents to operate beyond their training cutoff using live retrieval

## Context Types

**System prompt** — defines agent identity, role, capabilities, constraints, output format, and examples. Persists
across the session. The primary lever for behavioral steering.

**User prompt** — the immediate task or question from the user.

**Conversation history (short-term memory)** — the current session's message turns. Grows with each step; requires
active management.

**Long-term memory** — persistent knowledge accumulated across sessions: user preferences, project summaries, learned
facts. Retrieved and injected at query time.

**Retrieved information (RAG)** — external documents, database records, or API results fetched to answer a specific
question or ground a reasoning step.

**Tool definitions** — schemas and descriptions of callable functions. Must be in context for the model to know what
tools exist and how to invoke them.

**Tool results** — outputs returned by tool calls, injected into the next model step.

**Structured output schema** — format specification constraining the model's response shape (e.g., JSON schema).

## Context Quality Principles

The guiding principle from Anthropic: **find the smallest possible set of high-signal tokens that maximizes the
likelihood of the desired outcome.**

- Treat context as a finite resource with diminishing marginal returns — not a dump, a curation
- Irrelevant content degrades output; every non-contributing token has a cost
- Prefer concise summaries over raw data dumps for injected knowledge
- Organize context into explicit sections (`<background_information>`, `<instructions>`, `## Tool guidance`,
  `## Output description`) so the model can parse structure
- Strike the right altitude in system prompts: specific enough to guide, flexible enough to generalize — avoid both
  brittle if-else hardcoding and vague high-level platitudes

## System Prompt Design

- Start minimal: test with the best available model and a minimal prompt; add instructions only based on observed
  failure modes
- Use simple, direct language — avoid complex, brittle logic baked into prompt text
- Segment into labeled sections (XML tags or Markdown headers)
- Provide canonical few-shot examples rather than exhaustive edge-case lists — examples are "pictures worth a thousand
  words"
- Minimal does not mean short; it means no superfluous tokens — the agent still needs sufficient grounding

## Tool Design for Context Efficiency

- Tools define the contract between agents and their action/information space
- Design tools to be self-contained, unambiguous in purpose, and token-efficient in output
- Avoid bloated tool sets with overlapping functionality — if a human can't decide which tool to use, the agent can't
  either
- Input parameters must be descriptive and unambiguous
- Tool descriptions appear in two places: the system prompt (behavioral guidance) and the tool schema (technical spec);
  both must be clear
- Poorly described tools lead to misuse, tool-skipping, or hallucinated invocations

## Retrieval and Just-in-Time Context

Two retrieval strategies:

**Pre-inference retrieval (RAG)** — embedding-based similarity search surfaces relevant documents before the model call.
Fast, predictable. Best for relatively static knowledge bases.

**Just-in-time retrieval (agentic search)** — the agent holds lightweight identifiers (file paths, stored queries,
links) and loads data dynamically via tools at runtime. Mirrors human cognition: index first, fetch on demand.

**Hybrid** — pre-load high-value static context (e.g., CLAUDE.md files) and let the agent pursue runtime exploration for
dynamic data. Claude Code uses this pattern.

Tradeoffs:

- Pre-inference retrieval: fast but risks stale data and upfront token cost
- Agentic search: fresh and selective but slower; requires good tooling and heuristics to avoid dead-ends
- Progressive disclosure: agents can assemble understanding layer by layer, maintaining only what's needed

Signals agents can exploit for relevance: file names, folder hierarchy, naming conventions, timestamps, file sizes —
metadata provides context without loading full content.

## Context Management Patterns

### Compaction

Summarize a context window nearing its limit and reinitiate with the summary. Preserves architectural decisions,
unresolved issues, and critical state; discards redundant tool outputs.

Implementation guidance:

- Tune the compaction prompt on complex agent traces
- Start by maximizing recall, then iterate to improve precision
- Lightest-touch compaction: clear raw tool results from deep history — once called, the result is rarely needed
  verbatim again

### Structured Note-Taking (Agentic Memory)

The agent writes notes to persistent external storage (e.g., NOTES.md, a memory tool) and reads them back at later
steps. Enables:

- Progress tracking across long workflows
- State continuity after context resets
- Accumulation of domain knowledge across sessions

Example: Claude playing Pokémon maintains tallies, maps, and strategy notes across thousands of steps and multiple
context resets — coherence comes from self-maintained notes, not a single context window.

### Multi-Agent Architectures

Isolate context concerns by separating responsibilities across agents:

- Orchestrator: maintains high-level plan; receives condensed sub-agent summaries (1,000–2,000 tokens)
- Sub-agents: execute focused tasks with clean context windows; may use tens of thousands of tokens but return only
  distilled results
- Each agent gets only what it needs — the search worker gets the query, not the full research context

Benefits: separation of concerns, model selection flexibility (large model for planning, fast model for execution),
prevents context pollution across concerns.

When to use each long-horizon pattern:

- Compaction — tasks requiring conversational flow and back-and-forth
- Note-taking — iterative development with clear milestones
- Multi-agent — complex research or analysis where parallel exploration pays off

## Layered Context Architecture

A useful mental model for structuring context in agentic systems:

- **System layer** — core agent identity and capabilities (persistent)
- **Task layer** — specific instructions for the current task (per-invocation)
- **Tool layer** — descriptions and usage guidelines for available tools
- **Memory layer** — relevant historical context and learned facts (retrieved)

## Context Validation and Iteration

Context engineering is not a one-time activity. The process:

1. Deploy with initial context
2. Observe actual behavior — log decisions, tool calls, state changes
3. Identify deviations from expected behavior
4. Refine system prompts and tool definitions
5. Re-test and validate
6. Repeat

Common pitfalls:

- **Over-constraint** — too many rigid rules make the agent inflexible and unable to handle edge cases
- **Under-specification** — vague instructions produce unpredictable, inconsistent behavior
- **Ignoring error cases** — context must specify what to do when tools fail or results are ambiguous
- **Bloated history** — accumulating raw tool results without summarization degrades performance

Balance constraints vs. flexibility deliberately:

- Flexible guidelines during development to observe decision patterns
- Rigid constraints in production where consistency is critical

## Measuring Context Engineering Effectiveness

- Task completion rate — percentage of tasks completed without intervention
- Behavioral consistency — similarity of output across equivalent inputs
- Error rate — frequency of failures, tool misuse, skipped steps
- Debugging time — how long to identify and fix context-related issues
- Token efficiency — context window utilization vs. output quality

## Anthropic's Perspective vs. Community Framing

Anthropic (engineering blog, 2026):

- Frames context engineering as the natural progression of prompt engineering for agentic systems
- Emphasizes "thinking in context" — considering holistic token state at each inference step
- Recommends hybrid retrieval, compaction, note-taking, and multi-agent patterns
- Positions smarter models as requiring less prescriptive context engineering over time

Community framing (Karpathy, Lutke, Willison, LangChain):

- "The art of providing all the context for the task to be plausibly solvable" (Lutke)
- Emphasizes context engineering as a system-level discipline, not a string-level one
- "A system, not a string" — context is the output of infrastructure that runs before the LLM call
- Shift from model capability as the bottleneck to context quality as the bottleneck

Both converge on: **performance gains in 2026 come more from smarter context than from smarter models.**
