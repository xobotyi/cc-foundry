import {defineConfig} from 'vite-plus';
import javascript from '@ver0/oxlint-config/javascript.js';
import node from '@ver0/oxlint-config/node.js';
import typescript, {typescriptUnsafe} from '@ver0/oxlint-config/typescript.js';
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
		ignorePatterns: ['**/.dev/reference/**', '**/LICENSE'],
		overrides: [
			{files: ['**/*.md'], options: {proseWrap: 'always'}},
			{files: ['**/skills/**/*.md', '**/CLAUDE.md'], options: {embeddedLanguageFormatting: 'off'}},
		],
	},
	test: {
		include: ['src/**/*.test.ts', 'plugins/**/*.test.mts', 'plugins/**/*.test.mjs', 'plugins/**/.dev/**/*.test.mjs'],
	},
	lint: {
		// constraint: these files type-check against types Claude Code writes only when it loads the mod
		// interactively, so a checkout without them fails with an invalid tsconfig
		ignorePatterns: ['plugins/plugin-rollcall/**/*.ts'],
		extends: [
			javascript,
			typescript,
			node,
			vitest,
			{
				rules: {
					// shortcut: duplicates the @ver0/oxlint-config entry — delete once a release carrying it is installed
					'typescript/prefer-readonly-parameter-types': [
						'error',
						{ignoreInferredTypes: true, treatMethodsAsReadonly: true},
					],
				},
				overrides: [
					{
						files: ['plugins/**/*.{js,mjs,cjs}'],
						rules: {
							...typescriptUnsafe.rules,
							// a JavaScript parameter carries no type annotation to mark readonly
							'typescript/prefer-readonly-parameter-types': 'off',
						},
					},
				],
			},
		],
		options: {typeAware: true, typeCheck: true},
	},
});
