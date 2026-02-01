import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	// eslint:recommended
	js.configs.recommended,

	// plugin:@typescript-eslint/recommended
	...tseslint.configs.recommended,

	// 通用语言选项（相当于 env: { browser/node/es2021 } + parserOptions）
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.es2021,
				...globals.browser,
				...globals.node
			}
		}
	},

	{
		files: ['**/*.{ts,mts,cts}'],
		rules: {
			// 允许在 switch/case 语句中声明变量（不强制加花括号）
			'no-case-declarations': 'off',
			// 允许常量条件（比如 while(true) 这样的代码）
			'no-constant-condition': 'off',
			// 允许 typescript 注释指令（@ts-expect-error/@ts-ignore 等）
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},

	// 等价于：plugin:prettier/recommended
	// 1) 启用 prettier 插件并把 prettier 格式问题当作 ESLint error
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		plugins: {
			prettier: prettierPlugin
		},
		rules: {
			'prettier/prettier': 'error'
		}
	},

	// 2) 关闭与 Prettier 冲突的 ESLint 规则（等价于 extends: ["prettier"]）
	eslintConfigPrettier
]);
