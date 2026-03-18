# Creating a New Skill

Step-by-step workflow for creating skills in cc-foundry. Read this guide when creating a new skill or adding skills to
an existing plugin.

<workflow>

## Phase 1: Research

Discovery must precede all structural decisions — including which plugin the skill belongs to. Two tools serve different
roles: **Perplexity** discovers and verifies (live web search, fast answers, reasoning); **NotebookLM** synthesizes and
persists (grounded answers from curated sources, persistent knowledge base). Use both — Perplexity for breadth and
recency, NotebookLM for depth and grounded synthesis.

<research-tools>

**Perplexity** — discovery, fact-checking, recency verification. Use `perplexity_search` to find official doc pages,
changelogs, and source URLs. Use `perplexity_ask` for quick factual answers about current versions, feature status, and
best practices. Use `perplexity_reason` to evaluate tradeoffs or compare approaches. Use `perplexity_research` for
comprehensive landscape surveys when the domain is unfamiliar. Always include version numbers and years in queries.

**NotebookLM** — synthesis and persistent knowledge base. Sources added to a notebook become a queryable corpus for
grounded, citation-backed answers. NotebookLM cannot discover new sources — you bring them from Perplexity, web search,
or manual curation. Its strength is cross-source synthesis, contradiction detection, and structured summarization over a
fixed set of documents.

</research-tools>

1.  **Establish the current state with Perplexity.** Before committing to deep research, use Perplexity to answer:
    - What is the current stable version of the subject technology?
    - What changed in recent releases? What was deprecated or removed?
    - What are the primary official documentation sources?
    - Are there existing Claude Code skills, agentic workflows, or MCP integrations for this subject?

    This grounds the entire research phase in current facts and prevents wasting time on outdated sources.

2.  **Find or create a NotebookLM notebook.**
    - Search existing notebooks by description — if one directly matches the domain and purpose, reuse it.
    - If a partially relevant notebook exists but is 60%+ full, query it for domain knowledge but create a new notebook
      for this skill's research. The iterative research loop requires source headroom — if you can't add ~50 sources,
      create a new one.
    - Default: create a new notebook. Name with a machine-parseable convention (e.g., `proxmox-ve-9-skill-research`) and
      describe it so future agents can find it by description search.

3.  **Deep research #1 — the subject domain.** Research the subject itself: official documentation, specifications,
    capabilities, APIs, and how it works. This is a documentation-driven pass. Use Perplexity to discover source URLs,
    then add them to the NotebookLM notebook. **Bias toward recency** — include version numbers and year in queries
    (e.g., "Proxmox VE 9.1 2025", "Ansible-core 2.18 2026") to surface the latest state of the technology.

4.  **Deep research #2 — agentic application.** Research how people use the subject with autonomous agents: existing
    skills, blog posts, agentic workflows, and integration patterns. Prioritize quality sources — original findings,
    undocumented behavior, novel techniques. Skip tutorials that repackage official docs.

5.  **Assess source quality and recency.** After each research pass, review source summaries and remove entries that are
    low-quality **or outdated**. NotebookLM sometimes pulls in low-signal sources during deep research. Use Perplexity
    to verify claims that seem outdated — `perplexity_ask` with version-specific questions is effective for this.

    <recency-rules>

    Outdated information is worse than no information — it produces confidently wrong agent behavior.
    - **Identify the subject's current stable version.** Every research pass should establish the latest stable release
      as a baseline. Sources describing behavior from superseded versions are suspect.
    - **Remove sources that describe removed or replaced features** — e.g., a guide for a deprecated API, a tutorial for
      a configuration format that no longer exists, or a blog post about a workaround that is now built-in.
    - **Flag version-specific claims.** When a source says "X is not supported" or "Y requires workaround Z", verify
      whether this is still true in the current version. These negative claims age the worst — features get added, but
      old "not supported" statements persist in search results indefinitely.
    - **Prefer changelogs and "What's New" pages** over static documentation for understanding recent changes. These
      pages are authoritative and time-stamped.
    - **Cross-reference across tools** — ask NotebookLM "Is [claim] still accurate as of [current version]?" to check
      against your curated sources. Use Perplexity to verify against the live web. When sources contradict each other,
      the more recent official source wins.

    </recency-rules>

6.  **Query and refine.** Query the NotebookLM notebook to build understanding of the domain. This reveals gaps and
    generates better questions. Use Perplexity to fill gaps that require live web data (recent releases, community
    sentiment, emerging patterns), then add high-value discovered sources back to the notebook. Specifically ask
    recency-oriented questions: "What changed in the latest version?", "What was deprecated or removed?", "What new
    capabilities were added?"

7.  **Target: ~50 quality sources** in the notebook (half the 100-source limit), leaving room for future research if
    needed.

## Phase 2: Scaffold

8.  **Decide plugin placement** — informed by Phase 1 research, determine which plugin the skill belongs to (existing or
    new).

9.  **Read the target plugin's CLAUDE.md** — understand scope boundaries and conventions. If the plugin has existing
    skills that relate to the new skill's domain, read their SKILL.md files to understand inter-skill relationships and
    alignment (e.g., how typescript references javascript). This is for positioning the skill in the existing
    infrastructure, not for matching tone.

10. **Scaffold the directory:**

    ```
    plugins/<plugin>/skills/<skill-name>/
    ├── SKILL.md              # Written last — needs reference material first
    ├── references/            # Optional: deepening material
    └── .dev/
        └── reference-inventory.json  # Optional: external doc sources
    ```

11. **Build the reference inventory** — select only the highest-value fetchable sources from the research notebook. The
    inventory must contain sources that can be pulled into an agent's context via the CLI toolchain. Not all research
    sources become inventory entries — only those with direct value for skill authoring.

    ```json
    {
    	"sources": {
    		"Topic Name": "https://example.com/docs/page.md"
    	}
    }
    ```

    <reference-inventory-guidance>

    **Building a quality inventory:**

    The inventory is the foundation of reference quality. Never write references from training data alone — always
    ground them in fetched official documentation.
    - **Start with official docs.** For languages: standard library reference pages (e.g.,
      `docs.python.org/3.14/library/typing.html`). For tools: the tool's own docs site (e.g.,
      `docs.astral.sh/ruff/configuration/`). For frameworks: the framework's how-to and API reference pages.
    - **Add the canonical style guide** if one exists (e.g., PEP 8, Google Style Guide, Effective Go). These are
      high-signal sources for convention-oriented skills.
    - **Add "What's New" pages** when targeting a specific language version — they document the exact features and
      syntax changes the skill should cover.
    - **Add specification pages** alongside tutorial pages for the same topic (e.g., the pyproject.toml specification
      alongside the "Writing pyproject.toml" guide). Tutorials explain the happy path; specs cover edge cases and full
      field lists.
    - **Skip tutorials** — they paraphrase official docs, go stale, and add noise. Official docs and canonical style
      guides are sufficient.
    - **Include blog posts only when they contain original findings** — reverse-engineered internals, undocumented
      behavior, activation patterns, or novel techniques not covered by official docs. Posts that merely repackage
      official documentation as a walkthrough are tutorials in disguise — skip them.
    - **Use Perplexity or web search** to discover sources you might not know about, but be selective — most results for
      well-known ecosystems are obvious. The real value is for niche tools or discovering lesser-known official doc
      pages.
    - **10–15 sources per skill is typical.** More is fine if each source covers a distinct topic. Fewer is fine for
      narrow skills. </reference-inventory-guidance>

12. **Fetch and distill** — fetch docs, then distill into `references/*.md` files:

    ```bash
    cd .dev && yarn cli docs-fetch <path-to-inventory.json>
    ```

    URLs ending in `.md`/`.mdx` fetch as raw markdown. Others convert from HTML. Full CLI docs:
    [.dev/CLAUDE.md](.dev/CLAUDE.md)

## Phase 3: Write

13. **Query NotebookLM** — ask skill-creation-relevant questions to enrich context beyond what the fetched references
    provide. The notebook serves as a live knowledge base during writing.

14. **Invoke `skill-engineering` and `prompt-engineering`** — load both skills before writing. skill-engineering
    provides the description formula, content architecture rules, and archetype templates. prompt-engineering provides
    instruction design techniques.

15. **Write SKILL.md** — frontmatter (`name`, `description`) + behavioral content. SKILL.md must be behaviorally
    self-sufficient. References provide depth, not breadth. Writing the skill last ensures it's informed by the research
    and distilled reference material.

## Phase 4: Ship

16. **Update documentation** — plugin CLAUDE.md (skill table, flow diagram if applicable), plugin README.md (skill
    listing), root CLAUDE.md structure diagram (only if new plugin).

17. **Version bump** — update both `plugins/<plugin>/.claude-plugin/plugin.json` and root
    `.claude-plugin/marketplace.json`.

</workflow>
