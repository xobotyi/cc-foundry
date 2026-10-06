# Converged Defaults

What generated interfaces converge on, how often each look is reported, which popular complaints fail a full read, and
what an agent does by default inside a product. Read this file when auditing a UI for a generic look, and before filling
a free color or type axis.

**Every entry is an observation, never a ban.** Each look is legitimate when a project or a brief chose it. The file
records what was reported through October 2026, and the named fonts and colors are the part that dates fastest.

## A prescribed substitute becomes the next default

Three documented cases: two guides whose own recommendation turned into the look they warned about, and one
recommendation that spread through practitioner threads.

- **unslop-ui.** Its first version recommended cream backgrounds, a forest-green accent, and Fraunces. Its author later
  listed exactly that look as the lead entry of the catalog, and wrote: "Any specific recommendation, repeated, becomes
  the next default and the next tell."
- **Anthropic's frontend guidance.** The November 2025 version named replacement typefaces — JetBrains Mono, Fira Code,
  Space Grotesk, Playfair Display, Crimson Pro — and noted in the same text that output converges on Space Grotesk.
  Anthropic's own `frontend-design` skill as of October 2026 lists a cream background with a serif display face and a
  terracotta accent as the first cluster generated design falls into. A commenter in the set below reports "the
  slopification of interesting options like Playfair and Bricolage".
- **Neo-brutalism.** Practitioner threads recommend it as the escape from purple gradients, and the same threads call it
  the generated default.

This is why a fix names the project's own value or asks for one. Nothing in this file is a recommendation.

## Looks

Counts are comments out of 2,533 read in full; the method is at the end of the file.

- **Stock accent and gradient** — a violet, indigo, or purple primary, a purple-to-blue gradient, a gradient headline.
  About 70 comments, and the only visual complaint with strong support. Commenters trace it to Tailwind's default indigo
  and to starter templates.
- **Dark with glow** — near-black background with neon or glowing accents, the glow added without being asked for.
  About 17.
- **Stock kit** — shadcn/ui, Tailwind UI, or Material on default tokens: slate or zinc cards, the default radius and
  shadow, the stock card repeated. A recolored kit is recognized as well. About 14, plus about 11 for cards as the only
  structural device and about 14 for the hero, feature row, call-to-action page skeleton.
- **Warm editorial** — cream or off-white background, a serif display face (Instrument Serif, Fraunces, Playfair
  Display), a sage, forest-green, or terracotta accent. Near `#F4F1EA` for the background and `#D97757` for the accent,
  the second being Anthropic's own product accent. Anthropic's skill and unslop-ui both list it first. The comment set
  holds 3 comments on serif headings and none on cream, so the support is author observation.
- **Acid on black** — a near-black background with one acid-green or vermilion accent. Author observation (Anthropic).
- **Broadsheet** — hairline rules, zero radius, dense newspaper-like columns. Author observation (Anthropic).
- **Neo-brutalism** — named as the generated default in 3 comments.

## Properties

- **Rounded corners on everything** — about 19.
- **Default or overused typeface** — Inter, including as a display face; Geist; system fonts; Space Grotesk. About 20.
- **Emoji as icons, stock icon glyphs** — the lightning bolt, the paper plane. About 19.
- **Unmotivated motion** — hover-grow, a shadow on hover everywhere, elements that "move, float, slide, appear for no
  reason". About 12.
- **Accent stripe on one edge** of a card, a callout, or an active item. 5 comments, and the one styling idiom a user
  named unprompted in the session set below.
- **Pill or badge holding a colored dot** — 6. **Fake status chrome** — "SYSTEM ONLINE", version tags, live
  indicators. 5.
- **Icon in a tinted translucent box** — 3. **Wide letter-spacing on buttons and titles** — 3.
- **No real imagery**, every section cards with icons — 4. **Narrow max-width and excess whitespace** — 5.
- **Template chrome**, listed by Anthropic without counts — a tracked-out all-caps eyebrow above every heading, meta
  strings joined with middle dots, labels built as "WORD — fragment", tinted near-black standing in for black, a
  monospace face for small data labels, an arrow appended to link and button text.

## Beyond the visual

About half of what commenters name is not a visual property.

- **Filler copy** — about 30. "Transform your X", "Empower your business", "Streamline your workflow", "Simple,
  transparent pricing", "No X. No Y. Just Z."
- **Inconsistent styling across screens or sections** — about 19. One reviewer's reading: "you vibe coded one screen and
  then separately you vibe coded a different screen".
- **Broken interaction** — dead links, forms that do not submit, missing hover states, a dialog that cannot be clicked.
  About 19, six of them about one site.
- **Low contrast** — about 12. **Responsive breakage** — about 8.
- **Placeholder social proof** — "Trusted by 500+", logo rows unrelated to the product. 8.

## Cleared

Do not flag these on their own.

- **Mesh, aurora, and blob backgrounds** — no mention in the full read. The keyword count behind the complaint matched
  `/blob/` in repository URLs.
- **Bento grids** — 2 mentions, defended in the replies.
- **Glassmorphism** — about 8, split between complaints and fans.
- **A three-card row** for content that is three parallel things — defended as a pattern that works.
- **Rounded corners, Inter, dark mode, and shadcn or Tailwind themselves** — each is defended in the threads. What gets
  reported is the untouched default.
- **Em dashes in page copy** — 5 comments, most of them about posts and articles. Not a finding about an interface.

## What commenters hold against the complaint

- **Sameness predates generation** — unthemed Bootstrap, WordPress templates, Material, then clones of whichever site
  was admired that year. About 74.
- **Familiarity is a usability feature** — "Lack of surprise is a feature." About 70.
- **Visitors do not notice or care** — about 57.
- **The look cannot be reliably detected** — about 29.

Each of the first two is named about as often as the most-reported look. They are the reason the skill treats a pattern
as a finding only when nothing chose it, and never treats a convention as a defect.

## Remedies and their record

First-hand reports, then advice given without a reported result.

- **Concrete visual references** — screenshots, a site, a mockup. 22 / 58.
- **A design system, tokens, or a rules file fixed before generating** — 17 / 32.
- **A specific brief or a named direction** — 17 / 57.
- **A component kit with a theme applied** — 10 / 24.
- **Explicit negative constraints** — 9 / 10.
- **A person makes the visual decisions and the agent implements** — 9 / 41.
- **Design in a separate tool, then hand off** — 11 / 33, much of it product promotion.
- **A review loop with screenshots or a second reviewer** — 1 / 5.
- **Several variants to pick from** — 1 / 1.

Reported failures: a recolor alone ("you are just using orange instead of purple"); a shared anti-slop prompt, which a
commenter expects to become "the next 'AI slop' pattern within a month"; and references and prompting in general, which
15 comments say go only part of the way, three of them reporting that a reference fails to carry animation and small
details.

## Agent defaults inside a product

From 52 user corrections across 18 Claude Code sessions on one product's web surfaces, September 2026. One correction
can show several of these patterns, so the counts sum past 52. With no direction given, the agent:

- kept every default of the framework's ready-made layout or component — 12 corrections;
- checked at one desktop width, in the resting state, and by reading markup when no browser was at hand — 13
  corrections, seven needing a narrower width and six a state change;
- decided structure and placement itself — 10 corrections, and its recommended variant was taken whole in one round of
  seven;
- drew more than was accepted — a filled rounded block with an accent edge for an active item, color and a container for
  counts and tags — 7 corrections;
- left things that should be identical different — 7 corrections;
- took labels from code identifiers and hostnames — 5 corrections;
- wrote its own components inside a host application that had built-in ones — 3 corrections;
- placed a control added to a screen on a row or section of its own — 3 corrections.

No correction in the set concerns a typeface or a palette, because every surface already had both. The set says nothing
about how an agent picks color or type from nothing.

## Measured

- **Design Theater** (arXiv 2607.22928, July 2026) — 24 tasks, five generative UI tools, 120 interfaces. Over 25% of the
  design rationales the tools stated were not implemented in the interface, rising to 34% for functional requirements.
  Across tools, appearance and layout converged and color varied more.
- **UI-Bench** (arXiv 2508.20410, August 2025) — 10 text-to-app tools, 30 prompts, 300 sites, over 4,000 blinded expert
  pairwise judgments. It ranks tools and tests no skill.
- No controlled measurement exists of any design skill's effect on rendered output, this one included.

## Method and sources

- **Comment counts** come from a full read of 2,533 comments in 98 threads, 2020 to 2026, taken from
  `https://github.com/JCarterJohnson/vibecoded-design-tells/tree/f7c4aefc2c797a66e55b49354a93917ab60d33ac`. 500 further
  comments sat in threads about generated video and other unrelated topics and were dropped. About 1,470 of the comments
  read carried nothing codable. Three readers coded separate thirds; the counts here sum their results and are
  approximate.
- **What the counts measure** is what vocal commenters name. They do not measure what separates a generated interface
  from a hand-built one.
- **That repository's own ranking** rests on a keyword lexicon. The full read found most lexicon entries rare, and the
  largest non-visual categories absent from the lexicon altogether.
- **Anthropic** —
  `https://github.com/anthropics/skills/tree/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/frontend-design`, and
  `https://claude.com/blog/improving-frontend-design-through-skills`, November 2025.
- **unslop-ui** — `skill/references/tells.md` and `skill/references/choosing-a-look.md` in the repository above.
