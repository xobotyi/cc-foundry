# Model-Specific Behavioral Prompting

Techniques transfer between models; behavioral defaults don't. Each frontier release ships its own prompting guide
(Anthropic: per-model "Prompting Claude X" pages; OpenAI: per-model cookbook guides) documenting how that model's
defaults differ — verbosity, tool eagerness, subagent use, design taste. Check the target model's own guide before
tuning; this file distills the current generation (July 2026).

---

## The Migration Trap

The universal failure mode when moving prompts to a newer model: **instructions written to overcome the old model's
weaknesses overtrigger on the new one.** Newer Claude models follow the system prompt more closely and interpret
instructions more literally.

- `CRITICAL: You MUST use this tool when...` → `Use this tool when...`
- `Default to using [tool]` → `Use [tool] when it would improve X`
- `If in doubt, use [tool]` → delete
- Forced progress scaffolding (`After every 3 tool calls, summarize progress`) → delete; current models narrate natively
- Anti-laziness modifiers, "be thorough" nudges → remove and re-baseline before keeping

The fix is almost always to dial language back, not to add guardrails. Prompts and skills written for prior models are
often too prescriptive for newer ones and degrade output — A/B with old scaffolding removed; prefer stating the goal and
constraints over enumerating steps.

---

## Cross-Model Shifts (all current Claude models)

- **Literal instruction following** — the model does not silently generalize an instruction from one item to another or
  infer unstated requests. State scope explicitly: "Apply this formatting to every section, not just the first one."
- **Verbosity calibrates to task complexity** — shorter on lookups, longer on open-ended analysis. Tune with positive
  examples of the desired concision; they outperform "don't" instructions.
- **Effort is the primary lever** — not prompt-level CoT. Shallow reasoning on complex problems → raise effort (`xhigh`
  for hard coding/agentic work) rather than prompting around it. Overthinking on routine work → lower effort rather than
  adding constraint prose.
- **Reasoning is favored over tool calls** — higher effort substantially raises tool usage; for under-used tools, state
  when and how to call them in the tool description itself ("Call this when the user asks about current prices"), not
  just the system prompt.
- **Design defaults are persistent** — each model settles into a house style on open-ended frontend briefs (Opus 4.8:
  cream backgrounds, serif display type, terracotta accents). Generic "make it clean" swaps one fixed palette for
  another. Either specify a concrete alternative (exact hex values, typefaces, layout) or have the model propose 3–4
  distinct directions and pick one — the propose-then-pick pattern also replaces temperature-based variety (sampling
  params are removed on current models).
- **Code-review harness recall trap** — "only report high-severity issues" is now followed faithfully: the model finds
  the bugs, then declines to report ones below the stated bar. Measured recall drops while bug-finding improved. Prompt
  for coverage ("Report every issue you find, including ones you are uncertain about, with confidence and severity — a
  separate step will filter") and move filtering downstream.
- **Well-specified first turns beat progressive disclosure** — for agentic/coding products, give the full task, intent,
  and constraints upfront; ambiguous prompts revealed over multiple turns reduce token efficiency and sometimes
  performance.

---

## Claude Fable 5 (and Mythos 5)

The longest-horizon model: multi-day autonomous runs, first-shot correctness on well-specified systems, dependable
parallel subagents. Thinking is always on; single requests on hard tasks can run many minutes — plan timeouts,
streaming, and async check-ins before migrating. Give it the top of your difficulty range; testing only on simpler
workloads undersells it.

**Steering patterns** (short system-prompt instructions; full snippets in the Fable prompting guide):

- **Anti-overplanning** — "When you have enough information to act, act. If weighing a choice, give a recommendation,
  not an exhaustive survey."
- **Anti-tidying at high effort** — "Don't add features, refactor, or introduce abstractions beyond what the task
  requires. Do the simplest thing that works well."
- **Lead with the outcome** — first sentence answers "what happened"; keep output short by selecting what to include,
  not by compressing into fragments, abbreviations, or arrow chains.
- **Checkpoint policy** — "Pause only for destructive/irreversible actions, real scope changes, or input only the user
  can provide" — one instruction beats enumerating every case.
- **Ground progress claims** — "Before reporting progress, audit each claim against a tool result from this session;
  report only work you can point to evidence for." Nearly eliminates fabricated status reports on long runs.
- **State boundaries** — "When the user is describing a problem rather than requesting a change, the deliverable is your
  assessment — report and stop." Prevents unrequested adjacent actions.
- **Subagents: encourage, asynchronously** — invert the prior-model guardrail: "Delegate independent subtasks to
  subagents and keep working while they run." Long-lived subagents that keep context beat spawn-and-block.
- **Memory surface** — performance improves markedly with a place to write lessons (even a plain `.md` file): one lesson
  per file, record why it mattered, update rather than duplicate, delete what proves wrong.
- **Early-stopping reminder (autonomous pipelines)** — "Before ending your turn, check your last paragraph: if it is a
  plan or a promise about undone work, do that work now with tool calls."
- **Context-anxiety reassurance** — avoid surfacing remaining-token countdowns; if you must, add "You have ample context
  remaining. Do not stop, summarize, or suggest a new session on account of context limits."
- **Give the reason, not only the request** — "I'm working on [larger task] for [who]. They need [what it enables]. With
  that in mind: [request]." Intent context beats letting the model infer it.
- **Final-summary readability** — in long agentic sessions, instruct that the final message is a re-grounding for a
  reader who saw none of the work: outcome first, complete sentences, no working shorthand or invented labels.
- **`send_to_user` tool** — for long async agents, a client-side tool whose input renders verbatim in the UI (tool
  inputs are never summarized). Pair with elicitation language — defining the tool alone is not enough.

**Constraints:** never instruct it to echo or transcribe its internal reasoning in the response — this triggers
`reasoning_extraction` refusals; read the summarized `thinking` blocks instead. Verification: separate fresh-context
verifier subagents outperform self-critique — have it establish and run its own checking harness on a cadence.

---

## Claude Opus 4.8

Strengths: long-horizon agentic work, knowledge work, vision, memory. Performs well on existing Opus 4.7 prompts.

- **Effort:** start at `xhigh` for coding/agentic, `high` minimum for intelligence-sensitive work; respects low settings
  strictly (scopes work to what was asked). Thinking is off unless `{type: "adaptive"}` is set explicitly.
- **Subagents:** spawns fewer by default — steerable; give explicit spawn / don't-spawn guidance ("Do not spawn a
  subagent for work you can complete directly; spawn multiple in the same turn when fanning out across items").
- **Tone:** direct, opinionated, minimal validation-forward phrasing, sparing emoji. Add a warmth instruction if the
  product voice needs it.
- **Frontend:** strong design instincts with the persistent cream/serif house style (see Cross-Model Shifts); needs only
  a short anti-generic-aesthetics snippet where older models needed a long one.
- **Interactive coding:** reasons more after user turns (more tokens in multi-turn sessions) — use `xhigh`/`high`, add
  autonomous modes, reduce required user interactions.

## Claude Sonnet 5

Near-Opus quality on coding/agentic tasks at Sonnet cost. Performs well on existing Sonnet 4.6 prompts.

- **Adaptive thinking is on by default** when `thinking` is omitted (Sonnet 4.6 ran without) — thinking now shares the
  `max_tokens` budget; workloads tuned for 4.6 may truncate (also: new tokenizer, ~30% more tokens for the same text).
  If you ran thinking-off on 4.6, try adaptive + `low` effort before disabling.
- **Effort mapping when migrating:** Sonnet 5 `medium` ≈ Sonnet 4.6 `high`; Sonnet 5 `high` ≈ Sonnet 4.6 `max`.
  Benchmark by observed thinking length, not effort name.
- **More agentic by default** — reaches for tools and self-verification loops readily; but with thinking disabled it is
  less tool-eager — add an explicit tool-triggering nudge if you rely on tools with thinking off.
- **Sampling params removed** — non-default `temperature`/`top_p`/`top_k` return 400 (new for Sonnet-class); steer tone
  and variety through the prompt.

## OpenAI Current Models (brief)

GPT-5.x is the flagship family; prompting guidance carries forward across 5 → 5.1 → 5.2 (each has a cookbook guide —
GPT-5.2's is the newest full one). Behavioral profile rhymes with current Claude: deliberate scaffolding, lower default
verbosity, strong instruction adherence, prompt-sensitive output shape. Signature patterns from the 5.2 guide: explicit
verbosity specs (`<output_verbosity_spec>` with concrete length rules), scope-drift constraints ("implement EXACTLY and
ONLY what was requested"), and long-context re-grounding (outline relevant sections and restate constraints before
answering). `reasoning_effort` (default `medium`, `none` on 5.1+ for latency) is the depth control.
