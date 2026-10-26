import {expect, test} from 'vite-plus/test';
import type {Finding} from '../finding.ts';
import {createFixture} from '../fixture.ts';
import {loadRepo} from '../repo.ts';
import {catalogEntries, entryKeys, renamesCoverHistory} from './catalog.ts';

const brief = (findings: Finding[]) => findings.map((f) => `${f.file}: ${f.message}`);

test('a consistent catalog passes', async () => {
	await using fixture = await createFixture();
	const repo = await loadRepo(fixture.root);

	expect([await catalogEntries(repo), await entryKeys(repo), await renamesCoverHistory(repo)]).toStrictEqual([
		[],
		[],
		[],
	]);
});

test('catalog-entry reports a plugin directory with no entry', async () => {
	await using fixture = await createFixture();
	await fixture.editMarketplace((m) => {
		m.plugins = m.plugins.filter((e) => e.name !== 'beta');
	});

	expect(brief(await catalogEntries(await loadRepo(fixture.root)))).toStrictEqual([
		'.claude-plugin/marketplace.json: plugins/beta/ has no entry in the marketplace',
	]);
});

test('catalog-entry reports an entry with no directory, and a source off its directory', async () => {
	await using fixture = await createFixture();
	await fixture.editMarketplace((m) => {
		m.plugins.push({name: 'gamma', source: './plugins/gamma'});
		const beta = m.plugins.find((e) => e.name === 'beta');
		if (beta) beta.source = './plugins/alpha';
	});

	expect(brief(await catalogEntries(await loadRepo(fixture.root)))).toStrictEqual([
		'.claude-plugin/marketplace.json: entry "beta" has source "./plugins/alpha", not "./plugins/beta"',
		'.claude-plugin/marketplace.json: entry "gamma" has no directory under plugins/',
	]);
});

test('catalog-entry reports a manifest name that differs from its directory', async () => {
	await using fixture = await createFixture();
	await fixture.editManifest('alpha', (m) => {
		m.name = 'alfa';
	});

	expect(brief(await catalogEntries(await loadRepo(fixture.root)))).toStrictEqual([
		'plugins/alpha/.claude-plugin/plugin.json: the manifest name "alfa" differs from the directory name "alpha"',
	]);
});

test('entry-keys reports a field that belongs in plugin.json', async () => {
	await using fixture = await createFixture();
	await fixture.editMarketplace((m) => {
		const alpha = m.plugins.find((e) => e.name === 'alpha');
		if (alpha) {
			alpha.version = '1.0.0';
			alpha.relevance = 'always';
		}
	});

	const findings = await entryKeys(await loadRepo(fixture.root));

	expect(brief(findings)).toStrictEqual([
		'.claude-plugin/marketplace.json: entry "alpha" carries "version", which belongs in its plugin.json',
	]);
	expect(findings[0]?.line).toBe(11);
});

test('renames-history reports a removed plugin until renames maps it', async () => {
	await using fixture = await createFixture();
	await fixture.editMarketplace((m) => {
		m.plugins = m.plugins.filter((e) => e.name !== 'beta');
	});
	await fixture.remove('plugins/beta');
	await fixture.commit('remove beta');

	expect(brief(await renamesCoverHistory(await loadRepo(fixture.root)))).toStrictEqual([
		'.claude-plugin/marketplace.json: "beta" left the marketplace with no renames key; ' +
			'map it to its new name, or to null',
	]);

	await fixture.editMarketplace((m) => {
		m.renames = {beta: null};
	});

	expect(await renamesCoverHistory(await loadRepo(fixture.root))).toStrictEqual([]);
});
