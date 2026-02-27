import path from 'path';
import fs from 'fs';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';

const pkgPath = path.resolve(__dirname, '../../packages');
const distPath = path.resolve(__dirname, '../../dist/node_modules');
export function resolvePkgPath(pkgName, isDist) {
	return `${isDist ? distPath : pkgPath}/${pkgName}`;
}

export function getPackageJson(pkgName) {
	const path = resolvePkgPath(pkgName) + '/package.json';
	const str = fs.readFileSync(path);
	return JSON.parse(str);
}

export function getBaseRollupPlugins({
	alias = { __DEV__: true, preventAssignment: true },
	tsOptions = {
		tsconfigOverride: {
			include: [`${pkgPath}/**/*`]
		}
	}
} = {}) {
	return [replace(alias), commonjs(), typescript(tsOptions)];
}
