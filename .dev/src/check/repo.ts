import fs from "node:fs/promises";
import path from "node:path";

export const MARKETPLACE_FILE = ".claude-plugin/marketplace.json";

export type JsonObject = Readonly<Record<string, unknown>>;

export interface MarketplaceEntry {
  name: string;
  /** The source when it is a relative path string; null for an object source. */
  source: string | null;
  keys: readonly string[];
}

export interface Marketplace {
  entries: readonly MarketplaceEntry[];
  renames: ReadonlyMap<string, string | null>;
}

export interface Dependency {
  name: string;
  /** The marketplace the dependency names, or null for a bare name. */
  marketplace: string | null;
}

export interface Manifest {
  name: string | null;
  version: string | null;
  dependencies: readonly Dependency[];
  raw: JsonObject;
}

export interface Plugin {
  /** The directory name under `plugins/`. */
  dir: string;
  /** The plugin directory relative to the repository root, `plugins/<dir>`. */
  path: string;
  manifest: Manifest;
  skills: readonly string[];
  agents: readonly string[];
  commands: readonly string[];
}

export interface Repo {
  root: string;
  marketplace: Marketplace;
  plugins: readonly Plugin[];
}

/** Reads the marketplace and every plugin under `plugins/`; throws when a manifest is missing or malformed. */
export async function loadRepo(root: string): Promise<Repo> {
  const marketplace = parseMarketplace(await readJsonObject(root, MARKETPLACE_FILE));
  const dirs = await listDirs(path.join(root, "plugins"));
  const plugins = await Promise.all(dirs.map((dir) => loadPlugin(root, dir)));
  return { root, marketplace, plugins };
}

/** Reads a JSON file relative to `root` and returns its top-level object. */
export async function readJsonObject(root: string, rel: string): Promise<JsonObject> {
  let data: unknown;
  try {
    data = JSON.parse(await fs.readFile(path.join(root, rel), "utf-8"));
  } catch (err) {
    throw new Error(`${rel}: cannot read JSON`, { cause: err });
  }
  if (!isObject(data)) {
    throw new Error(`${rel}: the top level is not an object`);
  }
  return data;
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMarketplace(json: JsonObject): Marketplace {
  const plugins = Array.isArray(json.plugins) ? json.plugins : [];
  const entries = plugins.filter(isObject).map((entry) => ({
    name: typeof entry.name === "string" ? entry.name : "",
    source: typeof entry.source === "string" ? entry.source : null,
    keys: Object.keys(entry),
  }));
  const renames = new Map<string, string | null>();
  if (isObject(json.renames)) {
    for (const [from, to] of Object.entries(json.renames)) {
      renames.set(from, typeof to === "string" ? to : null);
    }
  }
  return { entries, renames };
}

async function loadPlugin(root: string, dir: string): Promise<Plugin> {
  const pluginPath = `plugins/${dir}`;
  const raw = await readJsonObject(root, `${pluginPath}/.claude-plugin/plugin.json`);
  const abs = path.join(root, pluginPath);
  const [skills, agents, commands] = await Promise.all([
    listSkills(path.join(abs, "skills")),
    listMarkdownNames(path.join(abs, "agents")),
    listMarkdownNames(path.join(abs, "commands")),
  ]);
  return { dir, path: pluginPath, manifest: parseManifest(raw), skills, agents, commands };
}

function parseManifest(raw: JsonObject): Manifest {
  const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies.flatMap(parseDependency) : [];
  return {
    name: typeof raw.name === "string" ? raw.name : null,
    version: typeof raw.version === "string" ? raw.version : null,
    dependencies,
    raw,
  };
}

function parseDependency(value: unknown): Dependency[] {
  if (typeof value === "string") {
    const at = value.indexOf("@");
    return [at === -1 ? { name: value, marketplace: null } : { name: value.slice(0, at), marketplace: value.slice(at + 1) }];
  }
  if (isObject(value) && typeof value.name === "string") {
    return [{ name: value.name, marketplace: typeof value.marketplace === "string" ? value.marketplace : null }];
  }
  return [];
}

async function listDirs(dir: string): Promise<string[]> {
  const entries = await readDirOrEmpty(dir);
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .toSorted();
}

async function listSkills(dir: string): Promise<string[]> {
  const names = await listDirs(dir);
  const present = await Promise.all(names.map((name) => exists(path.join(dir, name, "SKILL.md"))));
  return names.filter((_, i) => present[i]);
}

async function listMarkdownNames(dir: string): Promise<string[]> {
  const entries = await readDirOrEmpty(dir);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name.slice(0, -".md".length))
    .toSorted();
}

async function readDirOrEmpty(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (isErrnoCode(err, "ENOENT")) return [];
    throw err;
  }
}

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export function isErrnoCode(err: unknown, code: string): boolean {
  return err instanceof Error && "code" in err && err.code === code;
}
