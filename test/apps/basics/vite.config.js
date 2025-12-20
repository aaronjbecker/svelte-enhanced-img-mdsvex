import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { mdEnhancedImages } from '../../../src/index.js';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	// @ts-ignore
	plugins: [mdEnhancedImages(), sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../../')]
		}
	}
};

export default config;
