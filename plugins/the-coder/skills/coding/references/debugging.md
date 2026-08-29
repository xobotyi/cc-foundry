# Debugging Protocol

A bug fix is a claim about cause and effect. This is how you earn the right to make it. The sequence is ordered: each
step narrows the search space the next one operates on.

<debugging-protocol>

1. **Build the loop first** — capture the failing case as one re-runnable command that goes red on this bug and will go
   green when it's fixed. Run it at least once before theorizing: no red command, no hypothesis. A bug you can't
   reproduce isn't fixed by any change you make, only perturbed.

2. **Tighten the loop** — make it fast (skip unrelated setup, narrow the scope), sharp (assert the exact symptom, not
   "didn't crash"), and deterministic (pin time, seed randomness, isolate filesystem and network). For flaky bugs the
   goal is a higher reproduction rate, not a clean repro — loop the trigger, add stress, narrow timing windows until it
   fails often enough to debug against.

3. **Minimize the repro** — cut inputs, callers, config, and steps one at a time, re-running the loop after each cut,
   until every remaining element is load-bearing. Fewer moving parts, fewer suspects.

4. **Read the error literally** — the message names a symbol, a line, a state. Chase what it says before theorizing
   about what it might mean. Read the whole stack trace, not the first frame.

5. **Localize before you hypothesize, in a multi-component system.** When the failure crosses boundaries — CI to build
   to signing, handler to service to store, process to process — do not guess which component is wrong. Instrument every
   boundary in one pass: what value enters, what value leaves, whether the config and environment propagated. Run it
   once. The evidence names the failing component, and only then is there a component to form hypotheses about.

6. **Compare against something that works** — find the nearest working case in this codebase, or the reference
   implementation if you are following one, and read it completely rather than skimming for the part you expect to
   matter. List every difference between working and broken. "That can't matter" is the assumption this step exists to
   break.

7. **Rank falsifiable hypotheses** — write 3–5 before testing any; a single hypothesis anchors on the first plausible
   idea. Each states its prediction: "if X is the cause, changing Y makes the bug disappear." No prediction — discard or
   sharpen it.

8. **Change one variable at a time** — each probe tests one prediction. Tag every debug log with a unique prefix (e.g.
   `[DBG-a4f2]`) so cleanup is a single grep. Two simultaneous changes that fix the bug tell you nothing about which one
   mattered, or what the other one broke.

9. **Bisect when lost** — no hypothesis survives contact? Halve the search space instead of staring: `git bisect` across
   history, disable half the pipeline, shrink the input to minimal.

10. **Explain the fix or keep digging** — "it works now but I don't know why" means the root cause is still at large and
    will return. Done means you can state why the bug happened and why the change removes it.

</debugging-protocol>

## Count Your Failed Fixes

Track how many fixes you have tried on this bug. The count changes what the next move is.

<fix-counter>
- **Under three** — a failed fix falsified a hypothesis and nothing more. Return to step 4 with what
  it taught you, and form a new one. Do not stack a second fix on top of the first.
- **Three or more** — stop fixing and question the design. Three failures is no longer a run of
  wrong guesses; it is evidence that the thing you are debugging is not the thing that is wrong.
  </fix-counter>

Three signs that the architecture is the bug, not the code:

- Each fix uncovers new shared state or coupling somewhere you were not looking.
- Each fix creates a new symptom elsewhere.
- The fix that would actually work requires a refactor far larger than the bug.

When you see these, say so and put the design question to the user. A fourth fix attempt without that conversation is
the most expensive move available.

## When You Cannot Build a Loop

Say so, and stop. List what you tried, then ask for what is missing: a reproducing environment, a captured artifact (log
dump, trace, recording), or permission to add temporary instrumentation. Do not hypothesize without a loop.

"No root cause — it's environmental" is a conclusion, not a starting position, and it is reached far more often than it
is true. Before accepting it, confirm you completed steps 1 through 6: an unreproducible bug and an unlocalized bug are
different problems, and the second one has more investigation left in it. When the conclusion does hold, say what you
investigated, implement the handling the situation needs (retry, timeout, a real error message), and add the logging
that would settle it next time.

## Before You Close

- **Turn the reproduction into a regression test.** The bug that happened once is the bug most likely to happen again.
- **Verify the test can fail.** Revert the fix, run the test, confirm it goes red, restore the fix. A regression test
  that never went red proves nothing — it may be asserting something the bug never touched.
- **Grep the debug prefix** to confirm no instrumentation survived.
