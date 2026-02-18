import { defineCommand } from "citty";
import { consola } from "consola";
import fs from "fs-extra";
import path from "node:path";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";

interface ReferenceInventory {
  sources: Record<string, string>;
  lastFetched?: string;
}

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function parseInventory(filePath: string): Promise<ReferenceInventory> {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`Inventory not found: ${filePath}`);
  }

  const data = await fs.readJson(filePath);

  if (typeof data?.sources !== "object" || Array.isArray(data.sources)) {
    throw new Error(`Invalid inventory: 'sources' must be an object`);
  }

  return data as ReferenceInventory;
}

/**
 * Fetch content from URL, following redirects
 */
async function fetchContent(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: BROWSER_HEADERS,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

/**
 * Convert label to safe filename
 */
function toFilename(label: string, ext: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ext
  );
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/**
 * Minify HTML by removing extra whitespace
 */
function minifyHtml(html: string): string {
  return html
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

interface ProcessedContent {
  content: string;
  format: "markdown" | "html";
  title?: string;
}

/**
 * Process HTML with graceful degradation:
 * 1. Try Readability → if fails, return original HTML
 * 2. Try Turndown → if fails, return Readability HTML (minified)
 * 3. If all succeed → return Markdown
 */
function processHtml(html: string): ProcessedContent {
  // Step 1: Try Readability
  let article: ReturnType<Readability<string>["parse"]>;
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    article = reader.parse();
  } catch {
    consola.warn(`    Readability failed, using original HTML`);
    return { content: minifyHtml(html), format: "html" };
  }

  if (!article || !article.content) {
    consola.warn(`    Readability returned no content, using original HTML`);
    return { content: minifyHtml(html), format: "html" };
  }

  const title = article.title ?? undefined;

  // Step 2: Try Turndown
  let markdown: string;
  try {
    markdown = turndown.turndown(article.content);
  } catch {
    consola.warn(`    Turndown failed, using Readability HTML`);
    return {
      content: minifyHtml(article.content),
      format: "html",
      title,
    };
  }

  // Step 3: Success - return Markdown with title
  if (title) {
    markdown = `# ${title}\n\n${markdown}`;
  }

  return { content: markdown, format: "markdown", title };
}

/**
 * Wrap content with YAML frontmatter
 */
function addFrontmatter(content: string, url: string, fetchDate: string): string {
  const frontmatter = `---
url: ${url}
fetchedAt: ${fetchDate}
---

`;
  return frontmatter + content;
}

export default defineCommand({
  meta: {
    name: "docs-fetch",
    description: "Fetch documentation from skill sources",
  },
  args: {
    inventory: {
      type: "positional",
      description: "Path to reference-inventory.json file",
      required: true,
    },
    dirty: {
      type: "boolean",
      description: "Keep existing reference files (skip cleanup)",
      default: false,
    },
  },
  async run({ args }) {
    const inventoryPath = path.resolve(args.inventory);
    const inventory = await parseInventory(inventoryPath);
    const entries = Object.entries(inventory.sources);

    const inventoryDir = path.dirname(inventoryPath);
    const referenceDir = path.join(inventoryDir, "reference");

    if (!args.dirty && (await fs.pathExists(referenceDir))) {
      consola.info("Cleaning reference directory");
      await fs.remove(referenceDir);
    }

    await fs.ensureDir(referenceDir);

    consola.info(`Found ${entries.length} source(s)`);

    for (const [label, url] of entries) {
      consola.start(`${label}`);

      let raw: string;
      try {
        raw = await fetchContent(url);
      } catch (err) {
        consola.error(`  Failed: ${err instanceof Error ? err.message : err}`);
        continue;
      }

      const fetchDate = new Date().toISOString();
      const isMarkdown = url.endsWith(".md") || url.endsWith(".mdx");

      let content: string;
      let ext: string;

      if (isMarkdown) {
        consola.log(`  Raw markdown`);
        content = raw;
        ext = path.extname(url);
      } else {
        consola.log(`  Processing HTML`);
        const processed = processHtml(raw);
        content = processed.content;
        ext = processed.format === "markdown" ? ".md" : ".html";
        consola.log(`    Output: ${processed.format}`);
      }

      const filename = toFilename(label, ext);
      const outputPath = path.join(referenceDir, filename);
      const withFrontmatter = addFrontmatter(content, url, fetchDate);
      await fs.writeFile(outputPath, withFrontmatter, "utf-8");
      consola.success(`  Saved: ${filename}`);
    }

    // Update lastFetched timestamp
    inventory.lastFetched = new Date().toISOString();
    await fs.writeJson(inventoryPath, inventory, { spaces: 2 });

    consola.success("Done");
  },
});
