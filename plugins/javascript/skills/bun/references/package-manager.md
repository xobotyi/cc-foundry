# Package Manager and Workspaces

Depth on `bun install`, linker layout, workspaces, the lockfile, and supply-chain controls.

## Linker strategies and their defaults

Two layouts. `hoisted` flattens every dependency into a shared `node_modules`, as npm and Yarn do. `isolated` builds a
central store at `node_modules/.bun/<pkg>@<version>/` and symlinks the top-level `node_modules` into it, as pnpm does,
so a package can reach only what it declared.

Which one applies is decided by the `configVersion` recorded in `bun.lock`, not by a global default:

| `configVersion` | Workspaces present | Linker     |
| --------------- | ------------------ | ---------- |
| `1`             | yes                | `isolated` |
| `1`             | no                 | `hoisted`  |
| `0`             | either             | `hoisted`  |

A lockfile created before 1.3.2 gets `configVersion = 0` on the next install, so an existing project's layout does not
change under it. A project migrated from pnpm starts at `configVersion = 1`; one migrated from npm or Yarn starts at
`0`. Override with `--linker hoisted|isolated` or `[install] linker` in `bunfig.toml`.

### Phantom dependencies survive the isolated linker by default

Bun creates `node_modules/.bun/node_modules` holding a symlink to every installed package. That directory is an ancestor
of every store entry, so a store package can still resolve something it never declared. Set `[install] hoist = false` to
skip creating it, and undeclared imports fail instead.

One escape remains, shared with pnpm: the project's root `node_modules` also sits above the store, so direct
dependencies, `publicHoistPattern` matches, and workspace packages stay resolvable from any store package.
`hoistPattern` narrows what lands in the fallback directory; `publicHoistPattern` controls what is hoisted to the root.

### Global virtual store

`[install] globalStore = true` (or `BUN_INSTALL_GLOBAL_STORE`) materializes store entries once into `<cache>/links/` and
makes `node_modules/.bun/<pkg>@<ver>` a symlink into it. It applies only under the isolated linker and is off by
default. A warm install after `rm -rf node_modules` then does one `symlink()` per package instead of copying every
package's files — roughly 7× faster on a 1,400-package CI install (from 1.3.14, improved in 1.4.0).

Without it, Bun materializes each entry with `clonefile` on macOS, hardlinks on Linux and Windows, and full copies as a
fallback.

### Store path length

On Windows a store path over 260 characters works for Bun but not as the working directory of that package's lifecycle
scripts, so a deep dependency with a long git or tarball resolution can fail its `postinstall` there and nowhere else.

## Lifecycle scripts

Bun runs no lifecycle script by default. A built-in allow list covers popular packages, and it applies only to packages
resolved from the npm registry — a `file:`, `link:`, `git:`, or `github:` dependency named `esbuild` gets nothing from
the real `esbuild`'s entry (from 1.3.5). From 1.4.0, entries match the exact package name rather than a truncated hash.

`trustedDependencies` **replaces** the built-in list; it never extends it. Exactly one of three modes applies per
project:

- **Field omitted** — Bun's built-in list, npm sources only.
- **`trustedDependencies: ["a"]`** — only `a`. The built-in list is ignored entirely.
- **`trustedDependencies: []`** — no package runs a lifecycle script, without passing `--ignore-scripts` every time.

Adding one package to the field therefore silently disables `postinstall` for every package the built-in list used to
cover. Re-list the ones you still need.

Two adjacent fields, both from 1.3.2:

- **`nativeDependencies`** — for a package that ships prebuilt binaries as per-platform `optionalDependencies`
  (`esbuild` and `@esbuild/darwin-arm64`). Bun links the right binary directly instead of running `postinstall`.
- **`ignoreScripts`** — a per-package skip that wins even over `trustedDependencies`.

`--ignore-scripts` or `[install] ignoreScripts = true` disables every script, including those of trusted packages.

## Lockfile

`bun.lock` is text and is the default from 1.2. Commit it.
`bun install --save-text-lockfile --frozen-lockfile --lockfile-only` converts a binary `bun.lockb`, which is then safe
to delete.

`lockfileVersion: 2` (from 1.4.0) adds two parse-time checks: an npm package resolved to a tarball outside the
configured registry must carry an integrity hash, and a git dependency entry may not contain `/`, `\`, or `..`.
Lockfiles at v0 and v1 keep loading without them. A lockfile using nested or version-scoped overrides is
`lockfileVersion: 3`, which older Bun cannot read. From 1.3.10 `bun.lock` records a SHA-512 hash for GitHub and tarball
dependencies as well.

`bun install` migrates `yarn.lock` (v1), `package-lock.json` (`lockfileVersion` 2, 3, or 4), and `pnpm-lock.yaml`
automatically, and leaves the original in place. An npm 6 `package-lock.json` (`lockfileVersion` 1) is not migrated —
Bun warns and resolves from `package.json` instead.

`--lockfile-only` writes the lockfile without populating `node_modules`, and still fills the global cache with registry
metadata and git or tarball dependencies.

## Reproducible and offline installs

- **`bun ci`** — the same as `bun install --frozen-lockfile`. Bun does not turn frozen installs on in CI by itself.
- **`--frozen-lockfile`** — fails when `package.json` and `bun.lock` disagree. With no lockfile at all it installs from
  `package.json` and writes nothing. It works on a pruned monorepo checkout: a workspace listed in `bun.lock` whose
  `package.json` is missing on disk is skipped with a note, and the install fails only when a remaining workspace
  depends on a skipped one.
- **`--production`** — implies `--frozen-lockfile` and skips `devDependencies`. It only controls what is installed;
  `devDependencies` already in `node_modules` stay. `bun prune --production` removes them.
- **`--prefer-offline`** — skips staleness checks and fetches only what the cache lacks.
- **`--offline`** — never touches the network; anything uncached is an error. `--offline --frozen-lockfile` on a
  restored cache is a fully deterministic, network-free install.
- **`--cpu` and `--os`** — resolve for another platform. Bun stores normalized `cpu` and `os` values in the lockfile, so
  the lockfile does not change across platforms even when the installed set does.

## Workspaces

`"workspaces"` in the root `package.json` takes full glob syntax including negative patterns
(`["packages/**", "!packages/**/test/**"]`). Reference a sibling with a semver range or `workspace:*`. On publish
`workspace:*` becomes the exact version, `workspace:^` and `workspace:~` become the ranged forms, and an explicit
`workspace:1.0.2` is used verbatim.

**Self-contained workspaces.** Electron packagers and serverless bundlers walk one workspace's `node_modules` and expect
every dependency physically under it, which hoisting breaks. Mark the workspace with
`"installConfig": { "hoistingLimits": "workspaces" }` in its own `package.json`, or list it under
`workspaces.selfContained` in the root. Bun then treats it as a hoisting barrier and materializes real copies rather
than hardlinks, so a tool that rewrites them cannot touch the cache. The setting is recorded in `bun.lock`. It does
nothing under the isolated linker, where every package already resolves only its own dependencies.

## Catalogs

Define versions once in the root `package.json` and reference them with `catalog:`.

```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": { "react": "^19.0.0" },
    "catalogs": { "testing": { "jest": "30.0.0" } }
  }
}
```

A workspace then writes `"react": "catalog:"` or `"jest": "catalog:testing"`. `catalog` and `catalogs` also work at the
top level of `package.json`. From 1.4.0, `bun add <pkg> --catalog` adds to the root catalog and writes `catalog:` in the
workspace, and a plain `bun add x` where the default catalog already lists `x` writes `catalog:` as well.

## `--filter` grammar

`--filter` (or `-F`) works with `bun run`, `install`, `add`, `remove`, `update`, `outdated`, `prune`, and `pm licenses`.
For package-manager subcommands the flag goes **after** the subcommand — `bun --filter <pattern> <word>` runs `<word>`
as a script.

- **Name glob** — matches the full `name` field. `core` does not match `@acme/core`, and `*` does not cross `/`.
- **Path glob** — starts with `./` and must match the workspace directory itself. `./packages` selects nothing;
  `./packages/*` selects every workspace directly inside.
- **Directory selector** — `'{packages}'` selects every workspace at or below `packages/`; `'{.}'` selects the current
  directory's workspace and everything below it.
- **Dependency relations** — `foo...` is `foo` plus what it depends on, `foo^...` is only its dependencies, `...foo` is
  `foo` plus its dependents, `...^foo` is only its dependents.
- **Exclusion** — `!` goes first: `--filter '!...foo'`.

Multiple flags combine as "everything a positive pattern matched, minus everything a `!` pattern matched". A pattern
matching nothing warns; for `add`, `remove`, `update`, `prune`, and `pm licenses`, selecting nothing is an error.

## Supply-chain controls

- **`[install] minimumReleaseAge = <seconds>`** — filters out npm versions published more recently than the threshold,
  for direct and transitive dependencies alike. It affects new resolution only; packages already in `bun.lock` stay.
  When the gate blocks versions, a stability check looks up to 7 days past the gate for rapid bugfix clusters and picks
  an older, settled version instead; an exact request such as `package@1.1.1` respects the gate but skips that check.
  Versions with no `time` field pass. `minimumReleaseAgeExcludes` exempts named packages.
- **`[install.security] scanner = "<package>"`** — runs a scanner before installation, cancels the install on a fatal
  finding, and disables auto-install while configured.
- **`bun audit`** lists advisories; **`bun audit fix`** (from 1.4.0) upgrades to a safe version and installs, reporting
  what a dependent's range blocks. `--latest` allows a major bump, `--dry-run` previews.
- **`bun pm diff <pkg>`** (from 1.4.0) diffs two versions of a package, leading with the changed files, any new install
  scripts, and any new imports of `child_process`, `fs`, `net`, or `vm`. Minified files are un-minified before the diff.
- **`bun pm licenses`** (from 1.4.0) groups dependencies by license; `--json` and `--prod` apply.

## Other commands

- **`bun dedupe`** (from 1.4.0) collapses semver-compatible duplicates in `bun.lock` and never edits `package.json`.
  `--check` fails CI when duplicates exist.
- **`bun prune`** (from 1.4.0) deletes packages no longer in `bun.lock`; `--production` also removes `devDependencies`.
  In a Dockerfile this is what separates build-time and ship-time dependencies without a second install.
- **`bun update`** (from 1.4.0) updates transitive dependencies too. `bun update <name>` updates that package wherever
  it appears and exits `1` when nothing depends on it; patterns work (`bun update '@types/*' --latest`).
- **`bun outdated`**, **`bun why <pkg>`**, **`bun info <pkg>`**, **`bun patch`**, **`bun link`**, **`bun publish`**.
- **`bunx <pkg>`** runs a package binary without installing. `bunx --bun` forces the Bun runtime for a package whose
  shebang names `node`.

## Overrides

`overrides` in `package.json` pins a transitive version. From 1.4.0 the nested forms all work — npm's object form,
yarn's `a/b`, and pnpm's `a>b` — and an override may be scoped to a range:

```json
{
  "overrides": {
    "express": { "qs": "6.13.0" },
    "lodash@<4.17.21": "4.17.21"
  }
}
```

## `bunfig.toml` install keys

Independent knobs under `[install]`:

- **`optional`, `dev`, `peer`** — whether to install each dependency class. All default `true`.
- **`production`** — devDependencies off and lockfile frozen. `bun add`, `remove`, and `update` fail while set.
- **`exact`** — write an exact version rather than a caret range. Default `false`.
- **`auto`** — auto-install mode: `"auto"` (install on the fly when no `node_modules` exists), `"force"`, `"disable"`,
  `"fallback"`.
- **`prefer`** — `"online"`, `"offline"`, or `"latest"` for registry staleness checks.
- **`frozenLockfile`**, **`offline`**, **`dryRun`**, **`ignoreScripts`**, **`saveTextLockfile`**.
- **`concurrentScripts`** — default is twice the CPU count.
- **`linker`**, **`globalStore`**, **`hoist`**, **`hoistPattern`**, **`publicHoistPattern`**.
- **`registry`** — a string, or `{ url, token }`, or `{ url, username, password }`.
- **`linkWorkspacePackages`** — default `true`.
- **`globalDir`** (`BUN_INSTALL_GLOBAL_DIR`), **`globalBinDir`** (`BUN_INSTALL_BIN`).
- **`ca`** / **`cafile`**, and **`[install.cache]`** with `dir`, `disable`, `disableManifest`.
- **`[install.scopes]`** — per-scope registry and credentials; `$VAR` references an environment variable.
- **`[install.lockfile]`** — `save`, and `print = "yarn"` to emit a Yarn lockfile beside `bun.lock`.

From 1.4.0 a project's `bunfig.toml` outranks `.npmrc` for the same key.
