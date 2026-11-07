import {defineConfig} from 'vite-plus';
import javascript from '@ver0/oxlint-config/javascript.js';
import node from '@ver0/oxlint-config/node.js';
import typescript from '@ver0/oxlint-config/typescript.js';
import vitest from '@ver0/oxlint-config/vitest.js';

export default defineConfig({
	fmt: {
		printWidth: 120,
		useTabs: true,
		tabWidth: 2,
		semi: true,
		singleQuote: true,
		trailingComma: 'all',
		bracketSpacing: false,
		// constraint: rumdl formats markdown, configured in .rumdl.toml
		ignorePatterns: ['**/.dev/reference/**', '**/LICENSE', '**/*.md'],
	},
	test: {
		include: ['src/**/*.test.ts', 'plugins/**/*.test.mts'],
	},
	lint: {
		// constraint: these files type-check against types Claude Code writes only when it loads the mod
		// interactively, so a checkout without them fails with an invalid tsconfig
		ignorePatterns: ['plugins/plugin-rollcall/**/*.ts', 'plugins/better-memory/**/*.ts'],
		extends: [javascript, typescript, node, vitest],
		options: {typeAware: true, typeCheck: true},
	},
});
