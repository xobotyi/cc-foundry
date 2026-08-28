# Skills as a supply chain

A skill is instruction text plus executable files that a host loads with the agent's own authority. Two roles follow:
what a skill must not ship, and what to check before installing a third-party one.

## What not to ship

Four defect classes, measured across a corpus of 138,133 public skills, ordered by how badly they fail:

- **Credentials, user paths, and safety bypasses** — hardcoded secrets, `--no-verify`, error suppression, absolute paths
  under a home directory. Present in 9.8% of public skills.
- **Unguarded destructive actions** — `rm -rf`, `DROP TABLE`, force-push, resource deletion with no confirmation step.
  Require confirmation in the instruction, and prefer a permission or hook boundary over prose when the action must not
  happen by accident.
- **Persona redefinition and instruction override** — "you are a…", or text instructing the agent to disregard prior
  instructions. Present in 6.7%. This is a conflict with the host's instruction hierarchy, not a style choice.
- **Portability leaks** — hardcoded model names, platform paths, platform-specific tool calls, OS-specific commands.
  Present in 5.8%.

Skills carrying an explicit AI-generation marker show **2.3× the rate of safety defects** (18.9% versus 8.2%) and 2.8×
the portability defects. The authors present that as association, not causation — the actionable reading is that
generated skills warrant closer review before publication, not that generated skills are inherently worse.

## What to check before installing

Static inspection of `SKILL.md` alone is not sufficient, and the gap is measured:

- A static detection framework reached AUC 0.93 and ~93% detection for data exfiltration and steganographic cases, but
  **0% for host destruction using ordinary shell commands** and **42% for natural-language prompt injection**.
- Its full-population scan read `SKILL.md` only and **never fetched companion scripts**. The authors call their 1.75%
  flag rate a lower bound on risky content for exactly that reason.
- **Per-skill scanning is the wrong unit.** Malicious behavior split across several individually plausible skills
  reached 96.0% average attack success against six scanners. A chain-aware check that analyzed a candidate together with
  already-installed skills cut that to 22.5% while still passing 99.5% of benign workflows.
- **Cost is an attack surface.** Poisoned instructions that exploit retrying, planning, and self-verification reached
  5.4×–10.1× token amplification while keeping task completion at or above the benign baseline — so a correctness gate
  does not detect it.

Layered review has measured economics: static pre-screening runs at over 100 skills/sec, semantic LLM review at roughly
1 skill/sec, and routing only the ~2% ambiguous cases to the LLM gives about a 50× cost reduction over reviewing
everything with an LLM.

Practical order: check provenance and pin the version · read the markdown **and the companion executables** · send the
ambiguous remainder to semantic review · evaluate the candidate against what is already installed, not in isolation ·
scope permissions · re-review on update rather than trusting a package because its first version was clean.

Real incidents exist. A typosquatted skill family distributed through a public registry accumulated over 1.7 million
aggregate installs before its credential theft was found.

## The host-specific hazard

In Claude Code, `allowed-tools` pre-approves tools for the invoking turn — and **workspace trust does not gate it**. A
project skill applies its grant even in a `-p` run inside a directory that was never trusted. Review the `allowed-tools`
of any skill checked into a repository before running an agent there.

Containment available in the same host: `disallowed-tools` removes tools while a skill is active,
`disableSkillShellExecution: true` neutralizes `` !`command` `` injection for user, project, plugin, and
additional-directory skills, and deny rules in permission settings outrank a skill's own grant. Details in
[`claude-code.md`](claude-code.md).
