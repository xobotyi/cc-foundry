# TypeScript 7.0

Released 8 July 2026 as `typescript@7.0.2`. The compiler is a port to Go: the same checker logic, run natively with
shared-memory multithreading. Type-checking behavior is meant to match 6.0 exactly, so what changes for a project is the
option set, the toolchain integration, and two checker details.

## Compatibility contract

Code that compiles cleanly under 6.0 with `stableTypeOrdering` on and no `ignoreDeprecations` set compiles identically
under 7.0. 7.0 adopts every 6.0 default and turns every 6.0 deprecation into a hard error.

- **`target: es5`, `downlevelIteration`, `moduleResolution: node`/`node10`/`classic`, `module: amd`/`umd`/`systemjs`/
  `none`, `baseUrl`, `outFile`** — removed. A removed whole option reports `TS5102`; a removed option value reports
  `TS5108`.
- **`esModuleInterop: false`, `allowSyntheticDefaultImports: false`, `alwaysStrict: false`** — rejected under `TS5108`.
- **The `module` keyword in a namespace declaration, and `asserts` on an import** — errors.
- **`/// <reference no-default-lib />` is not respected under `skipDefaultLibCheck`.**
- **A file argument with a `tsconfig.json` in the directory** needs `--ignoreConfig`.
- **`stableTypeOrdering` is the behavior**, not an option to weigh. Type and symbol ordering is derived from object
  content, so declaration emit and error output are deterministic across runs and across checker counts.

## Checker changes

- **Template-literal inference consumes a whole Unicode code point**, where 6.0 advanced one UTF-16 code unit and split
  a supplementary-plane character into its surrogate halves. This breaks a type-level string utility that deliberately
  modeled UTF-16 code units — a `Length<S>` counting surrogate halves counts differently.

  ```ts
  type HeadTail<S> = S extends `${infer Head}${infer Tail}` ? [Head, Tail] : never;

  type Result = HeadTail<"😀abc">;
  //   7.0: ["😀", "abc"]
  //   6.0: ["\ud83d", "\ude00abc"]
  ```

- **A conflicting declaration errors at every contributing site.** 6.0 sometimes reported only one side, so a project
  whose errors were fully absorbed by `--skipLibCheck` can see declaration-conflict errors appear in its own `.ts`
  files.
- **Node positions are UTF-8 offsets** from the start of the file, not UTF-16. Any tool that maps compiler positions
  onto source text has to agree on the encoding.

## Toolchain

- **7.0 ships no programmatic API.** The compiler is a binary and a language server, and the `typescript` package
  exports nothing a tool can call. This is the constraint that decides whether a project can adopt 7.0 at all.
- **`@typescript/typescript6` re-exports the 6.0 API** and ships a `tsc6` executable, so both can be installed at once:

  ```json
  {
    "devDependencies": {
      "@typescript/native": "npm:typescript@^7.0.2",
      "typescript": "npm:@typescript/typescript6@^6.0.2"
    }
  }
  ```

  The alias is needed because tools resolve `typescript` through a peer dependency and cannot be pointed elsewhere.

- **`--checkers N`** sets the number of type-checking workers, default 4. More workers trade memory for speed; `1` makes
  checking single-threaded and removes the duplicated work the workers share. Varying it can surface order-dependent
  results, so pin it across CI and local runs.
- **`--builders N`** sets how many project-reference projects build at once under `--build`. It multiplies with
  `--checkers`: `--checkers 4 --builders 4` permits 16 concurrent checkers. Varying it does not change results.
- **`--singleThreaded`** forces one thread through parsing, checking, and emit.
- **`--watch` runs on a Go port of the Parcel file watcher**, replacing the polling fallbacks.
- **Nightly builds publish as `typescript@next`.**

## Traps

- **Type-aware linting needs the 6.0 API.** typescript-eslint 8.69.0 declares a peer range of `>=4.8.4 <6.1.0`, which
  excludes 7.0; forcing the install crashes inside `@typescript-eslint/typescript-estree`. Install the
  `@typescript/typescript6` alias beside `typescript@7` and let the linter resolve the 6.0 package.
- **A framework that embeds the compiler cannot use 7.0 for editor tooling.** Vue, Svelte, Astro, and MDX go through
  Volar, and Angular template checking goes through its own compiler; each needs the programmatic API. Running `tsc`
  from 7.0 for CLI checking while the editor stays on 6.0 is the documented split.
- **The JavaScript analysis in `.js` files was rewritten.** Constructor functions built from expando assignments,
  `@class`, `@enum`, Closure function-type syntax, postfix `!`, a standalone `?` type, and values used in type positions
  all stop working. A JSDoc-typed JavaScript codebase needs the `CHANGES.md` list in `microsoft/typescript-go` — the
  archived staging repository of the port, still readable — rather than a version bump.
