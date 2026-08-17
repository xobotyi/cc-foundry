# What `keep-coding-instructions` Actually Gates

Verbatim extraction of the default system-prompt section that `keep-coding-instructions` controls, plus the surrounding
assembly logic that determines whether the flag has any effect at all.

<provenance>
**Source:** Claude Code binary, not documentation. The published docs describe this flag only in prose; the exact text
lives in the bundle.

- **Version:** `2.1.233`
- **Build:** `f8d57569aaf350fe25dc4dfa10cad59db8ea4d45`, `2026-08-14T17:21:48Z`
- **Binary:** `~/.local/share/claude/versions/2.1.233` (Mach-O arm64, Bun single-file executable with the JS bundle
  embedded as plain text)
- **Extracted:** 2026-08-17

**Re-derivation procedure** — minified identifiers change every release, so locate by string, not by name:

1. `rg -a -b -o "keepCodingInstructions" <binary>` — the prompt-assembly call site is the one whose surrounding code
   reads `c===null||c.keepCodingInstructions===!0?<fn>():null`.
2. Note `<fn>`, then `rg -a -b -o "<fn>"` — it has exactly two hits (definition, call site).
3. `dd if=<binary> bs=1 skip=<offset> count=<n> | tr -d '\0'` to read the function body.

Treat everything below as a snapshot. Verify against the installed version before relying on it.

</provenance>

## The Gate

One call site, inside the main system-prompt assembler:

```js
return [
	...(o
		? [sLv(c, t)] // lean prompt: single "# Harness" block
		: [
				X1v(c), // intro sentence + security preamble
				Q1v(t), // "# System"
				c === null || c.keepCodingInstructions === !0 ? eLv() : null, // ← THE GATE
				tLv(), // "# Executing actions with care"
				rLv(d), // "# Using your tools"
				iLv(), // "# Tone and style"
			]),
	// ... dynamic sections, memory, env, output style body, attachments
].filter((y) => y !== null);
```

`c` is the resolved active output style.

- `c === null` (default style) → section included.
- Custom style with `keep-coding-instructions: true` → section included.
- Custom style otherwise → section omitted. **Omission is the default**; the flag must be explicitly `true`.
- Built-in `Proactive`, `Explanatory`, and `Learning` styles set `keepCodingInstructions: true` in code.

The gated function has exactly two references in the entire binary — its definition and this call. **The flag toggles
one section and nothing else.**

## Verbatim: the Gated Section

The function builds the heading `# Doing tasks` plus a bullet list — top-level items are prefixed with one leading space
then `- `, nested arrays with two leading spaces then `- `. Rendered output, exact whitespace included:

```text
# Doing tasks
 - The user will primarily request you to perform software engineering tasks. These may include solving bugs, adding new functionality, refactoring code, explaining code, and more. When given an unclear or generic instruction, consider it in the context of these software engineering tasks and the current working directory. For example, if the user asks you to change "methodName" to snake case, do not reply with just "method_name", instead find the method in the code and modify the code.
 - You are highly capable and often allow users to complete ambitious tasks that would otherwise be too complex or take too long. You should defer to user judgement about whether a task is too large to attempt.
 - For exploratory questions ("what could we do about X?", "how should we approach this?", "what do you think?"), respond in 2-3 sentences with a recommendation and the main tradeoff. Present it as something the user can redirect, not a decided plan. Don't implement until the user agrees.
 - Prefer editing existing files to creating new ones.
 - Be careful not to introduce security vulnerabilities such as command injection, XSS, SQL injection, and other OWASP top 10 vulnerabilities. If you notice that you wrote insecure code, immediately fix it. Prioritize writing safe, secure, and correct code.
 - Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup; a one-shot operation doesn't need a helper. Don't design for hypothetical future requirements. Three similar lines is better than a premature abstraction. No half-finished implementations either.
 - Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs). Don't use feature flags or backwards-compatibility shims when you can just change the code.
 - Default to writing no comments. Only add one when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.
 - Don't explain WHAT the code does, since well-named identifiers already do that. Don't reference the current task, fix, or callers ("used by X", "added for the Y flow", "handles the case from issue #123"), since those belong in the PR description and rot as the codebase evolves.
 - For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete. Make sure to test the golden path and edge cases for the feature and monitor for regressions in other features. Type checking and test suites verify code correctness, not feature correctness - if you can't test the UI, say so explicitly rather than claiming success.
 - Avoid backwards-compatibility hacks like renaming unused _vars, re-exporting types, adding // removed comments for removed code, etc. If you are certain that something is unused, you can delete it completely.
 - If the user asks for help or wants to give feedback inform them of the following:
  - /help: Get help with using Claude Code
  - To give feedback, users should report the issue at https://github.com/anthropics/claude-code/issues
```

One further bullet sits behind the GrowthBook gate `tengu_verified_vs_assumed` (default `false`), inserted after the
backwards-compatibility-hacks bullet:

```text
 - When reporting results, be accurate about what you verified vs. what you assumed. Distinguish between what you confirmed (ran a command, read a file) and what you believe but did not check. Do not assert assumptions as facts.
```

**Practical read of the section's content:** four themes — software-engineering task framing (bullets 1-3), scope
discipline and comment policy (bullets 4-10), delete-don't-shim (bullet 11), and the `/help` boilerplate. Nothing about
tone, safety of destructive actions, or tool usage; those live in sections the flag cannot touch.

## What the Flag Does NOT Remove

Every other classic-path section is unconditional. Two are commonly misattributed to this flag.

`# Tone and style` is **always** present, for every style, built-in or custom:

```text
# Tone and style
 - Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
 - Your responses should be short and concise.
 - When referencing specific functions or pieces of code include the pattern file_path:line_number to allow the user to easily navigate to the source code location.
 - Do not use a colon before tool calls. Your tool calls may not be shown directly in the output, so text like "Let me read the file:" followed by a read tool call should just be "Let me read the file." with a period.
```

`# Executing actions with care` — the long destructive-action / confirmation / `git status`-before-discarding block — is
also unconditional. **Setting `keep-coding-instructions: false` does not drop safety guidance.**

Also always present: `# System` (output rendering, permission modes, `<system-reminder>` semantics, prompt-injection
warning, auto-compaction), `# Using your tools` (dedicated tools over shell, task tracking, parallel calls), and the
security preamble (authorized security testing / dual-use tooling).

The only other style-dependent change on the classic path is the opening sentence, which swaps
`helps users with software engineering tasks.` for `helps users according to your "Output Style" below, …` whenever any
custom style is active — independent of this flag.

## Where the Flag Is Inert: the Lean Prompt

The `o` branch above is a "simple system prompt" predicate. When it is true, all six classic sections collapse into one
compact `# Harness` block and `keepCodingInstructions` is never read:

```js
X0 = memo((e) => {
	if (!e) return false;
	if (truthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return true;
	if (falsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return false;
	if (!d2_(e)) return true; // model-capability check
	if (gate("tengu_velvet_tide", false)) return true;
	return gate("simple_system_prompt", model);
});
```

The model check resolves to the lean prompt for any model carrying the `lean_prompt` capability, plus any `-eap` model
id. Per the `2.1.233` model roster:

- **Lean prompt — flag is a no-op:** `claude-opus-4-8`, `claude-opus-5`, `claude-fable-5`, `claude-mythos-5`, any
  `*-eap` variant. Also anything at all when `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is truthy or the `tengu_velvet_tide`
  gate is on.
- **Classic prompt — flag is live:** every `sonnet` (including `claude-sonnet-5`), every `haiku`, `claude-3-*`, and
  `claude-opus-4-0` / `4-1` / `4-5` / `4-6` / `4-7`.

Note the split runs through the current generation: **Sonnet 5 gets the classic prompt, Opus 5 does not.** A style
written and tested on one is not verified on the other.

**Verify which path a session took** by asking Claude to quote its own system-prompt headings, or check for the presence
of `# Harness` (lean) versus `# Doing tasks` / `# Tone and style` (classic).

## Consequences for Style Design

- `keep-coding-instructions: true` is a no-op on the default style and on all lean-prompt models. It only matters for a
  custom style on a classic-prompt model.
- Setting `false` to "strip engineering defaults" for a non-coding domain works on Sonnet/Haiku/Opus 4.0-4.7. On Opus 5
  there is nothing to strip — the SE framing you are fighting comes from the model, not the prompt, so the style body
  must carry the whole domain switch on its own.
- Setting `false` to save tokens buys ~2.4 KB on classic-prompt models and zero on lean ones.
- Do not rely on `false` to remove conciseness rules or destructive-action caution. Override them in the style body if
  the style needs different behavior.
- A style whose body restates scope discipline or comment policy duplicates the gated section when the flag is `true`.
  Either set `false` and own the rules, or set `true` and only state deltas.
