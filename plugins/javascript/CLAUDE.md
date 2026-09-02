# javascript Plugin

JavaScript and TypeScript discipline: the language, the type system, two runtimes, a test framework, and LSP-powered
code intelligence via `typescript-language-server`.

## Skills

- **`javascript`** — the language: declarations and scope, equality and coercion, functions, objects, arrays and
  iteration, classes, async and promise semantics, ES module syntax, errors, regular expressions, `Intl` and the
  built-in globals, JSDoc typing, ECMAScript-edition gating, LSP-first navigation
- **`typescript`** — the type system: strictness configuration, narrowing, generics, type-level programming, enums,
  declaration files and emit, module resolution and `tsconfig`, erasable syntax, the compiler toolchain
- **`nodejs`** — the Node runtime: module resolution, the package manifest, native TypeScript execution, blocking,
  streams, errors and process lifecycle, async context and diagnostics, the HTTP client, workers, the permission model,
  `node:test`, npm and supply chain, the CLI
- **`bun`** — the Bun runtime and toolchain: the Bun-native API surface against its `node:` equivalents, the HTTP and
  WebSocket server, files, the shell and processes, `bun:test`, the package manager, the bundler and single-file
  executables, the bundled data clients, `bunfig.toml`, Node compatibility
- **`vitest`** — Vitest: test structure, assertions, context and fixtures, lifecycle, mocking and its hoisting rules,
  fake timers, snapshots, configuration and projects, pools and isolation, coverage, type testing, Jest migration

## LSP Integration

Ships a `typescript-language-server` config (`.lsp.json`) bound to every JS and TS extension. The LSP-first navigation
rules live in the `javascript` skill — the two change together.

## Version References

Three skills gate on a version axis and each names exactly one. The floor index lives inline in the SKILL.md rather than
in a reference, because it decides what the model may write.

- `javascript` — the ECMAScript edition. `references/versions/es20NN.md` per ratified edition, plus `stage4-queue.md`
  for the finished-but-unratified set. The body states that the project's declared engine baseline decides availability,
  never the edition number
- `typescript` — the release pinned in the project's `package.json`. `references/versions/ts-N.N.md` per release
- `nodejs` — the major named by `engines.node`. `references/versions/node-NN.md` per major, each carrying the support
  window and the stability index of every addition
- `bun` and `vitest` carry no version directory. Each targets the current stable release and anchors a version-sensitive
  claim in the sentence that states it

When a new ECMAScript edition, TypeScript release, or Node major ships: add the version reference, add one index line
naming only the features the skill's own rules reference, extend the route-list range, update the skill's
`reference-inventory.json`, and drop any gate the new floor makes obsolete.

## Skill Dependencies

- `typescript` is a hard prerequisite on `javascript`, stated in a `<prerequisite>` block. Fundamentals stated in
  `javascript` are never restated there
- `javascript` wins on any question of how JavaScript reads. `typescript` owns what a type changes, `nodejs` and `bun`
  own their runtimes, `vitest` owns Vitest
- One split runs through four skills and is stated in each: `javascript` owns module syntax and live-binding semantics,
  `nodejs` and `bun` own resolution, `typescript` owns how the compiler models the host
- The cross-runtime globals — `URL`, `structuredClone`, `crypto`, `queueMicrotask`, and `AbortController` as a
  cancellation protocol — belong to `javascript`, stated once. Each runtime skill owns only its own deviation, which is
  why `nodejs` carries undici's `fetch` behavior and `javascript` does not
- Each runtime owns the test runner it ships — `node:test` to `nodejs`, `bun:test` to `bun` — and `vitest` covers Vitest
  alone. Which one a project adopts is a project decision that no skill states
- Moving any of these boundaries means editing five `## Integration` sections and five `when_to_use` clauses

## Plugin Scope

The language, the type system, and the runtimes that execute them. Language-agnostic workflow belongs to `the-coder`;
browser platform and framework concerns to `frontend`; service concerns to `backend`; CLI design to `cli`.

Linting and formatting are out of scope by decision — the tooling churns faster than a skill can track it, and a stale
lint rule costs more than no rule. Two facts about that tooling stay, because both are stable and both change what gets
written: which style guides are frozen, in `javascript`, and which compiler API a type-aware linter needs, in
`typescript`. A rule about configuring a linter does not.

## Conventions

- Every skill splits its references by load condition, and every pointer states the condition that loads it at the point
  of need. A catalog block listing the reference set is the anti-pattern
- A reference is one hop from SKILL.md — a reference never routes to another reference, nor back to SKILL.md
- API claims are verified against a primary source fetched in the session, never against memory. Where the runtime or
  the compiler is installed, a behavioral claim is verified by running it, and the measurement carries the version it
  was taken on. A documented contract outranks an observed behavior the documentation does not promise
- Where the documentation and the runtime contradict each other outright, the runtime wins alongside the more recent
  source, and the skill states the resolution rather than picking one silently. A reader who checks the stale page needs
  the correction in front of them. This is narrower than the rule above, which governs behavior the documentation is
  merely silent on
- `vitest` sources from the `v4` branch of `vitest-dev/vitest`, never `main`. `main` carries the next major and
  documents an option surface the shipped release does not have. Repoint the inventory when the target major changes
