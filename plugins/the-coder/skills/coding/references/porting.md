# Porting Code to Another Language, Runtime, or Library

A port keeps the behavior and changes what the behavior is written in. It is one kind of work: a port commit carries no
redesign, no optimization, and no bug fix.

## Port Rules

<port-rules>
- **State the end state before the first unit.** Name what is left of the source when the port is done.
  A port with no stated end state stops at the logic and leaves the I/O and the orchestration behind.
- **Translate first, redesign second.** Keep the source's algorithms and structure, even where the target
  has a better idiom. A redesign is a later change, made against the finished port.
- **The tests of the ported behavior are the oracle.** A test that still runs after the port stays as it
  is: the port never edits, deletes, or re-records it. A test that cannot run, because it calls the
  source unit itself, moves with the unit, and its inputs and assertions move unchanged. An assertion
  that must change shows a defect in the port, or a decision that belongs to the user.
- **Pin before you port.** Behavior that no test reaches is pinned first, under the characterization
  rules in `patterns.md`.
- **Port from the leaves inward.** Pure logic first, then the code that owns state, then the orchestration
  that calls both.
- **Delete the source in the commit that adds its replacement.** A concurrent edit to the deleted source
  then stops as a merge conflict. With the source left in place, the edit lands in code nothing runs. The
  body's rule for superseded code holds here: a source path used outside this repository stays.
</port-rules>

## Where a Port Loses Behavior

Each entry is a difference that compiles and passes review. Check a unit against every entry before you call it ported.

<port-losses>
- **Semantics the source left implicit.** One number type becomes several: choose integer or fractional
  per field, from the values the field carries and the form its consumers parse. A default that replaced
  every empty value becomes one that replaces only an absent value. Check also integer overflow, the unit
  of a string index, sort stability, and map iteration order.
- **Behavior the source runtime supplied.** The host time zone, the locale, the working directory, the
  environment, and a patch the runtime applied at startup reach the source without a line of code. For
  each one, decide when the port captures it, how the port carries it, and when the port refreshes it.
- **Order across a suspension point.** A read that moves from before a wait to after it sees a value that
  something else had time to change.
- **One half of a pair.** Abort and cancel, persist and publish, acquire and release, two counters that
  move together. Port both halves in one unit.
- **A handle in place of a reference.** State that moves behind the boundary leaves the caller with a
  handle, and a handle outlives its instance. Decide what each call does with a stale handle.
- **The opinions of the replacement library.** It answers input the old library ignored, rejects input
  the old library accepted, or retries where the old library failed. Read its behavior on malformed
  input and on its defaults; never assume the two libraries agree.
- **Efficiency the source had.** A memo, a bounded stream, a borrow, a wait that does not block. The loss
  of one is a regression of the port, never an optimization for later.
- **A feature no test names.** List the source's public surface: each exported entry, callback, and
  option. Account for each one in the port.
</port-losses>
