#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

const REJECTION_PREFIX = "The user doesn't want to proceed with this tool use";
const INTERRUPT_PREFIX = "[Request interrupted by user";
const TEXT_LIMIT = 2000;
const SAID_LIMIT = 600;
const DID_LIMIT = 3;
const INPUT_LIMIT = 160;
const INPUT_KEYS = ["file_path", "command", "pattern", "skill", "description", "url", "query", "prompt"];
const DAY_MS = 86_400_000;
const WORKTREE_SUFFIX = /\/\.claude\/worktrees\/[^/]+.*$/;

function parseSince(value) {
	if (value === undefined) return 0;
	const days = /^(\d+)d$/.exec(value);
	const since = days ? Date.now() - Number(days[1]) * DAY_MS : Date.parse(value);
	if (Number.isNaN(since)) throw new Error(`--since ${value}: expected a date or a day count such as 14d`);
	return since;
}

function projectOf(cwd) {
	return cwd?.replace(WORKTREE_SUFFIX, "") ?? null;
}

function parseEntry(line) {
	try {
		return JSON.parse(line);
	} catch {
		return undefined;
	}
}

function truncate(text, limit) {
	return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function contentText(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content
		.filter((block) => block.type === "text")
		.map((block) => block.text)
		.join("\n");
}

function describeTool({ name, input }) {
	const key = INPUT_KEYS.find((candidate) => typeof input?.[candidate] === "string");
	const detail = key ? input[key] : JSON.stringify(input ?? {});
	return `${name} ${truncate(detail.replaceAll("\n", " "), INPUT_LIMIT)}`;
}

function isRejection(content) {
	return (
		Array.isArray(content) &&
		content.some((block) => block.type === "tool_result" && contentText(block.content).startsWith(REJECTION_PREFIX))
	);
}

function isHumanPrompt(entry, sessionHasOrigin) {
	if (entry.isMeta || entry.isCompactSummary) return false;
	const { content } = entry.message ?? {};
	if (Array.isArray(content) && content.some((block) => block.type === "tool_result")) return false;
	const text = contentText(content).trimStart();
	if (text === "" || text.startsWith("<") || text.startsWith(INTERRUPT_PREFIX)) return false;
	if ("origin" in entry) return entry.origin?.kind === "human";
	return !sessionHasOrigin && !text.startsWith("/");
}

function isHumanQueuedCommand(attachment) {
	if (attachment?.type !== "queued_command") return false;
	if (attachment.origin != null) return attachment.origin.kind === "human";
	return attachment.commandMode === "prompt" && !contentText(attachment.prompt).trimStart().startsWith("<");
}

async function* sessionCandidates(file, since) {
	const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
	let opening = true;
	let held;
	let lastParent;
	const promptParents = new Set();
	let answered = false;
	let said = "";
	let did = [];
	let pending;
	let project = null;
	let sessionHasOrigin = false;

	const candidate = (entry, signal, text) => ({
		id: entry.uuid,
		project,
		session: entry.sessionId,
		at: entry.timestamp,
		signal,
		text: truncate(text, TEXT_LIMIT),
		said: truncate(said, SAID_LIMIT),
		did,
	});

	for await (const line of lines) {
		const entry = parseEntry(line);
		if (entry === undefined || entry.isSidechain) continue;
		if (entry.entrypoint?.startsWith("sdk-")) return;
		project ??= projectOf(entry.cwd);

		if (entry.type === "assistant") {
			answered = true;
			for (const block of entry.message?.content ?? []) {
				if (block.type === "text" && block.text.trim() !== "") said = block.text;
				if (block.type === "tool_use") did = [...did, describeTool(block)].slice(-DID_LIMIT);
			}
			continue;
		}

		const inWindow = Date.parse(entry.timestamp) >= since;

		if (entry.type === "attachment" && isHumanQueuedCommand(entry.attachment)) {
			if (held) yield held;
			held = undefined;
			if (inWindow) yield candidate(entry, "mid-turn", contentText(entry.attachment.prompt));
			continue;
		}
		if (entry.type !== "user") continue;
		sessionHasOrigin ||= "origin" in entry;

		const { content } = entry.message ?? {};
		if (isRejection(content)) {
			pending = "rejection";
			continue;
		}
		if (contentText(content).startsWith(INTERRUPT_PREFIX)) {
			pending ??= "interrupt";
			continue;
		}
		if (!isHumanPrompt(entry, sessionHasOrigin)) continue;

		const text = contentText(content).trim();
		const parent = entry.parentUuid;
		if (parent != null && parent === lastParent && !answered) {
			if (held) held = { ...held, id: entry.uuid, at: entry.timestamp, text: truncate(text, TEXT_LIMIT) };
		} else {
			if (held) yield held;
			const signal = parent != null && promptParents.has(parent) ? "rewind" : (pending ?? "follow-up");
			held = !opening && inWindow ? candidate(entry, signal, text) : undefined;
			opening = false;
			said = "";
			did = [];
		}
		promptParents.add(parent);
		lastParent = parent;
		answered = false;
		pending = undefined;
	}
	if (held) yield held;
}

async function projectDirs(projectsDir, projects, allProjects) {
	const names = (await readdir(projectsDir, { withFileTypes: true }))
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
	if (allProjects) return names.map((name) => path.join(projectsDir, name));

	return projects.flatMap((projectDir) => {
		const slug = path.resolve(projectDir).replace(/[^a-zA-Z0-9]/g, "-");
		const worktreePrefix = `${slug}--claude-worktrees-`;
		const matched = names.filter((name) => name === slug || name.startsWith(worktreePrefix));
		if (matched.length === 0)
			throw new Error(`no transcripts for ${projectDir}: ${path.join(projectsDir, slug)} does not exist`);
		return matched.map((name) => path.join(projectsDir, name));
	});
}

async function transcriptFiles(dirs, since, session) {
	const files = [];
	for (const dir of dirs) {
		for (const name of await readdir(dir)) {
			if (!name.endsWith(".jsonl") || (session !== undefined && name !== `${session}.jsonl`)) continue;
			const file = path.join(dir, name);
			const { mtimeMs } = await stat(file);
			if (mtimeMs >= since) files.push({ file, mtimeMs });
		}
	}
	return files.toSorted((a, b) => a.mtimeMs - b.mtimeMs);
}

async function sessionHead(file) {
	const input = createReadStream(file);
	try {
		for await (const line of createInterface({ input, crlfDelay: Infinity })) {
			const entry = parseEntry(line);
			if (entry?.cwd) return entry;
		}
		return {};
	} finally {
		input.destroy();
	}
}

async function listProjects(projectsDir) {
	const projects = new Map();
	for (const dir of await projectDirs(projectsDir, [], true)) {
		const files = await transcriptFiles([dir], 0);
		if (files.length === 0) continue;
		const newest = files.at(-1);
		const head = await sessionHead(newest.file);
		if (head.entrypoint?.startsWith("sdk-")) continue;
		const project = projectOf(head.cwd) ?? dir;
		const known = projects.get(project) ?? { sessions: 0, last: 0 };
		projects.set(project, { sessions: known.sessions + files.length, last: Math.max(known.last, newest.mtimeMs) });
	}
	return [...projects].toSorted(([, a], [, b]) => b.last - a.last);
}

const { values } = parseArgs({
	options: {
		project: { type: "string", multiple: true, default: [process.cwd()] },
		"all-projects": { type: "boolean", default: false },
		"list-projects": { type: "boolean", default: false },
		since: { type: "string" },
		session: { type: "string" },
		"projects-dir": { type: "string" },
	},
});

try {
	const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(homedir(), ".claude");
	const projectsDir = values["projects-dir"] ?? path.join(configDir, "projects");

	if (values["list-projects"]) {
		for (const [project, { sessions, last }] of await listProjects(projectsDir)) {
			process.stdout.write(`${new Date(last).toISOString().slice(0, 10)}\t${sessions}\t${project}\n`);
		}
	} else {
		const since = parseSince(values.since);
		const dirs = await projectDirs(projectsDir, values.project, values["all-projects"]);
		const files = await transcriptFiles(dirs, since, values.session);

		const counts = {};
		const projects = new Set();
		const emitted = new Set();
		for (const { file } of files) {
			for await (const candidate of sessionCandidates(file, since)) {
				if (candidate.id !== undefined && emitted.has(candidate.id)) continue;
				emitted.add(candidate.id);
				counts[candidate.signal] = (counts[candidate.signal] ?? 0) + 1;
				projects.add(candidate.project);
				process.stdout.write(`${JSON.stringify(candidate)}\n`);
			}
		}
		const summary = Object.entries(counts)
			.map(([signal, count]) => `${signal} ${count}`)
			.join(", ");
		process.stderr.write(`candidates from ${projects.size} repositories: ${summary || "none"}\n`);
	}
} catch (err) {
	process.stderr.write(`extract-corrections: ${err.message}\n`);
	process.exitCode = 1;
}
