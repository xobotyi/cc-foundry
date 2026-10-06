---
name: frontend-design
description: >-
  Decide and verify what a web interface looks like: reuse of the existing design, color, type, layout, controls,
  states, and interface copy that trace to the product instead of a framework or model default.
when_to_use: >-
  Invoke whenever what a user sees in a web UI is being decided or judged — building or restyling a page, screen, or
  component, adding a control to an existing screen, placing or labeling something, choosing colors, fonts, spacing, or
  a layout, mocking up variants, or reviewing a UI that reads as generic, templated, AI-generated, cluttered,
  inconsistent, or unpolished. Also invoke on the symptoms: a screen that does not match its neighbors, a UI change
  reported as done without being rendered, a build that differs from the approved mockup, a label taken from a code
  identifier, invented testimonials or metrics. Covers which choice to make and whether it landed on the rendered page.
  Not for why a style fails to apply or how to write a layout, which belong to css and tailwindcss; WCAG conformance
  belongs to accessibility, component code to the framework skills.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**A default is a decision nobody made, and an interface nobody looked at is unverified.** Interfaces go wrong at those
two points. A value arrives from the model's habits or from a framework's stock settings and ships unexamined. Then the
result is checked by reading markup instead of looking at the page.

**Fix the design, not the detection.** A pattern is a defect when nothing chose it, never because it resembles other
sites. The navigation, the form, and the table a user already knows are what make an interface usable.

## Find what already decides

Before any visible choice, establish what has already made it. Take the first that holds.

1. **What the user specified for this change** — an instruction, an approved mockup, a reference site or screenshot, a
   brand, a named direction. It governs every axis it names, also where it departs from the existing design or names a
   look from the stock list below. Say where it departs. An answer covers only the question it answered.
2. **The project's own design** — its tokens, theme, design document, the component kit as the project themed it, and
   the neighboring screens. Build from its parts. Never place a color, font, radius, shadow, or spacing value beside an
   existing scale, and never write a component the project already has. It governs even where its values are a kit's
   shipped defaults: changing those is a restyle, and a restyle is requested, never volunteered.
3. **A host application** — when the work is injected into an interface the project does not own, as an extension, an
   embedded widget, or a plugin does, the host's controls, classes, spacing, and separators are the system. Write a
   component of your own only where the host has none.
4. **The subject** — with none of the above, derive the choices from what the product is, who uses it, and the material
   of its domain. Ask once for a reference when a person is there to answer and the surface has no design to inherit.
   Without an answer, state the direction before building it.

Where the project has a token source or a neighboring screen, read it before writing a style. A system recalled from a
framework's documentation is not the project's system.

## Decide what is left open

- **The structure of a page or screen with no precedent belongs to the user.** When a person is there to choose, show
  two or three structurally different variants as clickable pages built from the product's real content. Name what each
  one costs. Make one of them the plainest arrangement that does the job.
- **A control added to a screen joins the group it belongs to.** Place it in the existing bar, row, or section beside
  related controls, set off by the separator that group already uses. A row or section of its own is the last resort.
- **On a task surface, convention outranks expression.** App screens, dashboards, settings, and tools use the patterns
  their users already know, and carry identity in tokens and details. Identity leads only on a surface built to
  persuade: a landing page, a campaign, a portfolio.
- **For a surface with no design to inherit, write the decisions down before the code**: the palette as named values
  with roles, the typefaces and the role of each, the layout as what the user must see and do first, and the one element
  that leads. Test the palette and the typefaces: would they come out the same for a different product in the same
  category? Those that would are defaults. Replace each with a choice only this subject explains.
- **Never replace one default with another.** A different stock accent, or the fashionable alternative to the usual
  typeface, changes which default it is. Every widely prescribed substitute converges in its turn.
- **Every decision you state must be findable in the render.** Do not describe design intent the code does not carry.

## Examine what you inherit

A framework's layout, a kit's component, and a host's class each arrive with settings nobody on this project chose. Once
the change ships, they are your decisions. Check each against the surrounding product:

- the breakpoint at which a layout collapses, against the widths this product is used at;
- corner shape, padding, and density, against the neighboring controls;
- the selected, hover, and focus colors, against each other and in every theme;
- what a component does — single or multiple selection, what a slot renders when handed no content — against what was
  asked;
- whether the default applies at all. A style the framework's source defines reaches only the elements rendered through
  that code path.

Reuse does not excuse the result. A stock component that looks or behaves wrong in place is restyled from the project's
tokens or replaced.

## Stock looks

Each of these is what an unspecified axis resolves to. The list applies to an axis left free while building, and to a
review asked to judge the look. Each entry is legitimate when the user or the project chose it.

- **A framework palette's default accent used as the brand**, and gradient as decoration: gradient text, gradient
  buttons, gradient washes.
- **A component kit left on its stock theme**, or only recolored.
- **Cards as the only structure** — every section a row of same-size cards, an icon in a tinted box above each title,
  cards inside cards.
- **One treatment everywhere** — the same radius, shadow, and padding on every element, whatever its rank.
- **An active item drawn as a filled rounded block with an accent stripe on one edge**, and the same stripe on cards and
  callouts.
- **Unrequested effects** — glow on a dark background, hover-scale on every card, an entrance animation on every
  section.
- **Decoration posing as information** — an eyebrow label above a heading, numbered markers on content that is not a
  sequence, a status dot or version badge that reports nothing, one word of a headline set in a different style.
- **Emoji as icons**, and an icon library's most-used glyphs standing in for the product's own marks.
- **The starter typeface, or the usual replacement for it.**
- **A page skeleton chosen before the content** — centered hero, three features, call to action.

The named fonts, colors, and combinations turn over within months. The dated catalogue, how often each look is reported,
and the patterns cleared as not worth flagging: `${CLAUDE_SKILL_DIR}/references/converged-defaults.md`. Read it when
auditing a UI for a generic look, and before filling a free color or type axis.

## Draw less

The first pass draws the least that carries the information.

- **A count is a plain number.** A tag, pill, badge, or chip earns its container only when the container encodes
  something the bare text cannot.
- **One element leads the view.** Keep everything around it quiet.
- **Add no control or text nobody asked for.** No presets, clear buttons, or status lines beyond the request. Text a
  state requires — an error, a required-field legend — is not an extra.

## Controls and states

- **A control exists only when the data has something for it to act on**, judged on the unfiltered data. No filter for
  an attribute nothing carries, and no stand-in value invented for missing data.
- **Choose the control for the real number of values.** A set that can reach dozens gets a menu, not a row of toggles.
- **A selected state is unmistakable and light.** It differs from rest and from hover in every theme, by more than color
  alone, and without a filled block where a change of text and a thin rule would do.
- **Toggling a control does not nudge it.** A check mark, a selected style, or a pressed state leaves the control's size
  and baseline unchanged.
- **In navigation, icons mark destinations, never section headings.** Give every row of a list an icon, or none.

## Words and content

- **Labels use the words the product's users already use** — never a code identifier, a field name, or a hostname.
- **A control names its result.** An action is called the same thing on its button, in its confirmation, and in the
  message that follows, and one word never names two different actions.
- **The interface shows the product, never the history of the change.** No "new", "updated", "preview", or version tags
  on things that simply exist.
- **Never invent proof or data.** No fabricated testimonials, customer logos, user counts, ratings, or metrics, and no
  sample data presented as real. Use what the project supplies. Without it, omit the element, or mark the placeholder
  visibly and report it.
- **Marketing copy says what only this product could say.** A headline that fits any product in the category is filler.
- **Errors and empty states say what happened and what to do next.**
- **Design against real content** at its shortest, its typical, and its longest plausible length.

## One system across screens

- **Things that must be identical are one component.** Render a shared header, footer, or control from a single source
  in every layout. Two configurations tuned to match drift apart.
- **A change to one of several siblings is checked against the rest.** Where it leaves them visibly inconsistent, say so
  and offer to extend it. Do not extend it unasked.
- **A functional change restyles nothing it did not add.**
- **With no system and more than one screen to build, define the tokens first** — color roles, type scale, spacing
  scale, radius, elevation — and build every screen from them.

## Verify the render

- **Look at the page.** A DOM query, the served HTML, an ARIA attribute, a passing test, and the framework's source each
  confirm that something exists. None shows how it is arranged or whether it is visible. A headless-browser screenshot
  counts; a DOM dump does not.
- **Render every change a user can see, and scale the pass to its reach.** A label change: the element at its narrowest
  width. A component edit: the component in each of its states. A token or shared-layout edit: one page for each
  distinct layout that uses it.
- **For a layout change, cover three widths** — desktop, phone, and one between them, placed just below the layout's
  widest breakpoint where it has one.
- **Cover the states the change can reach** — selected, toggled, filtered, empty, hidden, overflowing with long content,
  and each theme.
- **Judge named properties, never the overall impression.** A screenshot of a broken state reads as fine at a glance.
  Check each of these against a screenshot, and against computed styles where a number decides:
  - every item of an approved mockup and every requested control is present, in the approved order and position;
  - nothing overflows, clips, wraps apart from its label, or scrolls sideways;
  - the gaps on both sides of a separator are equal, and spacing values come from one scale;
  - items on one line share a baseline, and edges that should align do;
  - inputs and surfaces that carry no meaning carry no accent tint;
  - text meets 4.5:1 contrast, and large text 3:1.
- **Operate what the change added or moved.** Follow each link and use each control. A screenshot shows neither where a
  link leads nor what a control does.
- **After a visual fix, re-check every width and state the fix reaches**, not only the one it was written for.
- **A stand-in verifies only what it draws.** When a stub replaces the host or the data, say what it does not model.
- **When you cannot render, say so and give the user the means to look** — start the dev server or name the page — with
  the list of what went unchecked. Never report an unrendered arrangement as matching.
- **Fix a defect your change introduced or exposed; do not offer it as a decision.** Unreachable navigation, unreadable
  text, and overflowing content are bugs. Report a defect that was there before the change, and leave it.
- **Stop polishing after two rounds.** Inspect, fix everything found in one batch, confirm with one more pass. Further
  rounds are for defects only, never for taste.

Thresholds with their sources — measure, line height, contrast, motion duration, palette size — and the widely repeated
rules no source supports: `${CLAUDE_SKILL_DIR}/references/render-checks.md`. Read it when a check needs a number or a
design rule is contested.

## Application

When **building**: apply these rules silently. State the decisions for a surface with no inherited design once. Do not
narrate rules or announce checks. Report what was rendered, at which widths and in which states, and what was not.

When **reviewing**: cite each finding with `file:line` or the rendered location, and name what it fails to trace to.
Offer the project's own value as the fix. Where the project has none, ask, or offer two distinct options — never
substitute a value of your own. Do not flag a pattern the user or the project chose, and do not flag a convention for
being common.

## Integration

`css` and `tailwindcss` govern how styles and tokens are written, including when a one-off value is acceptable; this
skill governs which values they hold and whether the page shows them. `accessibility` governs contrast, focus, and
motion conformance, and wins where the two meet. The framework skills govern component code. Prose for readers —
documentation, articles, release notes — belongs to `the-writer`'s `humanize`; interface copy stays here.

**Find what decides, decide what is left, and look at the page.**
