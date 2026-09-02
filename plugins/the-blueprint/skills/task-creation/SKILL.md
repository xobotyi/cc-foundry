---
name: task-creation
description: >-
  Write and review work items in an issue tracker: establish which reader the item is for, verify every claim it
  makes against the system, and give the implementer a location and acceptance criteria. Sizing and decomposition
  belong to tasks.
when_to_use: >-
  Invoke whenever a work item is written, reviewed, or filed in an issue tracker — a bug, a feature, a story, a chore,
  a task breakdown being turned into tracked items, or an item drafted for an autonomous coding agent to pick up. Also
  invoke on the symptoms: an implementer asks a question the item should have answered, an agent edits the wrong
  files, a report cannot be reproduced, a description restates conventions the repository already states, a tracker
  field is about to be set to a guessed value. Covers what the item contains and the gate before it is created;
  sizing, dependencies, and phase coverage belong to tasks, and field discovery, link types, and query syntax to the
  tracker's own skill — youtrack for YouTrack.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**A work item has one reader, and the two possible readers pay opposite costs.** A human implementer picks the item up
later and pays for volume: unstructured and over-long prose is what developers name among the problems that most delay a
fix. An autonomous agent is handed the item directly and pays for absence: a large share of real issues are
underspecified for one, and naming the files a change touches is the single largest measured lift in its success rate.
The opposite costs — over-specification to an agent, under-specification to a human — are not established, so no rule
here trades on them. Establish which reader the item is for, and let that decide what goes in.

**Write only what was run or read.** Completing a missing section trades absence for error: the item stops failing for
what it omits and starts failing for what it asserts, and a machine writer buys structural completeness while
reproducibility barely moves. Completeness is not accuracy. Plausibility survives a style checklist, so the check is
verification against the system — run the path, read the code, capture the output — and whatever could not be verified
is marked as such inside the item.

**A filed item cannot answer a question.** Interrogating a human recovers most of what underspecification costs, and a
model cannot reliably tell an underspecified task from a complete one. Two consequences hold together: everything the
implementer needs is front-loaded, because the queue has nobody to ask, and the writer cannot trust its own judgement
that the item is complete, which is what the approval gate is for.

## Establish the reader before drafting

- **The human implementer is the default reader.** Write for a person picking the item up later, including when the
  assignment is unknown.
- **Select the agent reader only on a signal that the work goes to an agent** — an explicit assignment to a coding
  agent, an AFK classification in a task breakdown, or a queue an agent drains. Absent one of those, the reader is the
  human implementer. The AFK and HITL classification itself belongs to `tasks`.
- **The readers differ on volume, never on truth.** Nothing in the reader decision licenses an unverified claim for
  either one.

## Verify the claim before writing it

- **Run the failing path before filing a defect.** Wrong reproduction steps are the most damaging defect a report can
  carry, and a report nobody can reproduce does not fail fast — it lingers. Reporters find reproduction steps the
  hardest element to supply and an agent can simply run the path, which turns the hardest element into the cheapest one.
- **Never invent an artifact.** No screenshot of an interface that was not opened, no error text that was not produced,
  no version number that was not checked, no file that was not read.
- **Read the code before claiming a cause.** An unconfirmed root cause is written as a hypothesis or left out.
- **Paste the artifact rather than paraphrasing it** — exact error text, the failing command with its output, the stack
  trace, the log excerpt. Reports that carry the artifact itself are associated with shorter resolution times across
  large issue corpora; whether the artifact causes that is not established, and a paraphrase is not the artifact either
  way.
- **Mark what was not verified.** Name the step not run, the environment not tested, the claim not confirmed. An item
  that shows its gaps is cheaper than one that hides them.
- **Take the type from the contract, not from the symptom.** "Something is broken, so it is a bug" is the reflex that
  misfiles a third of everything filed as a bug. The test is whether the behavior violates a stated contract —
  documentation, a test, an API guarantee — or only disappoints an expectation.
- **Search for an existing item, then stop.** Duplicate-hunting is a cheap check, never a gate: developers do not rank
  duplicates among their costly problems, and a duplicate measurably carries information the master report lacks. Search
  the symptom and the exact error string; a second report on a known defect is merged into it, and holding the item back
  for an exhaustive search costs more than the duplicate does.

## Give the item a location

A location is a file, a module, a symbol, or a failing test that exists in the repository now — where the work starts,
never where it ends up.

- **Name it.** Supplying the files a change touches roughly doubles an agent's chance of resolving the issue, and
  retrieval alone misses them about half the time. For the agent reader this is the highest-value line in the
  description; for the human reader it costs one line and saves a search, so the location is given whichever reader the
  item is for.
- **Name only what exists at HEAD.** The file holding the defect, the module the change enters, the failing test, the
  symbol — each is read from the repository before it is named. A path for a file the work will create is not a
  location: choosing where new code goes is the implementer's decision, and prescribing it is implementation
  prescription.
- **Name the location; do not paste the code around it.** More retrieved context measures worse, not better. Precision
  moves the item, volume does not.
- **Give a location even where the exact file is uncertain** — the module, the symbol, the failing test, the entry
  point. Localization is where agent runs fail most often, and no architecture is served by a description that starts
  nowhere.
- **Add the durable anchor for an item that will queue.** An existing type, interface, or behavioral contract survives a
  rename; a path does not. The anchor names something that exists too — a contract the work will introduce is part of
  the acceptance criteria, not a location. This is a convention and its cost is stated: path decay in queued items is
  unmeasured, while the value of naming the files is measured. Staleness is a reason to add the anchor, never a reason
  to withhold the location.

## Write acceptance criteria the implementer can see

- **Put every pass/fail condition in the item.** A condition that lives only in a reviewer's head makes the item
  unsolvable — the implementer cannot satisfy a test it cannot read. This is the strongest reason to write acceptance
  criteria at all, and it is about visibility, not about format.
- **Write each criterion so observation decides it.** Name the command, the test, or the output that settles pass or
  fail.
- **Name what must not change** — behavior that stays fixed, backward compatibility, interfaces left alone, a process
  the change must follow. Process fit rejects contributions as often as capability does, and a constraint the
  implementer could not read is a rejection waiting to happen.
- **Criterion format is a convention.** No comparison of a checklist against Given/When/Then on implementer outcomes was
  found. Follow the format the tracker already uses; where there is none, use a checklist. Never present that choice as
  evidence-backed.

## Match the content to the kind of work

- **A defect item** — the observed behavior in exact words, the expected behavior with what states it, the reproduction
  that was actually run, the environment and version it was observed in, and the artifact.
- **A change item** — the problem and the goal before any solution, the location, the acceptance criteria, and the
  constraints. The solution belongs to the implementer.
- **An investigation item** — the observation that prompted it, the question it must answer, and the form the answer
  takes. Its acceptance criteria describe the answer, never code.

**Ask for each element by name, in a fixed shape.** Reports state observed behavior far more often than expected
behavior, and the projects whose templates name an element are the projects whose reports carry it. That is an
observational attribution rather than a trial, and it is still the strongest evidence for a fixed shape. The shape also
guards against a measured failure of the writer rather than of the reader: handed a report with an element removed, a
model often fails to notice the absence and supplies a plausible substitute instead. Naming every element forces the
check that noticing does not. The ordering is convention.

Expected behavior is the element to protect — without it the item says only that something happened, and the defect
claim rests on nothing. The environment is not bureaucracy either: environmental differences cause more irreproducible
reports than missing information does.

## Leave out what the reader already has

- **Repository conventions belong in the repository's agent file.** AGENTS.md and CLAUDE.md are read on every run. A
  description restating build commands, code style, or test invocation duplicates a file the agent already has and
  charges the human reader for it. An unspecific request is paid for in turns.
- **Never paste the conversation into the item.** Extract the intent, and link the thread where the raw exchange
  matters.
- **Never restate a document the item can link** — the design document, the frame, the alignment record.

## Set fields and links from the tracker

- **Confirm the tracker and the project before drafting.** Where more than one tracker is reachable, ask the user rather
  than inferring.
- **Discover the fields, their types, and their allowed values; never guess a name or a value.** They differ per tracker
  and per project. Discovery mechanics belong to the tracker's own skill — `youtrack` for YouTrack.
- **Set only the fields the project uses.** Invented metadata does not survive creation.
- **Give routing fields the care the description gets.** Misrouting is the largest measured latency cost in this domain,
  larger than anything description quality controls. Component, area, and owner decide who ever sees the item.
- **The native link is the relationship.** Create every one the tracker supports and every one that applies to a pair.
  An item ID typed into the description text creates nothing: no dependency view, no query, and no traversal sees it,
  and it goes stale silently when the item moves. Where the tracker's tools cannot create a link, report that to the
  user rather than writing the relationship into the text.

## Take approval before anything is created

A created item is visible to everyone with access to the tracker, and retracting it is manual work. A rejected
contribution also teaches the writer nothing reliably: a large share are closed with no reviewer explanation, or on
inactivity alone. The correction has to come before filing, not after. This sequence is exact.

1. **Present the complete draft** — project, type, title, description, every field with the value to be set, and every
   link to be created.
2. **Name what could not be verified**, in the draft itself and not only in the item body.
3. **Wait for explicit approval.** Revise and present again after any change. A batch built from a task breakdown is
   presented as a set and approved as a set; nothing is created ahead of that approval.
4. **Create the item, set the fields, and create every link that applies.** One pair of items may carry more than one
   relationship.
5. **Report the created ID and URL**, and name anything the tracker's tools could not do so the user can finish it by
   hand.

```markdown
## Draft

**Project:** [discovered project]
**Type:** [value from the tracker]
**Reader:** [human implementer | autonomous agent]

**Title:** [title]

**Description:**
[the item body as it will be created]

**Fields:**

- [field name]: [allowed value]

**Links:**

- [relationship] → [item ID]

**Unverified:** [what was not run or read, or "none"]
```

## Title and description conventions

These are conventions of this skill. No measurement stands behind them; they buy consistency across a tracker and
nothing more. The fixed shape that names each element rests on an observational finding; the order below rests on
consistency alone.

- **Title in the imperative, naming the specific thing** — "Fix negative offset in paginator navigation", not "Fix
  pagination bug". No project code, parent reference, or type label: the tracker holds those.
- **Element order: the problem, the location, the acceptance criteria, then the documents the item links.** A reader who
  stops after two sections knows what to do and where.
- **Write the item as a plan, not as a report.** The work has not started when the implementer reads it.
- **Describe the change, not the code to write.** Pseudocode is acceptable where the logic is the hard part;
  configuration samples are acceptable where configuration is the deliverable.

## Not evidence

- **INVEST is not authority.** It was published as a blog post in 2003, and no controlled study, dataset, or measurement
  of its six properties was found. Individual properties may be defensible on other grounds; the acronym carries no
  evidential weight.
- **A checklist cannot check truth.** What a quality tool detects is structural — a missing role, a missing action, a
  non-atomic story, a format violation. Ambiguity, completeness, and independence defeat detection. A shape review has a
  real hit rate on shape and none on whether the content is true.

## Apply and review

When writing an item, apply these rules silently and never narrate them. Where the tracker's existing items contradict a
convention here, follow the tracker and say so once.

When reviewing an item, check the claims before the shape. A well-formed item can be entirely fabricated, and shape is
the part a checklist already passes. Name the rule, quote the line, and show the replacement.

Nothing reaches the tracker without explicit approval on the draft — for every item, including every item in a batch.
