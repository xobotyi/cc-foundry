import fs from "node:fs/promises";
import path from "node:path";
import type { Finding } from "../finding.ts";
import type { Plugin, Repo } from "../repo.ts";
import { lineAt } from "../text.ts";

/** `Skill(plugin:name)`, or a code span holding exactly `plugin:name` or `/plugin:name`. */
const EXPLICIT_REF = /Skill\(([a-z0-9-]+):([a-z0-9-]+)\)|`\/?([a-z0-9-]+):([a-z0-9-]+)`/g;
const PREREQUISITE = /<prerequisite>([\s\S]*?)<\/prerequisite>/g;
const CODE_SPAN = /`([a-z0-9-]+)`/g;

/** Where skill references are looked for, besides every plugin directory. */
const DOC_ROOTS = ["CLAUDE.md", "README.md", ".claude", "design-docs"];
/** Directories never scanned: fetched sources, dependencies, and checkouts of other branches. */
const SKIPPED_DIRS = new Set([".dev", "node_modules", ".git", "worktrees"]);
/** Plugin directories whose markdown an agent loads, where a `<prerequisite>` block steers it. */
const COMPONENT_DIRS = ["skills", "agents", "commands", "output-styles"];

/** An explicit `plugin:name` reference to a plugin of this marketplace names one of its skills, agents, or commands. */
export async function skillReferences(repo: Repo): Promise<Finding[]> {
  const plugins = new Map(repo.plugins.map((p) => [p.dir, p]));
  const files = (await Promise.all([...DOC_ROOTS, "plugins"].map((rel) => listMarkdown(repo.root, rel)))).flat();
  const findings = await Promise.all(
    files.map(async (file): Promise<Finding[]> => {
      const text = await fs.readFile(path.join(repo.root, file), "utf-8");
      return explicitRefs(text).flatMap(({ plugin, name, index }): Finding[] => {
        const target = plugins.get(plugin);
        if (target === undefined || components(target).has(name)) return [];
        return [
          {
            rule: "skill-ref",
            severity: "error",
            file,
            line: lineAt(text, index),
            message: `\`${plugin}:${name}\` names no skill, agent, or command in plugins/${plugin}`,
          },
        ];
      });
    }),
  );
  return findings.flat();
}

/** A `<prerequisite>` block that names another plugin's skill needs that plugin in `dependencies` (ADR 1.3). */
export async function prerequisiteDependencies(repo: Repo): Promise<Finding[]> {
  const owners = new Map<string, string[]>();
  for (const plugin of repo.plugins) {
    for (const skill of plugin.skills) owners.set(skill, [...(owners.get(skill) ?? []), plugin.dir]);
  }
  const plugins = new Set(repo.plugins.map((p) => p.dir));
  const findings: Finding[] = [];
  for (const plugin of repo.plugins) {
    const declared = new Set(
      plugin.manifest.dependencies
        .filter((d) => d.marketplace === null || d.marketplace === repo.marketplace.name)
        .map((d) => d.name),
    );
    const dirs = COMPONENT_DIRS.map((d) => listMarkdown(repo.root, `${plugin.path}/${d}`));
    for (const file of (await Promise.all(dirs)).flat()) {
      const text = await fs.readFile(path.join(repo.root, file), "utf-8");
      for (const block of text.matchAll(PREREQUISITE)) {
        const line = lineAt(text, block.index);
        const at = { rule: "prerequisite-dependency", severity: "error" as const, file, line };
        for (const target of prerequisiteTargets(block[1] ?? "", owners, plugins)) {
          const [owner, ...others] = target.owners;
          if (owner === undefined || target.owners.includes(plugin.dir)) continue;
          if (others.length > 0) {
            const message = `\`${target.skill}\` is a skill in ${target.owners.join(", ")}; name it as plugin:skill`;
            findings.push({ ...at, message });
          } else if (!declared.has(owner)) {
            const message = `the prerequisite \`${target.skill}\` ships in "${owner}", missing from dependencies`;
            findings.push({ ...at, message });
          }
        }
      }
    }
  }
  return findings;
}

/** The skills a prerequisite block names, each with the plugins that ship a skill of that name. */
function prerequisiteTargets(
  body: string,
  owners: ReadonlyMap<string, readonly string[]>,
  plugins: ReadonlySet<string>,
): { skill: string; owners: readonly string[] }[] {
  const explicit = explicitRefs(body)
    .filter((ref) => plugins.has(ref.plugin))
    .map((ref) => ({ skill: `${ref.plugin}:${ref.name}`, owners: [ref.plugin] }));
  const bare = [...body.matchAll(CODE_SPAN)].flatMap((span) => {
    const skill = span[1] ?? "";
    const found = owners.get(skill);
    return found === undefined ? [] : [{ skill, owners: found }];
  });
  return [...explicit, ...bare];
}

/** A dependency names a plugin of this marketplace: a plugin never requires one from outside it. */
export async function dependencyScope(repo: Repo): Promise<Finding[]> {
  const plugins = new Set(repo.plugins.map((p) => p.dir));
  return repo.plugins.flatMap((plugin) =>
    plugin.manifest.dependencies.flatMap((dep): Finding[] => {
      const file = `${plugin.path}/.claude-plugin/plugin.json`;
      if (dep.marketplace !== null && dep.marketplace !== repo.marketplace.name) {
        const message = `dependency "${dep.name}@${dep.marketplace}" comes from another marketplace`;
        return [{ rule: "dependency-scope", severity: "error", file, message }];
      }
      if (!plugins.has(dep.name)) {
        const message = `dependency "${dep.name}" is no plugin of this marketplace`;
        return [{ rule: "dependency-scope", severity: "error", file, message }];
      }
      return [];
    }),
  );
}

function explicitRefs(text: string): { plugin: string; name: string; index: number }[] {
  return [...text.matchAll(EXPLICIT_REF)].map((m) => ({
    plugin: m[1] ?? m[3] ?? "",
    name: m[2] ?? m[4] ?? "",
    index: m.index,
  }));
}

function components(plugin: Plugin): Set<string> {
  return new Set([...plugin.skills, ...plugin.agents, ...plugin.commands]);
}

/** Markdown files under `rel` (or `rel` itself), as paths relative to `root`. */
async function listMarkdown(root: string, rel: string): Promise<string[]> {
  let stat;
  try {
    stat = await fs.stat(path.join(root, rel));
  } catch {
    // a root that does not exist in this repository holds no references
    return [];
  }
  if (stat.isFile()) return rel.endsWith(".md") ? [rel] : [];
  const entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry): Promise<string[]> => {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? Promise.resolve([]) : listMarkdown(root, child);
      return Promise.resolve(entry.isFile() && entry.name.endsWith(".md") ? [child] : []);
    }),
  );
  return nested.flat();
}
