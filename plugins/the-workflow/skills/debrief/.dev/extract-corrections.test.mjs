import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, suite, test } from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCRIPT = path.join(import.meta.dirname, "..", "scripts", "extract-corrections.mjs");
const PROJECT = "/work/acme.app";
const SLUG = "-work-acme-app";

const human = (at, text) => ({
	type: "user",
	origin: { kind: "human" },
	timestamp: at,
	sessionId: "s1",
	message: { role: "user", content: text },
});
const assistant = (at, ...content) => ({
	type: "assistant",
	timestamp: at,
	sessionId: "s1",
	message: { role: "assistant", content },
});
const toolResult = (at, text, isError) => ({
	type: "user",
	timestamp: at,
	sessionId: "s1",
	message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", is_error: isError, content: text }] },
});
const marker = (at, text) => ({
	type: "user",
	timestamp: at,
	sessionId: "s1",
	message: { role: "user", content: [{ type: "text", text }] },
});
const queued = (at, kind, prompt) => ({
	type: "attachment",
	timestamp: at,
	sessionId: "s1",
	attachment: { type: "queued_command", prompt, commandMode: "prompt", origin: { kind } },
});

const unattributed = (at, text) => ({
	type: "user",
	timestamp: at,
	sessionId: "s1",
	message: { role: "user", content: text },
});
const LATE = { ...human("2026-10-20T10:00:00Z", "late follow-up"), uuid: "u-late", cwd: `${PROJECT}/packages/api` };

const SESSION = [
	human("2026-10-01T10:00:00Z", "build the feature"),
	assistant(
		"2026-10-01T10:00:01Z",
		{ type: "text", text: "Editing the handler." },
		{ type: "tool_use", id: "t1", name: "Edit", input: { file_path: "/work/acme.app/a.js" } },
	),
	toolResult(
		"2026-10-01T10:00:02Z",
		"The user doesn't want to proceed with this tool use. The tool use was rejected.",
		true,
	),
	marker("2026-10-01T10:00:02Z", "[Request interrupted by user for tool use]"),
	human("2026-10-01T10:00:03Z", "no, keep the handler pure"),
	assistant("2026-10-01T10:00:04Z", { type: "tool_use", id: "t2", name: "Bash", input: { command: "npm test" } }),
	queued("2026-10-01T10:00:05Z", "human", [{ type: "text", text: "also run lint" }]),
	queued("2026-10-01T10:00:05Z", "channel", '<channel source="gerrit">review</channel>'),
	marker("2026-10-01T10:00:06Z", "[Request interrupted by user]"),
	{ ...human("2026-10-01T10:00:07Z", "stop, wrong suit"), parentUuid: "p1" },
	{ ...human("2026-10-01T10:00:08Z", "stop, wrong suite"), parentUuid: "p1" },
	assistant("2026-10-01T10:00:08Z", {
		type: "tool_use",
		id: "t3",
		name: "Write",
		input: { file_path: "/work/acme.app/b.js" },
	}),
	{ ...human("2026-10-01T10:00:09Z", "use the existing helper"), parentUuid: "p1" },
	{
		type: "user",
		isMeta: true,
		timestamp: "2026-10-01T10:00:09Z",
		sessionId: "s1",
		message: { role: "user", content: "<local-command-caveat>x</local-command-caveat>" },
	},
	human("2026-10-01T10:00:09Z", "<command-name>/handoff</command-name>"),
	{ ...human("2026-10-01T10:00:10Z", "subagent prompt"), isSidechain: true },
	toolResult("2026-10-01T10:00:11Z", "ok", false),
	unattributed("2026-10-01T10:00:12Z", "Another Claude session sent a message: report ready"),
	unattributed("2026-10-01T10:00:13Z", "/compact keep the plan"),
	{ ...unattributed("2026-10-01T10:00:14Z", "This session is being continued"), isCompactSummary: true },
	LATE,
];

const LEARN = "/work/learn.app";
const LEARN_SLUG = "-work-learn-app";

const skillSession = [
	human("2026-10-05T10:00:00Z", "open"),
	assistant("2026-10-05T10:00:01Z", {
		type: "tool_use",
		id: "k1",
		name: "Skill",
		input: { skill: "the-coder:coding" },
	}),
	human("2026-10-05T10:00:02Z", "<command-message>compact</command-message>\n<command-name>/compact</command-name>"),
	human("2026-10-05T10:00:03Z", "<command-name>/git-commit:commit</command-name>"),
	{
		...unattributed("2026-10-05T10:00:03Z", "Base directory for this skill: /skills/commit\n\n# Commit"),
		isMeta: true,
	},
	{
		type: "attachment",
		timestamp: "2026-10-05T10:00:04Z",
		sessionId: "s1",
		attachment: { type: "invoked_skills", skills: [{ name: "deep-research", path: "userSettings:deep-research" }] },
	},
	human("2026-10-05T10:00:05Z", "correction after skills"),
];

const call = (at, id, name, input) => assistant(at, { type: "tool_use", id, name, input });
const result = (at, id, text, isError, uuid) => ({
	...toolResult(at, text, isError),
	uuid,
	message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, is_error: isError, content: text }] },
});
const NOT_FOUND = "<tool_use_error>String to replace not found in file.\nString: foo</tool_use_error>";

const errorSession = [
	human("2026-10-06T10:00:00Z", "open"),
	call("2026-10-06T10:00:01Z", "e1", "Edit", { file_path: "/work/learn.app/a.js" }),
	result("2026-10-06T10:00:02Z", "e1", NOT_FOUND, true, "r7a"),
	call("2026-10-06T10:00:03Z", "e2", "Edit", { file_path: "/work/learn.app/b.js" }),
	result("2026-10-06T10:00:04Z", "e2", "ok", false, "r7b"),
	call("2026-10-06T10:00:05Z", "b1", "Bash", { command: "npm test" }),
	result("2026-10-06T10:00:06Z", "b1", "Exit code 1\nFAIL suite", true, "r7c"),
	call("2026-10-06T10:00:07Z", "r1", "Read", { file_path: "/work/learn.app/missing.js" }),
	result("2026-10-06T10:00:08Z", "r1", "File does not exist.", true, "r7d"),
].map((entry) => ({ ...entry, sessionId: "s7" }));

const repeatSession = [
	human("2026-10-07T10:00:00Z", "open"),
	call("2026-10-07T10:00:01Z", "e3", "Edit", { file_path: "/work/learn.app/c.js" }),
	result("2026-10-07T10:00:02Z", "e3", NOT_FOUND, true, "r8a"),
	call("2026-10-07T10:00:03Z", "e4", "Edit", { file_path: "/work/learn.app/c.js" }),
	result("2026-10-07T10:00:04Z", "e4", "ok", false, "r8b"),
	call("2026-10-07T10:00:05Z", "b2", "Bash", { command: "npm test" }),
	result("2026-10-07T10:00:06Z", "b2", "Exit code 1\nFAIL suite", true, "r8c"),
].map((entry) => ({ ...entry, sessionId: "s8" }));

const unattributedSession = [
	unattributed("2026-10-03T10:00:00Z", "legacy open"),
	{ ...unattributed("2026-10-03T10:00:01Z", "This session is being continued"), isCompactSummary: true },
	unattributed("2026-10-03T10:00:02Z", "/compact"),
	unattributed("2026-10-03T10:00:03Z", "legacy correction without origin"),
];

let projectsDir;

async function writeSession(dir, name, entries, { cwd, mtime }) {
	const file = path.join(projectsDir, dir, `${name}.jsonl`);
	await mkdir(path.dirname(file), { recursive: true });
	const lines = entries.map((entry) => JSON.stringify({ cwd, ...entry }));
	await writeFile(file, `${lines.join("\n")}\nnot json\n`);
	await utimes(file, new Date(mtime), new Date(mtime));
}

before(async () => {
	projectsDir = await mkdtemp(path.join(tmpdir(), "debrief-"));
	await writeSession(SLUG, "s1", SESSION, { cwd: PROJECT, mtime: "2026-10-20T11:00:00Z" });
	await writeSession(
		`${SLUG}--claude-worktrees-feature`,
		"s2",
		[
			human("2026-10-02T10:00:00Z", "open"),
			human("2026-10-02T10:00:01Z", "worktree correction"),
			{ ...LATE, sessionId: "s2" },
		],
		{ cwd: `${PROJECT}/.claude/worktrees/feature`, mtime: "2026-10-21T11:00:00Z" },
	);
	await writeSession(SLUG, "s5", unattributedSession, { cwd: PROJECT, mtime: "2026-10-21T12:00:00Z" });
	await writeSession(
		`${SLUG}-other`,
		"s3",
		[human("2026-10-02T10:00:00Z", "open"), human("2026-10-02T10:00:01Z", "foreign project")],
		{ cwd: `${PROJECT}-other`, mtime: "2026-10-22T11:00:00Z" },
	);
	await writeSession(
		"-work-observer",
		"s4",
		[
			{ ...human("2026-10-02T10:00:00Z", "open"), entrypoint: "sdk-ts" },
			{ ...human("2026-10-02T10:00:01Z", "observer prompt"), entrypoint: "sdk-ts" },
		],
		{ cwd: "/work/observer", mtime: "2026-10-23T11:00:00Z" },
	);
	await mkdir(path.join(projectsDir, "-work-empty"));
	await writeSession(LEARN_SLUG, "s6", skillSession, { cwd: LEARN, mtime: "2026-10-05T11:00:00Z" });
	await writeSession(LEARN_SLUG, "s7", errorSession, { cwd: LEARN, mtime: "2026-10-06T11:00:00Z" });
	await writeSession(LEARN_SLUG, "s8", repeatSession, { cwd: LEARN, mtime: "2026-10-07T11:00:00Z" });
});

after(() => rm(projectsDir, { recursive: true, force: true }));

async function extractFrom(project, args = [], env = process.env) {
	const { stdout } = await run(
		process.execPath,
		[SCRIPT, "--projects-dir", projectsDir, "--project", project, ...args],
		{ env },
	);
	return stdout
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

const extract = (...args) => extractFrom(PROJECT, args);

suite("extract-corrections", () => {
	test("emits each human correction with the signal that preceded it", async (t) => {
		const candidates = await extract();
		t.assert.deepStrictEqual(
			candidates.map(({ signal, text }) => [signal, text]),
			[
				["rejection", "no, keep the handler pure"],
				["mid-turn", "also run lint"],
				["interrupt", "stop, wrong suite"],
				["rewind", "use the existing helper"],
				["follow-up", "late follow-up"],
				["follow-up", "worktree correction"],
				["follow-up", "legacy correction without origin"],
			],
		);
	});

	test("attaches the assistant action the user reacted to", async (t) => {
		const [rejection] = await extract();
		t.assert.strictEqual(rejection.said, "Editing the handler.");
		t.assert.deepStrictEqual(rejection.did, ["Edit /work/acme.app/a.js"]);
	});

	test("attaches the abandoned work to a rewind", async (t) => {
		const rewind = (await extract()).find(({ signal }) => signal === "rewind");
		t.assert.deepStrictEqual(rewind.did, ["Write /work/acme.app/b.js"]);
	});

	test("attaches the skills invoked before a candidate, typed or called, built-in commands excluded", async (t) => {
		const [candidate] = await extractFrom(LEARN);
		t.assert.strictEqual(candidate.text, "correction after skills");
		t.assert.deepStrictEqual(candidate.skills, ["the-coder:coding", "git-commit:commit", "deep-research"]);
	});

	test("groups a tool error the agent repeated across sessions with the call that fixed it", async (t) => {
		const errors = (await extractFrom(LEARN)).filter(({ signal }) => signal === "tool-error");
		t.assert.deepStrictEqual(errors, [
			{
				id: "error:Edit: String to replace not found in file.",
				projects: [LEARN],
				at: "2026-10-07T10:00:02Z",
				signal: "tool-error",
				text: "String to replace not found in file.",
				count: 2,
				sessions: 2,
				did: ["Edit /work/learn.app/c.js"],
				fix: "Edit /work/learn.app/c.js",
				skills: [],
			},
		]);
	});

	test("drops entries older than --since", async (t) => {
		const candidates = await extract("--since", "2026-10-10");
		t.assert.deepStrictEqual(
			candidates.map(({ text }) => text),
			["late follow-up"],
		);
	});

	test("reads only the transcript named by --session, copied history included", async (t) => {
		const candidates = await extract("--session", "s2");
		t.assert.deepStrictEqual(
			candidates.map(({ text }) => text),
			["worktree correction", "late follow-up"],
		);
	});

	test("emits an entry copied into a later transcript once", async (t) => {
		const late = (await extract()).filter(({ text }) => text === "late follow-up");
		t.assert.deepStrictEqual(
			late.map(({ session }) => session),
			["s1"],
		);
	});

	test("folds a worktree session into its repository", async (t) => {
		const worktree = (await extract()).find(({ text }) => text === "worktree correction");
		t.assert.strictEqual(worktree.project, PROJECT);
	});

	test("keeps the launch repository after the agent changes directory", async (t) => {
		const late = (await extract()).find(({ text }) => text === "late follow-up");
		t.assert.strictEqual(late.project, PROJECT);
	});

	test("reads every project named by --project", async (t) => {
		const candidates = await extract("--project", `${PROJECT}-other`);
		t.assert.ok(candidates.some(({ text, project }) => text === "foreign project" && project === `${PROJECT}-other`));
	});

	test("reads every project under --all-projects and skips SDK sessions", async (t) => {
		const texts = (await extract("--all-projects")).map(({ text }) => text);
		t.assert.ok(texts.includes("foreign project"));
		t.assert.ok(!texts.includes("observer prompt"));
	});

	test("lists each repository once, newest first", async (t) => {
		const { stdout } = await run(process.execPath, [SCRIPT, "--projects-dir", projectsDir, "--list-projects"]);
		t.assert.deepStrictEqual(stdout.trim().split("\n"), [
			`2026-10-22\t1\t${PROJECT}-other`,
			`2026-10-21\t3\t${PROJECT}`,
			`2026-10-07\t3\t${LEARN}`,
		]);
	});

	test("names the missing transcript directory", async (t) => {
		await t.assert.rejects(
			run(process.execPath, [SCRIPT, "--projects-dir", projectsDir, "--project", "/nowhere"]),
			(err) => err.code === 1 && err.stderr.includes(`${path.join(projectsDir, "-nowhere")} does not exist`),
		);
	});
});
