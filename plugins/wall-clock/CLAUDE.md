# wall-clock Plugin

Injects wall-clock time and elapsed intervals into model context at turn and tool-batch boundaries, so the agent knows
what time it is and how long the current work has been running. Claude Code itself supplies only a calendar date, frozen
at process start.

## How It Works

Every figure derives from the session transcript Claude Code already writes. The hook keeps no state of its own, so
nothing can go stale across `--resume`, a crash, or two concurrent sessions in one project.

1. **UserPromptSubmit** — emits `at` plus `away`, the gap since the agent last spoke.
2. **PostToolBatch** — emits `at` plus `turn`, elapsed since the current prompt landed, throttled to one tick per
   period.
3. **PreCompact** — emits an instruction to drop the accumulated ticks, which are re-injected on the next turn anyway.

**Anchors** — chosen so that neither event depends on whether the current prompt has reached the transcript yet:

- `away` — newest `type: "assistant"` entry.
- `turn` — newest `type: "user"` entry with no `attachment`, no `isMeta`, and text content. Tool results carry only
  `tool_result` blocks, so they are excluded; an image prompt carries text beside the image, so it is included.

**Throttle** — also stateless. The previous tick is found by scanning the transcript tail for `<wall-clock `, matching
only inside `attachment.stdout` or `attachment.content`. Batch ticks are recorded in both forms and prompt ticks only in
`content`, so both fields must be read or a prompt tick fails to throttle the batch tick behind it. Requiring the
attachment is what stops the hook's own source, quoted into the transcript by a Read or a Write, from matching itself.

**Failure paths** — the exit code is always 0, and a diagnostic goes to stderr (visible under `claude --debug`):

- Malformed hook payload — nothing emitted.
- Unreadable transcript, batch event — nothing emitted. Without the transcript there is no throttle, and a tick would
  otherwise fire on every batch.
- Unreadable transcript, prompt event — `at` only, no elapsed field.
- Anchor outside the window — `at` only. The absolute time is always correct; an elapsed figure is omitted rather than
  guessed, and the window is never widened to hunt for the anchor.

## Components

- **`hooks/wall-clock.js`** — the whole implementation. ESM with `node:` imports, no dependencies, ~26ms per invocation
  dominated by process spawn.
- **`hooks/hooks.json`** — registers the three events, 5s timeout each.

## Configuration

- **`FOUNDRY_WALL_CLOCK_TICK_SECONDS`** — minimum seconds between batch ticks. Default 60. `0` ticks on every batch.
  Invalid, non-numeric, or negative values warn on stderr and fall back to the default.
- The knob is deliberately **not** a plugin `userConfig` key: userConfig prompts the user at enable time, which is
  friction for an optional tuning value. If it is ever added, plumb it through `${user_config.TICK_SECONDS}` in the hook
  command so the env variable stays the single name.

## Conventions

- **One vocabulary.** The plugin is `wall-clock`, the script is `wall-clock.js`, the injected tag is `<wall-clock>`, and
  one emission is a **tick**. Never introduce a second word for any of them.
- **Env knobs are `FOUNDRY_<PLUGIN>_<KNOB>`** — the marketplace prefix scopes every cc-foundry knob.
- **Elapsed values are computed in the hook**, never left to the model. An injected figure must never require the model
  to subtract two timestamps.
- **Exit 0 always.** A hook that disturbs a session is worse than a missing tick.
- **Sync `fs` calls are correct here** — this is a one-shot CLI process with no event loop to starve.
- **Format with the neighbouring hooks' style** (4-space indent, single quotes), not the repo's Prettier JS defaults.
  Prettier owns markdown in this repo.

## Known Limits

- **Window-bounded scan** — the tail scan reads 256 KB, once, and never retries wider. A burst of large tool output
  pushes both the anchor and the previous tick out of view, so that tick carries the time without an elapsed figure and
  is not throttled against its predecessor. A period longer than the window can hold degrades to a shorter one, which
  puts the practical ceiling on the knob in minutes, not hours.
- **Subagents unverified** — hook payloads carry `agent_id` inside a subagent, so batch ticks probably fire in teammate
  loops anchored on the spawn prompt. Untested.
- **No session age and no tool durations.** `turn` is the only elapsed figure during autonomous work. Session age needs
  a second read of the transcript head; the file's `birthtime` is not the session start.
