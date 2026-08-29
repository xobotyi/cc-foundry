# What `keep-coding-instructions` Actually Gates

Verbatim extraction of the default system-prompt section that `keep-coding-instructions` controls, plus the surrounding
assembly logic that determines whether the flag has any effect at all.

<provenance>
**Source:** Claude Code binary, not documentation. The published docs describe this flag only in prose; the exact text
lives in the bundle.

- **Version:** `2.1.251`
- **Build:** `37534ac596d80cefb02d272f036adba4ba055d2c`, `2026-08-28T14:51:38Z`
- **Binary:** `~/.local/share/claude/versions/2.1.251` (Mach-O arm64, Bun single-file executable with the JS bundle
  embedded as plain text)
- **Extracted:** 2026-08-29

Build metadata is embedded in the gated function itself, inside the feedback-channel object literal — read `VERSION`,
`GIT_SHA`, and `BUILD_TIME` from the same dump that carries the bullets.

**Re-derivation procedure** — minified identifiers change every release, so locate by string, not by name:

1. `rg -a -b -o "keepCodingInstructions" <binary>` — most hits are the output-style loader and the built-in style
   roster. The prompt-assembly call site is the one whose surrounding code reads
   `M===null||M.keepCodingInstructions===!0?<fn>():null`.
2. Note `<fn>`, then `rg -a -b -o "<fn>" <binary>`. The name is short enough to collide across scopes, so filter to the
   region around the call site — inside that window it has exactly two hits, the definition and the call.
3. `dd if=<binary> bs=1 skip=<offset> count=<n> 2>/dev/null | tr -d '\0'` to read the function body.

Treat everything below as a snapshot. Verify against the installed version before relying on it.

</provenance>

## Stability Across Builds

The gated section and `# Tone and style` are byte-identical between the `2.1.233` and `2.1.251` extractions — same
bullets, same order, same wording. Only the minified identifiers and the lean-prompt predicate moved. An artifact that
displaces one of these bullets can rely on the text, and should re-check the identifiers.

## The Gate

One call site, inside the main system-prompt assembler:

```js
return [
	...(d
		? [L8t(M, t)] // lean prompt: single "# Harness" block
		: [
				C8t(M), // intro sentence + security preamble
				R8t(t), // "# System"
				M === null || M.keepCodingInstructions === !0 ? P8t() : null, // ← THE GATE
				x8t(), // "# Executing actions with care"
				M8t(U), // "# Using your tools"
				D8t(), // "# Tone and style"
			]),
	// ... dynamic sections, memory, env, output style body, attachments
].filter((pe) => pe !== null);
```

`M` is the resolved active output style.

- `M === null` (default style) → section included.
- Custom style with `keep-coding-instructions: true` → section included.
- Custom style otherwise → section omitted. **Omission is the default**; the flag must be explicitly `true`.
- Every built-in style except Default — `Proactive`, `Concise`, `Explanatory`, `Learning` — sets
  `keepCodingInstructions: !0` in code.

The gated function has exactly two references in its region of the bundle — its definition and this call. **The flag
toggles one section and nothing else.**

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

`# Executing actions with care` — the destructive-action / confirmation / blast-radius block — is also unconditional.
**Setting `keep-coding-instructions: false` does not drop safety guidance.**

Also always present: `# System` (output rendering, permission modes, `<system-reminder>` semantics, prompt-injection
warning, auto-compaction), `# Using your tools` (dedicated tools over shell, task tracking, parallel calls), and the
security preamble (authorized security testing / dual-use tooling).

The only other style-dependent change on the classic path is the opening sentence, which swaps
`helps users with software engineering tasks.` for `helps users according to your "Output Style" below, …` whenever any
custom style is active — independent of this flag.

## Where the Flag Is Inert: the Lean Prompt

The `d` branch above is a "simple system prompt" predicate. When it is true, all six classic sections collapse into one
compact `# Harness` block and `keepCodingInstructions` is never read:

```js
function Xne(e) {
	return /-eap($|\[)/i.test(e);
} // early-access model ids

function w(e) {
	// true = classic prompt
	if (Xne(e)) return false;
	let o = modelId(e);
	if (hasCapability(o, "lean_prompt") || o === "claude-mythos-5") return false;
	if (
		o.includes("claude-3-") ||
		o.includes("haiku") ||
		o.includes("sonnet") ||
		o === "claude-opus-4-0" ||
		o === "claude-opus-4-1" ||
		o === "claude-opus-4-5" ||
		o === "claude-opus-4-6" ||
		o === "claude-opus-4-7"
	)
		return true;
	return !ra(); // unresolved fallback for an unlisted model id
}

function B(e) {
	// true = lean prompt
	if (!e) return false;
	if (truthy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return true;
	if (falsy(env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT)) return false;
	if (!w(e)) return true;
	if (gate("tengu_velvet_tide", false)) return true;
	return gate("simple_system_prompt", modelId(e));
}
```

Per the `2.1.251` roster:

- **Lean prompt — flag is a no-op:** any model carrying the `lean_prompt` capability (Opus 4.8, Opus 5, Fable 5),
  `claude-mythos-5`, and any id matching `/-eap($|\[)/i` — the suffix must end the id or be followed by a bracket
  qualifier such as `[1m]`. Also anything at all when `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` is truthy or the
  `tengu_velvet_tide` gate is on.
- **Classic prompt — flag is live:** every `sonnet` (including `claude-sonnet-5`), every `haiku`, `claude-3-*`, and
  `claude-opus-4-0` / `4-1` / `4-5` / `4-6` / `4-7`.

An id matching none of those falls to `!ra()`, whose definition does not resolve from the call site by string search.
The enumerated cases decide every released model, so the fallback governs unlisted ids only.

Note the split runs through the current generation: **Sonnet 5 gets the classic prompt, Opus 5 does not.** A style
written and tested on one is not verified on the other.

**Verify which path a session took** by asking Claude to quote its own system-prompt headings, or check for the presence
of `# Harness` (lean) versus `# Doing tasks` / `# Tone and style` (classic).

## Consequences for Style Design

- `keep-coding-instructions: true` is a no-op on the default style and on all lean-prompt models. It only matters for a
  custom style on a classic-prompt model.
- Setting `false` to "strip engineering defaults" for a non-coding domain works on Sonnet, Haiku, and Opus 4.0-4.7. On a
  lean-prompt model there is nothing to strip — the SE framing you are fighting comes from the model, not the prompt, so
  the style body must carry the whole domain switch on its own.
- Setting `false` to save tokens buys ~2.4 KB on classic-prompt models and zero on lean ones.
- Do not rely on `false` to remove conciseness rules or destructive-action caution. Override them in the style body if
  the style needs different behavior.
- A style whose body restates scope discipline or comment policy duplicates the gated section when the flag is `true`.
  Either set `false` and own the rules, or set `true` and state the delta.
- **A default-prompt rule the style contradicts is displaced in the style body, not only in a companion skill.** The
  default prompt holds for the whole session on either path; a skill body sits in compactable history. State the
  override where the rule it displaces lives, name the rule, and give the replacement behavior.
- **State a delta only against what the prompt says, never against what it omits.** Setting `false` on a lean-prompt
  model removes nothing, so backfilling the gated section's rules adds instructions the target never carried, and a
  redundant instruction overshoots rather than reinforces. Check the target's prompt path before writing a rule to
  replace one.
- **A lean-path collision is a different collision.** The lean `# Harness` block has the agent match the surrounding
  code's comment density, naming, and idiom — so a closed-set comment policy disagrees with the lean prompt too, at a
  different sentence than the classic one.
