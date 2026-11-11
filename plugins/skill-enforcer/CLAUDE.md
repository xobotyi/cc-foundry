# skill-enforcer Plugin

A Claude Code mod that injects skill-discipline reminders at lifecycle checkpoints so matching skills get invoked
proactively and their phase-relevant references get read — not skipped. Why it is a mod:
[ADR 1.14](/design-docs/adr/1.14-sef-delivery.md).

## Components

Run every command in this file from the repository root.

- **`hooks/register.ts`** — the whole implementation, loaded through `modules` in `hooks/hooks.json`.
  `claude plugin validate plugins/skill-enforcer` lists its hooks: `prompt.submit`, `tool.call`, `session.compact`,
  `session.end`.
- **`tests/register.test.ts`** — the test-kit suite. It pins the checkpoint table, the anti-leak contract, when the
  framework enters, and the compaction instructions. Run `claude plugin test plugins/skill-enforcer` after any change to
  the module.
- **`tsconfig.json`** — extends `.claude-plugin/types/tsconfig.json`, which Claude Code generates for its own version
  and gitignores. Start `claude --plugin-dir plugins/skill-enforcer` interactively once to generate it, then type-check
  with `yarn dlx -p typescript tsc -p plugins/skill-enforcer`.

## Checkpoints

- `prompt.submit` of a prompt the person typed -> `USER-PROMPT` reminder, after the framework when the conversation
  does not hold it
- `tool.call` of `Read` -> `EVALUATION` reminder
- `tool.call` of `Edit` or `Write` -> `PHASE-CHANGE` reminder
- `tool.call` of `Skill` -> `SKILL-LOAD` reminder
- `session.compact` -> the SEF compaction instructions, after the instructions the compaction already has

`TOOL_PHASES` in `register.ts` maps a tool to its phase. The matcher of the `tool.call` hook lists the same tools as
literals, because `claude plugin validate` reads a matcher off the source; change both together.

## How It Works

- A reminder is one block of the `context` a prompt enters with, or of the `context` a tool result returns with. The
  model reads it and the user never sees it.
- A tool reminder follows a call that succeeded, in the main conversation and in a subagent's alike. A denied call and
  a call whose result is an error get none.
- A task notification, and any prompt with `isMeta`, enters with no reminder and does not count as the conversation's
  first prompt. Claude Code marks only some task notifications `isMeta`, so the hook also reads `origin.kind` (verified
  on 2.1.319).
- The framework enters with the first typed prompt after the process starts, and again with the first typed prompt
  after `/clear`, a resume (`session.end`), or a compaction of the main conversation that was not skipped
  (`session.compact`). `session.start` cannot carry it: that event fires once per process and never for `/clear`.
- A prompt that is dropped leaves the framework for the next prompt.
- The mod keeps one flag per process, `hasFramework`. A reload of the module starts it over, so the next typed prompt
  carries the framework again.

## Known Limits

- On a machine with managed settings, the built-in `cc-plugin-sec-default` passes `session.compact`, `prompt.compose`,
  `skill.prompt`, and every `classic.*` event past a mod outside the managed tier, while `prompt.submit`, `tool.call`,
  and `session.end` reach it (verified on 2.1.319). There a compaction gets no SEF instructions, and the framework
  returns only at the next process start, `/clear`, or resume. The reminders are unaffected. A mod that managed
  settings list in `prependPlugins` ahead of `sec-default@builtin` receives `session.compact` (verified on 2.1.319).
- A subagent's conversation gets the tool reminders and never the framework.

## Conventions

**Single source of truth:**

- Each checkpoint's rule lives once in the `STAGES` object in `register.ts`. `STAGES[phase].rule` feeds both the
  framework list and the per-checkpoint reminder.
- Add or rename a checkpoint by editing `STAGES`; the framework and reminder update together. Do not duplicate rule text
  elsewhere.

**Self-contained reminders:**

- Every reminder carries its full rule, never a pointer back to the framework — at 1M-token scale the framework sits in
  the low-attention middle, so the reminder is the operational contract.

**Anti-leak contract:**

- Every reminder ends with the shared `SILENT` clause: act on the rule, never echo the reminder or narrate the check.
  Guards both failure modes — tag-echo and narration.
- Injected payloads carry no artifact the model is asked to reproduce. Never reintroduce a `<thinking>` or `<sef-eval>`
  template into injected output — see [ADR 1.4](/design-docs/adr/1.4-behavioral-nudges.md).

**Token cost:**

- Framework ~600 tokens once per conversation; each reminder ~80-120 tokens, byte-identical across firings so KV-cache
  reuses them after the first occurrence. Rule text added to `STAGES` is paid at every firing.

**Mod API:**

- Hook engine events, never `classic.*`: a managed-tier plugin passes every `classic.*` event past the mod.
- Write each mods API call in full as `$.namespace.method(...)`, and pass `$` only to top-level functions in
  `register.ts`. `claude plugin validate` reads the calls off the source.
