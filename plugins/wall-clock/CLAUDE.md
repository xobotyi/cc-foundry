# wall-clock Plugin

A Claude Code mod that injects wall-clock time and elapsed intervals into model context beside prompts and after tool
results, so the agent knows what time it is and how long the current work has been running. Claude Code itself supplies
only a calendar date, frozen at process start. Why it is a mod, and where it holds its state:
[ADR 1.15](/design-docs/adr/1.15-wall-clock-state.md).

## Components

Run every command in this file from the repository root.

- **`hooks/register.ts`** — the whole implementation, loaded through `modules` in `hooks/hooks.json`.
  `claude plugin validate plugins/wall-clock` lists its hooks: `prompt.submit`, `turn.start`, `turn.complete`,
  `session.start`, `tool.call`, `session.compact`, `session.end`.
- **`tests/register.test.ts`** — the test-kit suite. It pins the anchors, the period, the legend, the compaction note,
  and the formatting, on a mocked clock. Run `claude plugin test plugins/wall-clock` after any change to the module.
- **`tsconfig.json`** — extends `.claude-plugin/types/tsconfig.json`, which Claude Code generates for its own version
  and gitignores. Start `claude --plugin-dir plugins/wall-clock` interactively once to generate it, then type-check with
  `yarn dlx -p typescript tsc -p plugins/wall-clock`.

## How It Works

A tick is one block of the `context` a prompt enters with, or of the `context` a tool result returns with. The model
reads it and the user never sees it.

- `prompt.submit` while the session is idle -> `at` plus `away`, the time since the last turn of this session's main
  conversation ended
- `tool.call` that was not denied -> `at` plus `turn`, the time since the turn of that conversation started, at most
  once per period
- `session.compact` -> the compaction note, after the instructions the compaction already has

**State in the process** — the mod keeps one loop record for the main conversation and one per subagent id: when its
turn started (`turn.start`), when it last got a tick, and whether it holds the legend. Every time comes from
`$.clock.now()`, which the test kit mocks; `Date` only formats it.

**State in the store** — a main `turn.complete` writes its time to `$.store` under `turnEndedAt:<session id>`, and
`prompt.submit` reads the key of `$.session.id()` for `away`. The store is the only source of `away`.

- A turn end belongs to one session id. A new session, a `/clear`, and a `--fork-session` resume have another id and
  get no `away` from it; `claude --resume` keeps the id and gets it (verified on 2.1.319).
- `session.start` deletes every turn end older than 30 days, so the store stays bounded.
- A subagent's turn end is not stored.

**Ticks and the legend:**

- A prompt's tick counts toward the period of the main conversation. A dropped prompt counts for nothing.
- A subagent's tool results count from its own turn and its own last tick.
- A prompt submitted while a turn runs (`e.turnId` is set) gets no tick: `prompt.submit` fires when the prompt is typed,
  the engine then queues it, and the stamp would be stale when the model reads it. The period restarts instead, so the
  next tool result of the main conversation carries a tick.
- The legend rides on the first tick of a conversation, and again on the first tick after a compaction of that
  conversation that was not skipped. `/clear` and a resume (`session.end`) start the main record over.
- A reload of the module starts every loop record over.

**Failure** — a hook that throws is skipped by the engine and the event goes on without a tick. The mod adds no
`.catch`: a missing tick is the correct result of a failure.

## Configuration

- **`tickSeconds`** (`userConfig`, number, default 60) — minimum seconds between two ticks of one conversation during a
  turn. `0` sets no minimum. A negative value reads as the default.

## Known Limits

- **No `away` where the store holds no turn end of the session.** A forked session, a session continued on another
  machine, and a session resumed after 30 days carry `at` alone on their first prompt.
- **No `turn` after a module reload mid-turn.** The turn start lives in the process.
- **No tick for a turn that calls no tool after a prompt typed mid-turn.** That prompt gets none, and only a tool result
  carries the next one.
- **Compaction under managed settings.** The built-in `cc-plugin-sec-default` passes `session.compact` past a mod
  outside the managed tier (verified on 2.1.319), so there a compaction gets no note and the legend does not return
  after it. `prompt.submit`, `turn.start`, `turn.complete`, and `tool.call` reach the mod (verified on 2.1.319).
- **No session age and no tool durations.** `away` and `turn` are the only elapsed figures.

## Conventions

- **One vocabulary.** The plugin is `wall-clock`, the injected tag is `<wall-clock>`, one emission is a **tick**, and
  the minimum time between two ticks is the **period**. Never introduce a second word for any of them.
- **Elapsed values are computed in the mod**, never left to the model. An injected figure must never require the model
  to subtract two timestamps.
- **A tick never carries a stale time.** Where the model reads a context later than the mod writes it, the mod writes
  no tick.
- **Mod API** — hook engine events, never `classic.*`: a managed-tier plugin passes every `classic.*` event past the
  mod. Write each mods API call in full as `$.namespace.method(...)`; `claude plugin validate` reads the calls off the
  source.
