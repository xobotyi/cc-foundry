import type {On, PluginOptions} from 'claude-code';

type Loop = {
	turnStartedAt: number | undefined;
	lastTickAt: number | undefined;
	hasLegend: boolean;
};

const TICK_DEFAULT_SECONDS = 60;
const TURN_END_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const LEGEND =
	// constraint: `date` takes only POSIX flags here — GNU long options and BSD-only flags differ across hosts
	'The latest <wall-clock> is now; earlier ones are history. Run `date +%Y-%m-%dT%H:%M:%S%z` when a turn needs precision.';

const COMPACT_NOTE =
	'When compacting, drop every <wall-clock .../> block and its legend. They are re-injected automatically.';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (value: number): string => String(value).padStart(2, '0');

const newLoop = (): Loop => ({
	turnStartedAt: undefined,
	lastTickAt: undefined,
	hasLegend: false,
});

const turnEndKeyOf = (sessionId: string): string => `turnEndedAt:${sessionId}`;

function hms(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);

	if (hours > 0) {
		return `${hours}h${pad(minutes)}m`;
	}

	return minutes > 0 ? `${minutes}m${pad(total % 60)}s` : `${total}s`;
}

function stamp(epochMs: number): string {
	const date = new Date(epochMs);
	const offset = -date.getTimezoneOffset();
	const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	const zone = `${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;

	return `${DAYS[date.getDay()] ?? ''} ${ymd} ${time}${zone}`;
}

function tickOf(loop: Loop, now: number, elapsed: string | undefined): string {
	const fields = elapsed === undefined ? '' : ` ${elapsed}`;

	return `<wall-clock at="${stamp(now)}"${fields}/>${loop.hasLegend ? '' : `\n${LEGEND}`}`;
}

/**
 * Registers the wall clock: a tick, `<wall-clock at="Wed 2026-10-28 19:49:05+01:00" .../>` in local time, enters the
 * model's context beside a prompt and after a tool result, in the main conversation and in a subagent's alike.
 *
 * A prompt submitted while the session is idle carries `away`, the time since the last turn of this session's main
 * conversation ended. The mod keeps that time in its store under the session id for 30 days, so a resumed session
 * carries `away` and a session with no earlier turn has none. A prompt submitted while a turn runs gets no tick, and
 * the next tool result of the main conversation carries one whatever the period. A tool result carries `turn`, the
 * time since its conversation's turn started, at most once per period, and a prompt's tick counts toward the period. A
 * denied call gets no tick.
 *
 * The first tick of a conversation carries a legend, and so does the first one after a compaction, `/clear`, or a
 * resume. A compaction is told to drop the ticks and the legend.
 *
 * @param on the engine's registrar
 * @param options the plugin's `userConfig` values: `tickSeconds`, the period in seconds, 60 by default; 0 sets no
 *   minimum, and a negative value reads as the default
 */
export function register(on: On, options: PluginOptions): void {
	const {tickSeconds} = options;
	const tickMs = (typeof tickSeconds === 'number' && tickSeconds >= 0 ? tickSeconds : TICK_DEFAULT_SECONDS) * 1000;
	const agents = new Map<string, Loop>();
	let main = newLoop();

	const loopOf = (agentId: string | undefined): Loop => {
		if (agentId === undefined) return main;

		let loop = agents.get(agentId);
		if (loop === undefined) {
			loop = newLoop();
			agents.set(agentId, loop);
		}

		return loop;
	};

	on('prompt.submit', async ($, e, next) => {
		const loop = main;
		if (e.turnId !== undefined) {
			loop.lastTickAt = undefined;

			return next(e);
		}

		const now = await $.clock.now();
		const turnEndedAt = await $.store.get(turnEndKeyOf(await $.session.id()));
		const away = typeof turnEndedAt === 'number' ? `away="${hms(now - turnEndedAt)}"` : undefined;
		const submitted = await next({...e, context: [...(e.context ?? []), tickOf(loop, now, away)]});
		if (submitted.drop === undefined) {
			loop.lastTickAt = now;
			loop.hasLegend = true;
		}

		return submitted;
	});

	on('turn.start', async ($, e, next) => {
		loopOf(e.agentId).turnStartedAt = await $.clock.now();

		return next(e);
	});

	on('turn.complete', async ($, e, next) => {
		if (e.agentId === undefined) await $.store.set(turnEndKeyOf(await $.session.id()), await $.clock.now());

		return next(e);
	});

	on('session.start', async ($, e, next) => {
		const oldest = (await $.clock.now()) - TURN_END_RETENTION_MS;
		for (const key of await $.store.keys()) {
			const turnEndedAt = await $.store.get(key);
			if (typeof turnEndedAt !== 'number' || turnEndedAt < oldest) await $.store.delete(key);
		}

		return next(e);
	});

	on('tool.call', async ($, e, next) => {
		const call = await next(e);
		if (call.deny !== undefined) return call;

		const now = await $.clock.now();
		const loop = loopOf(e.agentId);
		if (loop.lastTickAt !== undefined && now - loop.lastTickAt < tickMs) return call;

		const turn = loop.turnStartedAt === undefined ? undefined : `turn="${hms(now - loop.turnStartedAt)}"`;
		const context = [...(call.context ?? []), tickOf(loop, now, turn)];
		loop.lastTickAt = now;
		loop.hasLegend = true;

		return {...call, context};
	});

	on('session.compact', async ($, e, next) => {
		const instructions = e.instructions === undefined ? COMPACT_NOTE : `${e.instructions}\n\n${COMPACT_NOTE}`;
		const compaction = await next({...e, instructions});
		if (compaction.skip === undefined) loopOf(e.agentId).hasLegend = false;

		return compaction;
	});

	on('session.end', async ($, e, next) => {
		if (e.reason === 'clear' || e.reason === 'resume') main = newLoop();

		return next(e);
	});
}
