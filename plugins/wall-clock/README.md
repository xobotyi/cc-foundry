# wall-clock

Claude Code tells the model today's date and nothing else about time. This plugin puts the wall clock into context at
the moments the agent is about to act.

## The Problem

The session date is injected once at startup and frozen for the life of the process. There is no time of day, no
timezone, and no elapsed-time signal anywhere the model can see. The results are ordinary and irritating:

- It picks up as though you never left, because a two-hour break looks exactly like a two-second one.
- It guesses at timestamps when it writes notes, logs, or documents.
- It cannot judge whether the file it read is a minute old or three hours old.
- After an hour of unattended work it has no idea how long the work took, which matters the moment you want that hour in
  a tracker.

An MCP time server does not fix this. The model has to choose to call it, and not knowing it should ask is the actual
problem.

## The Solution

Three hooks and one script. Nothing to configure to get started:

- **On every prompt** — `<wall-clock at="Mon 2026-08-17 18:21:19+02:00" away="1h04m"/>`. The `away` figure is the gap
  since the agent last spoke, so a returning user is visible.
- **During a turn** — `<wall-clock at="…" turn="12m30s"/>`, at most once a minute. Long autonomous runs stay time-aware
  without the agent stopping to run a command.
- **Before compaction** — a note telling the compactor to drop the accumulated blocks, since the next turn re-injects a
  fresh one.

The first tick of a session carries one extra line explaining that the newest block is the current time and that `date`
answers when a turn needs better precision than the last tick.

Two design choices matter for how much you can trust the numbers. Elapsed figures are computed in the hook, so the model
never subtracts timestamps and never invents a duration. And there is no state file: every figure comes from the
transcript Claude Code is already writing, so a resumed session, a crash, or two sessions in the same project cannot
produce a stale reading.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install wall-clock
```

## Configuration

The tick period defaults to one minute. Change it in `~/.claude/settings.json` or a project's
`.claude/settings.local.json`:

```json
{ "env": { "FOUNDRY_WALL_CLOCK_TICK_SECONDS": "300" } }
```

`0` ticks on every tool batch. That helps when you are debugging something timing-sensitive, and costs tokens the rest
of the time. A value that is not a non-negative number is ignored with a warning on stderr, and the default applies.

Budget for the context cost before you lower it: a tick is roughly 20 tokens, so a minute-long period costs about 1.2k
tokens per hour of continuous autonomous work.

## What It Costs

The script spawns on every prompt and every tool batch, whether or not it emits anything, because deciding to stay quiet
means finding the previous tick first. Each run reads at most 256 KB from the end of the transcript, no matter how large
that file grows, and those bytes are almost always in the page cache because Claude Code wrote them moments earlier. One
run takes about 26ms, most of it Node startup.

## Limits

- The scan only sees the last 256 KB of the transcript, and it never reads more. A burst of very large tool output
  pushes the previous tick and the start of your turn out of view, so that tick reports the time with no elapsed figure.
  For the same reason a period longer than the window can hold degrades to a shorter one, which keeps the knob practical
  in minutes rather than hours.
- Teammates and subagents are untested. Hook payloads carry an agent id inside a subagent, so ticks probably do fire
  there, anchored on the spawn prompt.
- `turn` is the only elapsed figure during a turn. There is no session age and no per-tool duration yet.

## License

MIT
