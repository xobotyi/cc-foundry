# Supply Chain and Publishing

The registry and the install step. Node's own hardening flags and its Permission Model are separate subjects.

## Installing

- **`npm ci` in CI and in an image build, never `npm install`.** It requires an existing `package-lock.json`, removes an
  existing `node_modules` before starting, exits with an error when the lockfile and `package.json` disagree instead of
  rewriting the lockfile, and never writes to either file. It cannot install a single package, which is the point.
- **Pass `npm ci` the same tree-shaping flags the lockfile was generated with** — `--legacy-peer-deps`,
  `--install-links`. A lockfile built under one and installed without it errors. Commit them to a project-level `.npmrc`
  rather than repeating them per command.
- **`ignore-scripts` defaults to `false`.** Every `preinstall`, `install`, and `postinstall` script in the whole tree
  runs with the developer's or the runner's privileges. Set `ignore-scripts=true` in `.npmrc` and re-enable it for the
  specific packages that genuinely need to build. Node's own supply-chain exposure is almost entirely this hook.
- **`min-release-age=<days>`** (npm 11.10.0) builds the tree from versions that were available more than that many days
  ago. This is the defense against a compromised maintainer account, where the malicious version is minutes old. The
  unit is days, not minutes: npm desugars the value to `before = Date.now() - 86400000 * n`, so it is the relative form
  of `--before`. **When no version of a dependency clears the window, the command errors** rather than falling back.
- **`min-release-age-exclude` needs npm 12.0.0** — package names or minimatch globs exempted from the window, usually
  the organization's own packages. No Node line bundles npm 12 (26.2.0 ships npm 11.13.0), so it requires an explicit
  npm upgrade. The same release adds the warning npm prints when the window blocks an `npm audit fix`; on npm 11 there
  is no such warning, and a blocked fix is silent.
- **`npm audit signatures`** verifies registry signatures and provenance attestations for the installed tree, which is a
  different check from `npm audit` — the latter reports known vulnerabilities, the former reports whether the artifact
  is the one the registry says it is.
- **`engine-strict=true`** makes npm enforce `engines.node` rather than warn. Without it the field is documentation.

## Publishing

- **Publish from CI with trusted publishing (OIDC), not a token.** npm supports GitHub Actions on GitHub-hosted runners,
  GitLab CI/CD on GitLab.com shared runners, and CircleCI cloud. **Self-hosted runners are not supported.** It requires
  npm CLI 11.5.1 or later and Node 22.14.0 or later.
- **Provenance attestations are generated automatically** on GitHub Actions and GitLab, with no `--provenance` flag,
  when all three hold: publishing over OIDC, from a public repository, of a public package. CircleCI does not generate
  them, and a private repository does not either even when the package is public.
- **npm classic tokens were permanently revoked on 2025-12-09** and cannot be recovered or recreated. `npm login` issues
  a session token rather than a long-lived one, so local development needs periodic re-authentication. 2FA enforcement
  is the default for packages created from 2025-12-09; existing packages kept their prior setting.
- **A granular token with `Bypass 2FA` set defeats account-level and package-level 2FA for publishing.** The option is
  false at creation and takes precedence over both when true. From August 2026 such a token cannot perform
  account-identity or account-governance actions — changing an email, a password, or a 2FA configuration always requires
  an interactive challenge — but it can still publish, which is the hole trusted publishing closes.
- **A read-only token is still needed for installing private dependencies.** Trusted publishing removes the publish
  token, not every token.

## Package manager selection

Corepack stopped shipping with Node from version 25, so `"packageManager"` in `package.json` is inert unless `corepack`
is installed from the registry. A container image that relied on the bundled binary has to install it explicitly or pin
the package manager another way.

Node 22 ships npm 10; Node 24 and 26 ship npm 11. `min-release-age` and trusted publishing therefore need an npm upgrade
on a Node 22 image, and a CI job that assumes the bundled npm has neither.

## What a lockfile does and does not give

- A lockfile pins resolved versions and integrity hashes, so a republished version with different content fails the
  integrity check.
- It does not stop a **new** version being installed when a range is re-resolved, which is what `npm install` does and
  `npm ci` does not.
- It does not stop lifecycle scripts. `ignore-scripts` does.
