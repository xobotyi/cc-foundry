import fs from "node:fs/promises";
import path from "node:path";
import type { Finding } from "../finding.ts";
import { isErrnoCode, isObject } from "../repo.ts";
import type { JsonObject, Plugin, Repo } from "../repo.ts";
import { lineOf } from "../text.ts";

/** The GitHub repository users add the marketplace from, as the root CLAUDE.md install commands name it. */
const MARKETPLACE_SOURCE = "xobotyi/cc-foundry";

/** Each component key and the location Claude Code reads it from when the manifest names none. */
const DEFAULT_LOCATIONS: readonly { key: readonly string[]; location: string }[] = [
  { key: ["skills"], location: "skills" },
  { key: ["commands"], location: "commands" },
  { key: ["agents"], location: "agents" },
  { key: ["hooks"], location: "hooks/hooks.json" },
  { key: ["mcpServers"], location: ".mcp.json" },
  { key: ["lspServers"], location: ".lsp.json" },
  { key: ["outputStyles"], location: "output-styles" },
  { key: ["workflows"], location: "workflows" },
  { key: ["experimental", "themes"], location: "themes" },
  { key: ["experimental", "monitors"], location: "monitors/monitors.json" },
];

const PATH_PLACEHOLDER = /\$\{CLAUDE_PLUGIN_(ROOT|DATA)\}/;

/** Each plugin carries a byte-identical copy of the root LICENSE. */
export async function licenseCopy(repo: Repo): Promise<Finding[]> {
  const root = await fs.readFile(path.join(repo.root, "LICENSE"));
  const findings = await Promise.all(
    repo.plugins.map(async (plugin): Promise<Finding[]> => {
      const file = `${plugin.path}/LICENSE`;
      const copy = await readOrNull(path.join(repo.root, file));
      if (copy === null) return [pluginError("license", file, "the plugin has no LICENSE; copy the root LICENSE")];
      if (!copy.equals(root)) return [pluginError("license", file, "LICENSE differs from the root LICENSE")];
      return [];
    }),
  );
  return findings.flat();
}

/** Each README gives the one-step install command and the two-step form for Claude Code before 2.1.275. */
export async function readmeInstall(repo: Repo): Promise<Finding[]> {
  const findings = await Promise.all(
    repo.plugins.map(async (plugin): Promise<Finding[]> => {
      const file = `${plugin.path}/README.md`;
      const readme = await readOrNull(path.join(repo.root, file));
      if (readme === null) return [pluginError("readme-install", file, "the plugin has no README.md")];
      const lines = new Set(readme.toString("utf-8").split("\n").map((l) => l.trim()));
      const required = [
        `/plugin install ${plugin.dir} --marketplace ${MARKETPLACE_SOURCE}`,
        `/plugin marketplace add ${MARKETPLACE_SOURCE}`,
        `/plugin install ${plugin.dir}@${repo.marketplace.name}`,
      ];
      return required
        .filter((line) => !lines.has(line))
        .map((line) => pluginError("readme-install", file, `the README has no line \`${line}\``));
    }),
  );
  return findings.flat();
}

/** No manifest key points at the location Claude Code reads by default. */
export async function defaultLocations(repo: Repo): Promise<Finding[]> {
  const findings = await Promise.all(
    repo.plugins.map(async (plugin) => {
      const file = `${plugin.path}/.claude-plugin/plugin.json`;
      const text = await fs.readFile(path.join(repo.root, file), "utf-8");
      return DEFAULT_LOCATIONS.flatMap(({ key, location }): Finding[] => {
        const value = valueAt(plugin.manifest.raw, key);
        const paths = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
        if (paths.length === 0 || !paths.every((p) => typeof p === "string" && normalize(p) === location)) return [];
        const name = key.join(".");
        return [
          {
            ...pluginError("default-paths", file, `"${name}" names its default location ./${location}`),
            line: lineOf(text, `"${key.at(-1)}"`),
          },
        ];
      });
    }),
  );
  return findings.flat();
}

/** A hook command that names a plugin path placeholder runs in exec form: `command` plus `args`, with no shell. */
export async function hookExecForm(repo: Repo): Promise<Finding[]> {
  const findings = await Promise.all(repo.plugins.map((plugin) => hookExecFormIn(repo.root, plugin)));
  return findings.flat();
}

async function hookExecFormIn(root: string, plugin: Plugin): Promise<Finding[]> {
  const file = `${plugin.path}/hooks/hooks.json`;
  const text = await readOrNull(path.join(root, file));
  if (text === null) return [];
  const source = text.toString("utf-8");
  let config: unknown;
  try {
    config = JSON.parse(source);
  } catch {
    // claude plugin validate reports a hooks file that is not JSON
    return [];
  }
  if (!isObject(config) || !isObject(config.hooks)) return [];
  return Object.values(config.hooks)
    .flatMap((groups) => (Array.isArray(groups) ? groups.filter(isObject) : []))
    .flatMap((group) => (Array.isArray(group.hooks) ? group.hooks.filter(isObject) : []))
    .flatMap((handler): Finding[] => {
      if (handler.type !== "command" || typeof handler.command !== "string") return [];
      if (handler.args !== undefined || !PATH_PLACEHOLDER.test(handler.command)) return [];
      const message = `\`${handler.command}\` runs through a shell; split it into command and args`;
      const line = lineOf(source, JSON.stringify(handler.command));
      return [{ ...pluginError("hook-exec-form", file, message), line }];
    });
}

function valueAt(object: JsonObject, key: readonly string[]): unknown {
  let value: unknown = object;
  for (const part of key) {
    if (!isObject(value)) return undefined;
    value = value[part];
  }
  return value;
}

function normalize(location: string): string {
  return location.replace(/^\.\//, "").replace(/\/+$/, "");
}

async function readOrNull(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file);
  } catch (err) {
    if (isErrnoCode(err, "ENOENT")) return null;
    throw err;
  }
}

function pluginError(rule: string, file: string, message: string): Finding {
  return { rule, severity: "error", file, message };
}
