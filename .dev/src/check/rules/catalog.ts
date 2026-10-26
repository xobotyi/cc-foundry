import fs from "node:fs/promises";
import path from "node:path";
import type { Finding } from "../finding.ts";
import { git } from "../git.ts";
import { isObject, MARKETPLACE_FILE } from "../repo.ts";
import type { Repo } from "../repo.ts";
import { lineOf } from "../text.ts";

/** Keys a marketplace entry may carry: the catalog fields, and the entry-only keys `plugin.json` cannot hold. */
const ENTRY_KEYS: ReadonlySet<string> = new Set([
  "name",
  "source",
  "category",
  "tags",
  "strict",
  "relevance",
  "headers",
  "headersHelper",
]);

/** Each `plugins/*` directory has exactly one entry, and directory, entry, source, and manifest agree on the name. */
export async function catalogEntries(repo: Repo): Promise<Finding[]> {
  const text = await readMarketplace(repo.root);
  const findings: Finding[] = [];
  const at = (name: string) => lineOf(text, `"name": "${name}"`);
  for (const plugin of repo.plugins) {
    const entries = repo.marketplace.entries.filter((e) => e.name === plugin.dir);
    if (entries.length === 0) {
      findings.push(catalogError(`plugins/${plugin.dir}/ has no entry in the marketplace`));
    } else if (entries.length > 1) {
      findings.push(catalogError(`"${plugin.dir}" has ${entries.length} entries in the marketplace`, at(plugin.dir)));
    }
    if (plugin.manifest.name !== plugin.dir) {
      findings.push({
        rule: "catalog-entry",
        severity: "error",
        file: `${plugin.path}/.claude-plugin/plugin.json`,
        message: `the manifest name "${plugin.manifest.name}" differs from the directory name "${plugin.dir}"`,
      });
    }
  }
  const dirs = new Set(repo.plugins.map((p) => p.dir));
  for (const entry of repo.marketplace.entries) {
    if (!dirs.has(entry.name)) {
      findings.push(catalogError(`entry "${entry.name}" has no directory under plugins/`, at(entry.name)));
    } else if (entry.source !== `./plugins/${entry.name}`) {
      const message = `entry "${entry.name}" has source ${JSON.stringify(entry.source)}, not "./plugins/${entry.name}"`;
      findings.push(catalogError(message, at(entry.name)));
    }
  }
  return findings;
}

/** An entry carries only the catalog fields; a field `plugin.json` can hold lives there (ADR 1.12). */
export async function entryKeys(repo: Repo): Promise<Finding[]> {
  const text = await readMarketplace(repo.root);
  return repo.marketplace.entries.flatMap((entry) =>
    entry.keys
      .filter((key) => !ENTRY_KEYS.has(key))
      .map((key) => ({
        rule: "entry-keys",
        severity: "error" as const,
        file: MARKETPLACE_FILE,
        line: lineOf(text, `"name": "${entry.name}"`),
        message: `entry "${entry.name}" carries "${key}", which belongs in its plugin.json`,
      })),
  );
}

/** Every plugin name the marketplace ever listed is still listed, or is a `renames` key. */
export async function renamesCoverHistory(repo: Repo): Promise<Finding[]> {
  const shas = (await git(repo.root, ["log", "--format=%H", "--", MARKETPLACE_FILE])).split("\n").filter(Boolean);
  const historic = new Set<string>();
  for (const sha of shas) {
    for (const name of await namesAt(repo.root, sha)) historic.add(name);
  }
  const current = new Set(repo.marketplace.entries.map((e) => e.name));
  return [...historic]
    .filter((name) => !current.has(name) && !repo.marketplace.renames.has(name))
    .toSorted()
    .map((name) => ({
      rule: "renames-history",
      severity: "error",
      file: MARKETPLACE_FILE,
      message: `"${name}" left the marketplace with no renames key; map it to its new name, or to null`,
    }));
}

async function namesAt(root: string, sha: string): Promise<string[]> {
  let data: unknown;
  try {
    data = JSON.parse(await git(root, ["show", `${sha}:${MARKETPLACE_FILE}`]));
  } catch {
    // a commit that deleted the file or held malformed JSON lists no names
    return [];
  }
  if (!isObject(data) || !Array.isArray(data.plugins)) return [];
  return data.plugins.filter(isObject).flatMap((p) => (typeof p.name === "string" ? [p.name] : []));
}

function readMarketplace(root: string): Promise<string> {
  return fs.readFile(path.join(root, MARKETPLACE_FILE), "utf-8");
}

function catalogError(message: string, line?: number): Finding {
  return { rule: "catalog-entry", severity: "error", file: MARKETPLACE_FILE, line, message };
}
