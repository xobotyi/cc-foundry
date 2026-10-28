import {defineCommand} from 'citty';
import {consola} from 'consola';
import fs from 'fs-extra';
import path from 'node:path';
import {Readability} from '@mozilla/readability';
import {parseHTML} from 'linkedom';
import TurndownService from 'turndown';
import {isObject} from '../check/repo.ts';
import type {JsonObject} from '../check/repo.ts';

type ReferenceInventory = {
	/** The file as read, so writing it back keeps keys this command does not know. */
	readonly raw: JsonObject;
	readonly sources: ReadonlyArray<readonly [label: string, url: string]>;
};

const BROWSER_HEADERS: HeadersInit = {
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	'Cache-Control': 'no-cache',
	Pragma: 'no-cache',
	'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
	'Sec-Ch-Ua-Mobile': '?0',
	'Sec-Ch-Ua-Platform': '"macOS"',
	'Sec-Fetch-Dest': 'document',
	'Sec-Fetch-Mode': 'navigate',
	'Sec-Fetch-Site': 'none',
	'Sec-Fetch-User': '?1',
	'Upgrade-Insecure-Requests': '1',
};

async function parseInventory(filePath: string): Promise<ReferenceInventory> {
	if (!(await fs.pathExists(filePath))) {
		throw new Error(`Inventory not found: ${filePath}`);
	}

	const data: unknown = await fs.readJson(filePath);

	if (!isObject(data) || !isObject(data.sources)) {
		throw new TypeError(`Invalid inventory: 'sources' must be an object`);
	}

	const sources = Object.entries(data.sources).map(([label, url]): readonly [string, string] => {
		if (typeof url !== 'string') throw new TypeError(`Invalid inventory: source "${label}" is not a URL`);
		return [label, url];
	});
	return {raw: data, sources};
}

/**
 * Fetch content from URL, following redirects
 */
async function fetchContent(url: string): Promise<string> {
	const res = await fetch(url, {
		redirect: 'follow',
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
			.replaceAll(/[^a-z0-9]+/g, '-')
			.replaceAll(/^-|-$/g, '') + ext
	);
}

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
});

/**
 * Minify HTML by removing extra whitespace
 */
function minifyHtml(html: string): string {
	return html.replaceAll(/\s+/g, ' ').replaceAll(/>\s+</g, '><').trim();
}

type ProcessedContent = {
	content: string;
	format: 'markdown' | 'html';
	title?: string;
};

/**
 * Process HTML with graceful degradation:
 * 1. Try Readability → if fails, return original HTML
 * 2. Try Turndown → if fails, return Readability HTML (minified)
 * 3. If all succeed → return Markdown
 */
function processHtml(html: string): ProcessedContent {
	let article: ReturnType<Readability['parse']>;
	try {
		const {document} = parseHTML(html);
		const reader = new Readability(document);
		article = reader.parse();
	} catch {
		consola.warn(`    Readability failed, using original HTML`);
		return {content: minifyHtml(html), format: 'html'};
	}

	const articleContent = article?.content ?? '';
	if (articleContent === '') {
		consola.warn(`    Readability returned no content, using original HTML`);
		return {content: minifyHtml(html), format: 'html'};
	}

	const title = article?.title ?? undefined;

	let markdown: string;
	try {
		markdown = turndown.turndown(articleContent);
	} catch {
		consola.warn(`    Turndown failed, using Readability HTML`);
		return {
			content: minifyHtml(articleContent),
			format: 'html',
			title,
		};
	}

	if (title !== undefined && title !== '') {
		markdown = `# ${title}\n\n${markdown}`;
	}

	return {content: markdown, format: 'markdown', title};
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
		name: 'docs-fetch',
		description: 'Fetch documentation from skill sources',
	},
	args: {
		inventory: {
			type: 'positional',
			description: 'Path to reference-inventory.json file',
			required: true,
		},
		dirty: {
			type: 'boolean',
			description: 'Keep existing reference files (skip cleanup)',
			default: false,
		},
	},
	async run({args}) {
		const inventoryPath = path.resolve(args.inventory);
		const inventory = await parseInventory(inventoryPath);

		const inventoryDir = path.dirname(inventoryPath);
		const referenceDir = path.join(inventoryDir, 'reference');

		if (!args.dirty && (await fs.pathExists(referenceDir))) {
			consola.info('Cleaning reference directory');
			await fs.remove(referenceDir);
		}

		await fs.ensureDir(referenceDir);

		consola.info(`Found ${inventory.sources.length} source(s)`);

		for (const [label, url] of inventory.sources) {
			// oxlint-disable-next-line no-await-in-loop -- one source at a time keeps each source's log lines together
			await fetchSource(label, url, referenceDir);
		}

		await fs.writeJson(inventoryPath, {...inventory.raw, lastFetched: new Date().toISOString()}, {spaces: 2});

		consola.success('Done');
	},
});

/** Fetches one source into the reference directory; a source that fails to download is reported and skipped. */
async function fetchSource(label: string, url: string, referenceDir: string): Promise<void> {
	consola.start(label);

	let raw: string;
	try {
		raw = await fetchContent(url);
	} catch (error) {
		consola.error(`  Failed: ${error instanceof Error ? error.message : String(error)}`);
		return;
	}

	const fetchDate = new Date().toISOString();
	const isMarkdown = url.endsWith('.md') || url.endsWith('.mdx');

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
		ext = processed.format === 'markdown' ? '.md' : '.html';
		consola.log(`    Output: ${processed.format}`);
	}

	const filename = toFilename(label, ext);
	await fs.writeFile(path.join(referenceDir, filename), addFrontmatter(content, url, fetchDate), 'utf8');
	consola.success(`  Saved: ${filename}`);
}
