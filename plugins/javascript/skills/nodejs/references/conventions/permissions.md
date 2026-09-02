# Permission Model

`--permission` restricts what a Node process may do with the resources it can reach. Added in 20.0.0 as
`--experimental-permission`, marked Stable in 22.13.0 and 23.5.0, renamed to `--permission` in 24.0.0.

**It is a seat belt, not a sandbox.** Node's own documentation says the model does not protect against malicious code:
Node trusts any code it is asked to run, and malicious code can escape. It exists to stop trusted code from touching
what it was not meant to touch. Do not present it to a security reviewer as containment for untrusted input.

## Scopes and flags

- **`--allow-fs-read=<path>`, `--allow-fs-write=<path>`** — repeatable, `*` for everything. The values are absolute
  paths, paths relative to the working directory, or wildcards.
- **`--allow-child-process`** — `node:child_process`.
- **`--allow-worker`** — `node:worker_threads`. Also required by `module.register()`, whose hooks run on a worker.
- **`--allow-addons`** (21.6.0) — native addons.
- **`--allow-net`** (25.0.0, Active development) — outbound network. **Absent on the 22 and 24 lines**, where
  `--permission` leaves the network entirely open. Passing it without `--permission` exits with `ERR_MISSING_OPTION`,
  and using it emits an `ExperimentalWarning`.
- **`--allow-wasi`** (22.3.0) — WASI.
- **`--allow-ffi`** (26.1.0) — `node:ffi`, which also needs `--experimental-ffi`.
- **`--allow-openssl-store`** (26.7.0) — OpenSSL STORE loaders. A granted loader may reach files, devices, tokens, or
  the network, and none of that traffic is constrained by the `fs` or `net` scopes.

The inspector is restricted with no opt-in flag: under `--permission` the `SIGUSR1` listener is not installed.

## Path-matching rules that surprise

- **A directory that exists gets an implicit trailing wildcard.** `--allow-fs-read=/srv/data` becomes `/srv/data/*` when
  `/srv/data` exists at startup. When it does not exist, the grant covers exactly that one path — so a directory created
  later is not covered. Write `/srv/data/*` when the directory may not exist yet.
- **Everything after a `*` is discarded.** `--allow-fs-read=/home/*.js` behaves as `/home/*`. There is no extension
  filtering.
- **Entry points are granted read implicitly** — the main module and anything loaded through `-r`.
- **Symbolic links are followed out of the granted set.** A relative symlink inside a granted directory reaches
  arbitrary paths. Verify that no granted path contains one.

## What the model does not cover

- **An already-open file descriptor.** `node:fs` operations on a descriptor obtained before a grant was dropped, or
  passed in from the parent process, are not checked.
- **`node:sqlite`.** It reaches the file system outside the `fs` scope.
- **Flags that read files before the model initializes** — `--env-file`, `--openssl-config`, and V8 flags set through
  `v8.setFlagsFromString`.
- **Worker threads.** The model does not inherit into a worker.
- **`process._debugProcess(pid)`.** It is gated by no scope. A process under `--permission` with zero grants can signal
  any other Node process owned by the same OS user into opening its V8 inspector. The fix is OS-level: separate users,
  or seccomp/AppArmor.
- **Run-time loadable extensions** cannot load at all under the model, which affects `node:sqlite`.
- **OpenSSL engines** cannot be requested at run time, which affects `crypto`, `https`, and `tls`.

## Runtime API

`process.permission` exists only when `--permission` or `--permission-audit` is passed.

- **`process.permission.has(scope[, reference])`** — `has('fs.write')` asks about the whole scope,
  `has('fs.write', '/srv/data/x')` about one resource.
- **`process.permission.drop(scope[, reference])`** (26.3.0, Active development) — irreversible. It affects future
  checks only: descriptors, sockets, child processes, and workers already open stay usable, so close them yourself. The
  reference must match the original grant — a grant of `/my/folder` cannot be dropped file by file, and a `*` grant can
  only be dropped whole.

The pattern this enables: read configuration and open listening sockets at startup, then drop `fs.read` before handling
the first request.

## Audit mode

`--permission-audit` (24.20.0 and 25.8.0) runs every check, denies nothing, and publishes each violation to a
diagnostics channel: `node:permission-model:` plus `fs`, `net`, `child`, `worker`, `inspector`, `wasi`, `addon`, or
`ffi`. Each message carries `permission` and `resource`.

Use it to derive the grant list from a real workload before turning on enforcement. `--permission` takes precedence when
both flags are passed, so a deployment cannot accidentally audit when it meant to enforce.

## Configuration file

With `--experimental-config-file` (22.16.0 and 23.10.0; Release candidate from 26.7.0), permissions live under a
`permission` key in `node.config.json`. Presence of that key turns on `--permission` implicitly.

```json
{
	"permission": {
		"allow-fs-read": ["./config"],
		"allow-fs-write": ["./var"],
		"allow-net": true,
		"allow-child-process": false
	}
}
```

## Running under `npx`

`npx` needs read access to resolve and execute the package, so `--permission` alone fails with a `FileSystemRead`
denial. Pass the flags through and grant the resolver's directory:

```bash
npx --node-options="--permission --allow-fs-read=$(npm prefix -g)" package-name
npx --node-options="--permission --allow-fs-read=$(npm config get cache)" package-name
```
