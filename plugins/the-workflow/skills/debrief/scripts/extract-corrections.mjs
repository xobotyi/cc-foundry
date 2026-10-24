#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

const REJECTION_PREFIX = "The user doesn't want to proceed with this tool use";
const INTERRUPT_PREFIX = "[Request interrupted by user";
const SKILL_BODY_PREFIX = "Base directory for this skill:";
const COMMAND_NAME = /<command-name>\/([^<\s]+)<\/command-name>/;
const RAN_AND_FAILED = /^Exit code \d+/;
const ERROR_LIMIT = 300;
const SIGNATURE_LIMIT = 160;
const MEMORY_INDEX = "MEMORY.md";
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const MANAGED_SETTINGS =
	{
		darwin: "/Library/Application Support/ClaudeCode/managed-settings.json",
		win32: "C:\\Program Files\\ClaudeCode\\managed-settings.json",
	}[process.platform] ?? "/etc/claude-code/managed-settings.json";
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

async function repositoryRoot(start) {
	for (let dir = start; ; dir = path.dirname(dir)) {
		const marker = path.join(dir, ".git");
		const gitdir = /^gitdir:\s*(.+)$/m.exec(await readFile(marker, "utf8").catch(() => ""))?.[1];
		const linked = gitdir && /^(.*)\/\.git\/worktrees\/[^/]+$/.exec(path.resolve(dir, gitdir.trim()));
		if (linked) return linked[1];
		if (await exists(marker)) return dir;
		if (path.dirname(dir) === dir) return start;
	}
}

const repositories = new Map();

async function repositoryOf(cwd) {
	if (!cwd) return null;
	const folded = path.resolve(cwd.replace(WORKTREE_SUFFIX, ""));
	if (!repositories.has(folded)) repositories.set(folded, repositoryRoot(folded));
	return repositories.get(folded);
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

function errorLine(text) {
	const line = text
		.replaceAll(/<\/?tool_use_error>/g, "")
		.split("\n")
		.map((candidate) => candidate.trim())
		.find((candidate) => candidate !== "" && !/^<[^>]+>$/.test(candidate));
	return truncate(line ?? "", ERROR_LIMIT);
}

function errorSignature(tool, line) {
	const masked = line.replaceAll(/(?:~|\/)[^\s:'"`,)]+/g, "<path>").replaceAll(/\d+/g, "<n>");
	return `${tool}: ${masked.slice(0, SIGNATURE_LIMIT)}`;
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
	const skills = new Set();
	let typedCommand;
	const calls = new Map();
	const unresolved = new Map();

	const candidate = (entry, signal, text) => ({
		id: entry.uuid,
		project,
		session: entry.sessionId,
		at: entry.timestamp,
		signal,
		text: truncate(text, TEXT_LIMIT),
		said: truncate(said, SAID_LIMIT),
		did,
		skills: [...skills],
	});

	for await (const line of lines) {
		const entry = parseEntry(line);
		if (entry === undefined || entry.isSidechain) continue;
		if (entry.entrypoint?.startsWith("sdk-")) return;
		project ??= await repositoryOf(entry.cwd);

		if (entry.type === "assistant") {
			answered = true;
			for (const block of entry.message?.content ?? []) {
				if (block.type === "text" && block.text.trim() !== "") said = block.text;
				if (block.type === "tool_use") did = [...did, describeTool(block)].slice(-DID_LIMIT);
				if (block.type === "tool_use") calls.set(block.id, { tool: block.name, call: describeTool(block) });
				if (block.type === "tool_use" && block.name === "Skill" && typeof block.input?.skill === "string")
					skills.add(block.input.skill);
			}
			continue;
		}

		const inWindow = Date.parse(entry.timestamp) >= since;

		if (entry.type === "attachment" && entry.attachment?.type === "invoked_skills") {
			for (const { name } of entry.attachment.skills ?? []) if (typeof name === "string") skills.add(name);
			continue;
		}
		if (entry.type === "attachment" && isHumanQueuedCommand(entry.attachment)) {
			if (held) yield held;
			held = undefined;
			if (inWindow) yield candidate(entry, "mid-turn", contentText(entry.attachment.prompt));
			continue;
		}
		if (entry.type !== "user") continue;
		sessionHasOrigin ||= "origin" in entry;

		const { content } = entry.message ?? {};
		for (const block of Array.isArray(content) ? content : []) {
			const call = block.type === "tool_result" ? calls.get(block.tool_use_id) : undefined;
			if (call === undefined) continue;
			if (!block.is_error) {
				const failed = unresolved.get(call.tool);
				unresolved.delete(call.tool);
				if (failed) yield { ...failed, fix: call.call };
				continue;
			}
			const text = contentText(block.content);
			if (text.startsWith(REJECTION_PREFIX) || text.startsWith(INTERRUPT_PREFIX) || RAN_AND_FAILED.test(text)) continue;
			const line = errorLine(text);
			if (!inWindow || line === "") continue;
			if (unresolved.has(call.tool)) yield unresolved.get(call.tool);
			unresolved.set(call.tool, {
				id: `${entry.uuid}/${block.tool_use_id}`,
				project,
				session: entry.sessionId,
				at: entry.timestamp,
				signal: "tool-error",
				signature: errorSignature(call.tool, line),
				text: line,
				did: [call.call],
				skills: [...skills],
			});
		}
		const body = contentText(content);
		if (typedCommand && entry.isMeta && body.startsWith(SKILL_BODY_PREFIX)) skills.add(typedCommand);
		typedCommand = COMMAND_NAME.exec(body)?.[1];
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
	yield* unresolved.values();
}

function recurringErrors(occurrences, minSessions) {
	const groups = new Map();
	for (const occurrence of occurrences) {
		const group = groups.get(occurrence.signature) ?? { count: 0, sessions: new Set(), projects: new Set() };
		group.count += 1;
		group.sessions.add(occurrence.session);
		group.projects.add(occurrence.project);
		group.latest = occurrence;
		groups.set(occurrence.signature, group);
	}
	return [...groups]
		.filter(([, { count, sessions }]) => count >= 2 && sessions.size >= minSessions)
		.map(([signature, { count, sessions, projects, latest }]) => ({
			id: `error:${signature}`,
			projects: [...projects],
			at: latest.at,
			signal: "tool-error",
			text: latest.text,
			count,
			sessions: sessions.size,
			did: latest.did,
			fix: latest.fix,
			skills: latest.skills,
		}));
}

async function transcriptDirs(projectsDir) {
	return (await readdir(projectsDir, { withFileTypes: true }))
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => path.join(projectsDir, dirent.name));
}

async function dirRepository(dir) {
	const newest = (await transcriptFiles([dir], 0)).at(-1);
	return newest === undefined ? null : repositoryOf((await sessionHead(newest.file)).cwd);
}

async function projectDirs(projectsDir, projects, allProjects) {
	const dirs = await transcriptDirs(projectsDir);
	if (allProjects) return dirs;

	const owners = await Promise.all(dirs.map(async (dir) => ({ dir, repository: await dirRepository(dir) })));
	const selected = [];
	for (const projectDir of projects) {
		const repository = await repositoryOf(projectDir);
		const matched = owners.filter((owner) => owner.repository === repository);
		if (matched.length === 0)
			throw new Error(`no transcripts for ${projectDir}: no session under ${projectsDir} ran in ${repository}`);
		selected.push(...matched.map(({ dir }) => dir));
	}
	return selected;
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

async function exists(file) {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

async function readJson(file) {
	try {
		return JSON.parse(await readFile(file, "utf8"));
	} catch {
		return undefined;
	}
}

async function setting(project, configDir, key) {
	const layers = [
		MANAGED_SETTINGS,
		path.join(project, ".claude", "settings.local.json"),
		path.join(project, ".claude", "settings.json"),
		path.join(configDir, "settings.json"),
	];
	for (const file of layers) {
		const value = (await readJson(file))?.[key];
		if (value !== undefined) return value;
	}
	return undefined;
}

async function memoryDir(project, configDir, projectsDir) {
	const forced = process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY;
	if (forced === "1") return undefined;
	if (forced !== "0" && (await setting(project, configDir, "autoMemoryEnabled")) === false) return undefined;
	const custom = await setting(project, configDir, "autoMemoryDirectory");
	if (typeof custom === "string") return custom.startsWith("~/") ? path.join(homedir(), custom.slice(2)) : custom;
	const slug = project.replace(/[^a-zA-Z0-9]/g, "-");
	const dir = path.join(projectsDir, slug, "memory");
	return (await exists(dir)) ? dir : undefined;
}

function frontmatterValue(head, key) {
	const match = new RegExp(`^${key}:[ \\t]*(.*)((?:\\n[ \\t]+.*)*)`, "m").exec(head);
	if (match === null) return undefined;
	const [, first, rest] = match;
	const folded = /^[>|][-+]?$/.test(first.trim()) ? rest : `${first}${rest}`;
	return folded
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ")
		.replace(/^"(.*)"$/, "$1");
}

async function memoryRecords(project, dir, since) {
	const records = [];
	for (const name of await readdir(dir)) {
		if (!name.endsWith(".md") || name === MEMORY_INDEX) continue;
		const file = path.join(dir, name);
		const { mtimeMs } = await stat(file);
		if (mtimeMs < since) continue;
		const text = await readFile(file, "utf8");
		const frontmatter = FRONTMATTER.exec(text);
		const head = frontmatter?.[1] ?? "";
		const description = frontmatterValue(head, "description");
		const body = (frontmatter ? text.slice(frontmatter[0].length) : text).trim();
		records.push({
			id: `memory:${file}`,
			project,
			at: new Date(mtimeMs).toISOString(),
			signal: "memory",
			type: /^\s*type:\s*(\S+)/m.exec(head)?.[1],
			file,
			text: truncate([description, body].filter(Boolean).join("\n\n"), TEXT_LIMIT),
		});
	}
	return records.toSorted((a, b) => a.at.localeCompare(b.at));
}

async function listProjects(projectsDir) {
	const projects = new Map();
	for (const dir of await transcriptDirs(projectsDir)) {
		const files = await transcriptFiles([dir], 0);
		if (files.length === 0) continue;
		const newest = files.at(-1);
		const head = await sessionHead(newest.file);
		if (head.entrypoint?.startsWith("sdk-")) continue;
		const project = (await repositoryOf(head.cwd)) ?? dir;
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
		const errors = [];
		const write = (record) => {
			counts[record.signal] = (counts[record.signal] ?? 0) + 1;
			for (const project of record.projects ?? [record.project]) projects.add(project);
			process.stdout.write(`${JSON.stringify(record)}\n`);
		};
		for (const { file } of files) {
			for await (const candidate of sessionCandidates(file, since)) {
				if (candidate.id !== undefined && emitted.has(candidate.id)) continue;
				emitted.add(candidate.id);
				if (candidate.signal === "tool-error") errors.push(candidate);
				else write(candidate);
			}
		}
		for (const error of recurringErrors(errors, values.session === undefined ? 2 : 1)) write(error);

		const memorySince = new Map();
		for (const { file } of files) {
			const head = await sessionHead(file);
			const project = await repositoryOf(head.cwd);
			if (project === null || head.entrypoint?.startsWith("sdk-")) continue;
			const start = values.session === undefined ? since : Date.parse(head.timestamp) || since;
			memorySince.set(project, Math.min(memorySince.get(project) ?? Infinity, start));
		}
		for (const [project, start] of memorySince) {
			const dir = await memoryDir(project, configDir, projectsDir);
			if (dir === undefined) continue;
			for (const record of await memoryRecords(project, dir, start)) {
				if (emitted.has(record.id)) continue;
				emitted.add(record.id);
				write(record);
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
