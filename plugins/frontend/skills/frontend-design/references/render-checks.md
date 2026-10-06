# Render Checks

Numbers a render check or a design review can need, each with the source that states it. Read this file when a check
needs a number, or when a design rule is contested.

**A threshold sends you to look; it never decides.** The sources are typographers and design-system authors stating
recommendations, several of them for print or for one platform. Where they disagree, both numbers stay. The project's
own tokens outrank every recommendation here. The contrast thresholds are conformance criteria, and no token outranks
them.

## Text

- **Measure, in characters per line of body text.**
  - 45–75, with 66 called ideal and 40–50 for multiple columns — Bringhurst, quoted in _The Elements of Typographic
    Style Applied to the Web_, 2.1.2.
  - 45–90, counting spaces — Butterick, _Practical Typography_.
  - "Around 70", with 60 to 80 treated as equivalent — Hobday.
- **Line height, body text.**
  - 120–145% of the font size — Butterick.
  - "Upwards of 1.3" is common on the web — _Applied to the Web_, 2.2.1.
  - 1.5 as a starting point, rising toward 2 as the measure widens — Refactoring UI.
- **Line height, large headings.** It falls as size rises, and 1 is acceptable for large headline text — Refactoring UI.
- **Capitals.** 5–12% extra letterspacing on all-caps and small-caps text — Butterick. Lowercase is not letterspaced
  without a reason — Bringhurst.
- **Type scale.** No source prescribes a ratio. Check that the steps are visibly distinct and come from one scale.

## Contrast

- **Text** — 4.5:1; 3:1 for large text. WCAG 2.2, 1.4.3.
- **Interface components and meaningful graphics** — 3:1 against adjacent colors. WCAG 2.2, 1.4.11.

Conformance belongs to the `accessibility` skill. The numbers appear here because low contrast is among the defects most
often reported in generated interfaces.

## Color

- **Neutral ramp** — 8–10 greys — Refactoring UI.
- **Primary colors** — "one, maybe two" — Refactoring UI. Two primary and two secondary for an uncomplicated design —
  NN/g.
- **Shades per color** — 5–10 — Refactoring UI. Tailwind ships 11 steps and Radix 12; those describe the two scales and
  are not a rule.
- **Black and white** — start from a very dark grey, not true black — Refactoring UI. Near-black and near-white in place
  of the pure values — Hobday. A tinted near-black standing in for black is also on Anthropic's list of template chrome,
  so the value is a decision to make, not a default to take from either side.
- **Tinted neutrals** — add the interface's hue to the greys, under 5% saturation in HSB — Hobday. An authored
  technique; untinted neutrals are as defensible.

## Shape and space

- **Nested corners** — inner radius equals outer radius minus the gap between them — Hobday. "Child ≤ parent;
  concentric" — Vercel Web Interface Guidelines.
- **Spacing** — no source mandates a scale. Check that the values come from one scale and that related items sit closer
  than unrelated ones.

## Motion

- **Duration.**
  - Desktop 150–200 ms. Mobile about 300 ms: 225 entering, 195 leaving, 375 for a large full-screen transition.
    "Transitions that exceed 400ms may feel too slow." — Material Design, the original motion guidance.
  - "Usually shorter than 300ms" — Kowalski.
  - "Not more than 200ms for interactions to feel immediate" — Freiberg, Web Interface Guidelines.
- **Frequency.** How often a user sees an animation decides whether it exists. Keyboard-initiated actions are never
  animated — Kowalski. Frequent, low-novelty actions avoid extraneous animation: opening a context menu, adding or
  deleting a list item, hovering a trivial button — Freiberg.
- **Interruption.** An animation responds to input while it runs — Vercel Web Interface Guidelines.

The `css` skill gives 200–400 ms for view transitions. The sources above disagree with each other across that same span,
so a duration between 150 and 400 ms is never a finding by itself.

## Copy

- **Buttons and links** — a verb is "almost always best"; a link describes its destination and never reads "Click here"
  — Apple Human Interface Guidelines, Writing.
- **Case** — Title Case for headings and buttons — Vercel Web Interface Guidelines. Sentence case — Anthropic's skill of
  the same name as this one. The sources disagree: follow the product's existing copy, and where there is none, pick one
  and hold it.

## Rules with no source behind them

Repeated widely, stated as a rule by none of the sources above. Never flag an interface for breaking one.

- An 8-point spacing grid.
- A maximum of two typefaces.
- A particular type-scale ratio, such as the golden ratio or a major third.
- A fixed content width in pixels.
- A fixed number of elevation levels.
- One easing curve for all motion.
- A character limit on button labels.

## Sources

- Bringhurst, applied to the web — `https://webtypography.net/2.1.2`, `https://webtypography.net/2.2.1`,
  `https://webtypography.net/toc`
- Butterick — `https://practicaltypography.com/summary-of-key-rules.html`
- Refactoring UI — `https://refactoringui.com/previews/building-your-color-palette`,
  `https://refactoringui.com/previews/line-height-is-proportional`
- Hobday — `https://anthonyhobday.com/sideprojects/saferules/`
- NN/g — `https://www.nngroup.com/articles/visual-hierarchy-ux-definition/`
- WCAG 2.2 — `https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html`,
  `https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html`
- Material Design, original motion guidance — `https://m1.material.io/motion/duration-easing.html`
- Kowalski — `https://emilkowal.ski/ui/great-animations`, `https://emilkowal.ski/ui/you-dont-need-animations`
- Freiberg — `https://interfaces.rauno.me/`
- Vercel Web Interface Guidelines — `https://github.com/vercel-labs/web-interface-guidelines`
- Apple Human Interface Guidelines, Writing — `https://developer.apple.com/design/human-interface-guidelines/writing`
