<div align="center">

# wall-clock

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code 2.1.319+](https://img.shields.io/badge/Claude%20Code-2.1.319%2B%20mod-d97757.svg)](https://claude.com/blog/claude-code-mods)

</div>

The agent knows the time of day, how long you were away, and how long its current turn has run.

Two ticks from one turn of a session in this repository ([`hooks/register.ts`](hooks/register.ts)):

```text
<wall-clock at="Thu 2026-10-29 11:24:09+01:00" away="2m36s"/>
<wall-clock at="Thu 2026-10-29 11:25:14+01:00" turn="1m05s"/>
```

The first arrived with the prompt, two and a half minutes after the agent last spoke. The second arrived a minute into
the turn, while the agent was working.

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

One mod that Claude Code loads itself. It runs no process and needs nothing installed besides Claude Code:

- **On a prompt** — `<wall-clock at="Mon 2026-08-17 18:21:19+02:00" away="1h04m"/>`. The `away` figure is the time since
  the agent's last turn ended, so a returning user is visible.
- **During a turn** — `<wall-clock at="…" turn="12m30s"/>` after a tool result, at most once a minute. Long autonomous
  runs stay time-aware without the agent stopping to run a command. A subagent gets its own ticks, counted from the
  start of its own turn.
- **Before compaction** — a note telling the compactor to drop the accumulated blocks, since the next tick brings a
  fresh one.

The first tick of a conversation carries one extra line explaining that the newest block is the current time and that
`date` answers when a turn needs better precision than the last tick.

Elapsed figures are computed in the mod, so the model never subtracts timestamps and never invents a duration. The mod
saves when the last turn of each session ended, so a session you resume the next day still reports how long you were
away, and one session never borrows the figure of another. Where it has nothing to count from, it gives the time alone
instead of guessing.

## Installation

```text
/plugin install wall-clock --marketplace xobotyi/cc-foundry
```

## Configuration

The tick period defaults to one minute. Change **Tick period** for `wall-clock` in `/config`, or set the `tickSeconds`
option in your user `settings.json`:

```json
{"pluginConfigs": {"wall-clock@foundry": {"options": {"tickSeconds": 300}}}}
```

`0` sets no minimum, so a tick follows each tool call that was not denied. That helps when you are debugging something
timing-sensitive, and costs tokens the rest of the time. A negative value is read as the default.

Budget for the context cost before you lower it: a tick is roughly 20 tokens, so a minute-long period costs about 1.2k
tokens per hour of continuous autonomous work.

## Limits

- `away` needs a saved turn end of the same session on the same machine. A new session, a forked one, a session you
  continue on another machine, and one you resume after more than 30 days start with the time alone.
- A prompt you type while a turn is still running gets no tick, because Claude Code queues it and the time would be old
  by the time the model reads it. The next tool result carries one instead.
- On a machine with managed settings, Claude Code does not let a mod you installed yourself add to the compaction
  instructions, so the compactor gets no note there. The ticks are unaffected.
- `away` and `turn` are the only elapsed figures. There is no session age and no per-tool duration.

## License

MIT
