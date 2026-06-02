# Toolchain and Verification Gates

Depth for the toolchain rules summarized in `SKILL.md` (`## Toolchain Gates`). The SKILL states the four gates and the
lint-policy location; this file gives the exact command block, what each flag buys, the Clippy lint-group catalog with
`[lints]` priority mechanics, the stable-vs-nightly rustfmt option split with edition coupling, the rust-analyzer keys
an agent driving the LSP must set, and the `rust-toolchain.toml` pin.

## Contents

- [Verification Command Block](#verification-command-block)
- [Why Each Flag](#why-each-flag)
- [Clippy Lint Groups](#clippy-lint-groups)
- [Configuring Lints in `[lints]`](#configuring-lints-in-lints)
- [clippy.toml Thresholds](#clippytoml-thresholds)
- [rustfmt Configuration](#rustfmt-configuration)
- [rust-analyzer Configuration](#rust-analyzer-configuration)
- [rust-toolchain.toml Pin](#rust-toolchaintoml-pin)
- [Hygiene Tools](#hygiene-tools)

## Verification Command Block

Run these in order; each must exit zero before the work is "done". Surface every command and its result.

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo nextest run
cargo test --doc
cargo deny check        # or: cargo audit
```

The four core gates and why each exists:

- **`cargo fmt --all -- --check`** - verifies formatting without rewriting. `--all` covers every workspace package; `--`
  separates cargo args from rustfmt args; `--check` makes rustfmt exit non-zero on any diff instead of editing files.
  Use the check form in CI/agent mode; use the rewriting form (`cargo fmt --all`) only to fix.
- **`cargo clippy --all-targets --all-features -- -D warnings`** - runs Clippy across the whole build graph with every
  warning promoted to an error. `--all-targets` includes lib, bins, tests, examples, and benches (a lint that fires only
  in a test target is still a real defect); `--all-features` compiles every feature so feature-gated code is linted;
  `-D warnings` (after `--`) turns residual warn-level lints into hard failures.
- **`cargo nextest run` AND `cargo test --doc`** - nextest is the fast parallel test runner but does **not** execute
  doctests, so the separate `cargo test --doc` run is mandatory. Skipping it lets documentation examples rot (signatures
  drift, examples stop compiling) while the suite stays green. Both runs are required; neither substitutes for the
  other.
- **`cargo deny check`** (or `cargo audit`) - gates dependencies for security advisories, license policy, banned crates,
  and source restrictions. `cargo audit` covers only the RustSec advisory database; `cargo deny check` is the superset
  (advisories + licenses + bans + sources), preferred where configured.

## Why Each Flag

Common mistakes and the correct invocation:

<example name="clippy-flags">

**Bad - narrow Clippy run that misses defects:**

```bash
cargo clippy
```

Lints only the default target set (no tests/examples/benches), only default features, and treats warnings as warnings -
so feature-gated bugs, test-only lint hits, and any non-denied warning all pass silently.

**Good - full graph, warnings as errors:**

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

</example>

When a project's features are mutually exclusive (so `--all-features` cannot compile), drop `--all-features` and run
Clippy once per valid feature set, or use `cargo hack --feature-powerset`. Do not silently weaken the gate to a single
default-feature pass; state the constraint.

## Clippy Lint Groups

Clippy ships 800+ lints divided into categories, each with a default level. Treat the on-by-default set as the floor;
opt into stricter groups deliberately, lint-by-lint where they over-fire.

- **`clippy::correctness`** - code that is outright wrong or useless. Default level **deny**. Never downgrade these
  without a `reason`; a correctness hit is almost always a real bug.
- **`clippy::suspicious`** - code that is most likely wrong or useless. Default level **warn**. Part of `clippy::all`.
- **`clippy::style`** - code that should be written more idiomatically. Default level **warn**. Part of `clippy::all`.
- **`clippy::complexity`** - code that does something simple in a complex way. Default level **warn**. Part of
  `clippy::all`.
- **`clippy::perf`** - code that can be written to run faster. Default level **warn**. Part of `clippy::all`.
- **`clippy::all`** - the aggregate of correctness + suspicious + style + complexity + perf. This is what
  `cargo clippy -- -D warnings` enforces; it is the baseline every project must pass.
- **`clippy::pedantic`** - stricter lints with occasional false positives. Default level **allow** (opt-in). Worth
  enabling at `warn`, then `allow`-ing the few that genuinely over-fire with a `reason`.
- **`clippy::nursery`** - new lints still under development. Default level **allow**. Useful but expect churn and false
  positives; enable selectively, not as a blanket gate.
- **`clippy::cargo`** - lints for the `Cargo.toml` manifest (e.g. redundant or wildcard dependency issues). Default
  level **allow**. Cheap to enable at `warn` for manifest hygiene.
- **`clippy::restriction`** - lints that forbid otherwise-reasonable language/library features (e.g. `unwrap_used`,
  `float_arithmetic`, `todo`). Default level **allow**. **Never enable the whole group.** Its lints may contradict each
  other and other categories, and lint perfectly fine code. Enable individual restriction lints case-by-case (e.g.
  `#[forbid(clippy::unwrap_used)]` on a module that must not panic).

Decision matrix - how aggressively to adopt each group (default level -> project policy -> enforce as):

- **`correctness`** - default deny; keep at deny, never relax blanket-wide; enforce as error.
- **`all`** - default warn; the mandatory baseline; enforce as error (`-D warnings`).
- **`pedantic`** - default allow; opt in, allow-list the few false positives; enforce as warn.
- **`nursery`** - default allow; selective individual lints only; enforce as warn.
- **`cargo`** - default allow; opt in for manifest hygiene; enforce as warn.
- **`restriction`** - default allow; individual lints only, never the group; enforce as targeted.

## Configuring Lints in `[lints]`

Set lint levels in the `[lints]` table in `Cargo.toml` (or `[workspace.lints]` for a shared workspace policy), not in
scattered `#![deny(...)]` attributes or `RUSTFLAGS`. This keeps policy in one auditable place that Cargo applies to the
current package, not to dependencies. The `[lints]` table is respected as of Rust 1.74.

The table under `[lints]` is keyed by tool: the part before `::` in a lint name is the tool, and a name with no `::`
belongs to `rust`. So `unsafe_code` -> `[lints.rust]`, `clippy::enum_glob_use` -> `[lints.clippy]`.

Each lint takes a level (`forbid`, `deny`, `warn`, `allow`) and an optional `priority` (a signed integer). Priority
exists to resolve group-vs-individual conflicts: lower (more negative) numbers are overridden by higher numbers. To
enable a whole group at `warn` but then `allow` a handful of its members, give the **group** a negative priority so the
individual lints (default priority 0) win.

<example name="lints-table">

**Workspace policy that enables pedantic but exempts two over-firing lints:**

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
missing_docs = "warn"

[workspace.lints.clippy]
# Group at negative priority so the per-lint overrides below take precedence.
all = { level = "deny", priority = -1 }
pedantic = { level = "warn", priority = -1 }
# These two over-fire in this codebase; documented exceptions.
module_name_repetitions = "allow"
must_use_candidate = "allow"
```

Each crate then opts in with:

```toml
[lints]
workspace = true
```

</example>

Without the negative priority, the group entry and the per-lint entries collide at the same priority and the result is
order-dependent. Always demote the group below the specifics.

For a one-off, narrow override inside code, prefer `#[expect(lint, reason = "...")]` over `#[allow(...)]`: `expect`
emits a warning when the lint stops firing, so stale suppressions surface instead of lingering. Reserve `#[allow]` for
generated code and macro expansions where `expect` is impractical.

## clippy.toml Thresholds

A `clippy.toml` (or `.clippy.toml`) at the project root configures the numeric thresholds and allow-lists that several
Clippy lints read - the cognitive-complexity ceiling, the too-many-arguments count, the large-enum-variant size, the
type-complexity threshold, MSRV for version-gated lints, and disallowed-method/type lists. Configure these when a lint's
default threshold does not match the project rather than blanket-`allow`-ing the lint: a tuned threshold keeps the lint
working everywhere else.

```toml
# clippy.toml
msrv = "1.85"
cognitive-complexity-threshold = 30
too-many-arguments-threshold = 8
```

Set `msrv` here (or rely on the package `rust-version`) so version-gated Clippy lints do not suggest APIs newer than
your minimum supported toolchain.

## rustfmt Configuration

rustfmt reads `rustfmt.toml` (or `.rustfmt.toml`) from the project root or any parent directory. Two axes matter for an
agent: which options are usable on stable, and the edition coupling.

**Stable vs nightly-only.** Each option is either stable (usable on any toolchain) or unstable (nightly only, requiring
`unstable_features = true` in the config or `--unstable-features` on the CLI). An unstable option in `rustfmt.toml`
makes `cargo fmt` on stable error or ignore it - a silent formatting drift. Verify the option's status before adding it.

Commonly-wanted options by status:

- **Stable (safe in any `rustfmt.toml`):** `edition`, `style_edition`, `max_width`, `tab_spaces`, `hard_tabs`,
  `newline_style`, `use_small_heuristics`, `reorder_imports`, `reorder_modules`, `merge_derives`,
  `use_field_init_shorthand`, `use_try_shorthand`, `match_block_trailing_comma`, `match_arm_leading_pipes`,
  `fn_params_layout`, `single_line_if_else_max_width`, `single_line_let_else_max_width`, the granular `*_width` knobs
  (`fn_call_width`, `struct_lit_width`, `array_width`, `chain_width`, ...).
- **Nightly-only (`Stable: No` - require nightly + `unstable_features`):** `imports_granularity`, `group_imports`,
  `imports_layout`, `wrap_comments`, `comment_width`, `format_code_in_doc_comments`, `format_strings`,
  `normalize_comments`, `condense_wildcard_suffixes`, `reorder_impl_items`, `blank_lines_upper_bound`,
  `struct_field_align_threshold`, `where_single_line`, `binop_separator`.

The frequently-requested import-tidying options (`imports_granularity = "Crate"`, `group_imports = "StdExternalCrate"`)
and `wrap_comments` are all nightly-only. A team that wants them must run `cargo +nightly fmt`; stable `cargo fmt` will
not apply them.

**Edition coupling.** Two distinct options:

- `edition` sets the language edition the rustfmt parser uses. `cargo fmt` reads this from `Cargo.toml` automatically,
  but bare `rustfmt` defaults to edition 2015 - so direct `rustfmt` invocations parse newer syntax wrong unless
  `edition` is set in the config.
- `style_edition` (stable) selects the Rust Style Guide edition that governs formatting decisions, per RFC 3338. It is
  inferred from `edition` when unset, but only by `cargo fmt`; bare `rustfmt` defaults `style_edition` to 2015. The
  deprecated `version = "Two"` is equivalent to `style_edition = "2024"`; use `style_edition` instead.

For a Rust 2024 project, pin both explicitly so `cargo fmt` and direct `rustfmt` agree:

```toml
# rustfmt.toml
edition = "2024"
style_edition = "2024"
max_width = 120
```

(`max_width` defaults to 100; set it only if the project's line-length convention differs.)

## rust-analyzer Configuration

When driving the `rust-analyzer` LSP (not the CLI), these keys decide whether the editor diagnostics match the gate the
CLI enforces. Settings use the `rust-analyzer.` prefix; the path after the prefix is the JSON key path.

- **`check.command`** (default `"check"`) - set to `"clippy"` so on-save diagnostics run Clippy, surfacing the same
  lints the `cargo clippy` gate enforces instead of plain `cargo check`. The single most impactful key for catching gate
  failures while editing.
- **`checkOnSave`** (default `true`) - the reliability caveat: rust-analyzer runs `check.command` **only on save**, not
  as you type. Live red squiggles come from rust-analyzer's own analysis; Clippy lints appear only after a save and a
  check pass completes. Absence of squiggles does not mean Clippy-clean - trigger a save (or run the CLI gate) before
  declaring done.
- **`check.allTargets`** (defaults to `cargo.allTargets`, itself `true`) - keep on so check covers tests/examples,
  matching the `--all-targets` gate flag.
- **`cargo.features`** (default `[]`) - set to `"all"` to pass `--all-features`, matching the gate; or list the exact
  features the workspace needs. `check.features` defaults to this.
- **`cargo.noDefaultFeatures`** / **`check.noDefaultFeatures`** - set when the project must be analyzed without default
  features.
- **`procMacro.enable`** (default `true`) - required for accurate analysis of proc-macro-heavy code (serde, tokio,
  async-trait); enabling it implies `cargo.buildScripts.enable`. If hover/goto resolves macro-generated items as
  unknown, confirm this is on.
- **`cargo.buildScripts.enable`** (default `true`) - runs `build.rs` so `cfg`/generated code is analyzed precisely.
- **`cargo.targetDir`** - point rust-analyzer's `cargo check` at a separate target directory to stop it from locking
  `Cargo.lock` and blocking concurrent CLI builds, at the cost of duplicated artifacts. Useful when an agent runs CLI
  gates while the LSP is live.
- **`check.overrideCommand`** - escape hatch when wrapping cargo (e.g. a workspace check script); the command must emit
  JSON (`--message-format=json`). Prefer the granular keys above unless a non-cargo build system forces this.

A minimal initialization payload that aligns the LSP with the gate:

```json
{
  "check": { "command": "clippy" },
  "cargo": { "features": "all" },
  "procMacro": { "enable": true }
}
```

## rust-toolchain.toml Pin

Pin the toolchain channel and the components every contributor (and the agent) needs so the gates run identically
everywhere. rustup reads `rust-toolchain.toml` from the project root and auto-installs the pinned toolchain.

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.85.0"             # or "stable"; pin an exact version for reproducible CI
components = ["rustfmt", "clippy", "rust-analyzer"]
profile = "minimal"
```

Pin an exact version (not just `stable`) when CI reproducibility matters - a floating `stable` means a new release can
introduce new Clippy lints that break the `-D warnings` gate without any code change. Listing `rustfmt`, `clippy`, and
`rust-analyzer` as components guarantees the gate tools are present after `rustup` resolves the toolchain. Keep the
pinned channel `>=` the package `rust-version` (MSRV); pinning below MSRV makes the project unbuildable.

## Hygiene Tools

Beyond the four gates, these tools keep the dependency graph honest. Not in the core block but belong in CI:

- **`cargo deny check`** - advisories, licenses, banned crates, and source policy in one pass (configured via
  `deny.toml`). The preferred dependency gate.
- **`cargo audit`** - RustSec advisory scan only; a lighter subset of `cargo deny`.
- **`cargo machete`** - finds dependencies declared in `Cargo.toml` but never used, so the manifest stays lean.

Run `cargo deny check` (or at minimum `cargo audit`) in CI; run `cargo machete` periodically or before a release to
prune dead dependencies.
