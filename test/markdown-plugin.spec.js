import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, it } from 'vitest';
import { image_plugin } from '../src/vite-plugin.js';

const resolve = /** @param {string} file */ (file) => path.resolve(__dirname, file);

it('Markdown image preprocess snapshot test', async () => {
	const filename = 'Input.md';
	const vite_plugin = image_plugin(
		{
			name: 'vite-imagetools-mock',
			load(id) {
				if (id.includes('dev')) {
					return 'export default {sources:{avif:"/1 1440w, /2 960w",webp:"/3 1440w, /4 960w",png:"5 1440w, /6 960w"},img:{src:"/7",w:1440,h:1440}};';
				} else if (id.includes('prod')) {
					return 'export default {sources:{avif:"__VITE_ASSET__2AM7_y_a__ 1440w, __VITE_ASSET__2AM7_y_b__ 960w",webp:"__VITE_ASSET__2AM7_y_c__ 1440w, __VITE_ASSET__2AM7_y_d__ 960w",png:"__VITE_ASSET__2AM7_y_e__ 1440w, __VITE_ASSET__2AM7_y_f__ 960w"},img:{src:"__VITE_ASSET__2AM7_y_g__",w:1440,h:1440}};';
				}
				throw new Error(`unrecognized id ${id}`);
			}
		},
		{
			convertMarkdownSyntax: true,
			convertRegularImgTags: true
		}
	);
	const plugin_context = /** @type {import('vite').Rollup.TransformPluginContext} */ (
		/** @type {unknown} */ ({
			// @ts-ignore
			resolve(url) {
				return { id: url };
			}
		})
	);
	const transform =
		/** @type {(this: import('vite').Rollup.TransformPluginContext, code: string, id: string, options?: {ssr?: boolean;}) => Promise<import('vite').Rollup.TransformResult>} */ (
			// @ts-expect-error fails until vite is updated
			typeof vite_plugin.transform === 'function' ? vite_plugin.transform : vite_plugin.transform.handler
		);
	const transformed = await transform.call(
		plugin_context,
		await fs.readFile(resolve(filename), { encoding: 'utf-8' }),
		filename
	);
	if (!transformed) throw new Error('transform unexpectedly returned no results');
	if (typeof transformed === 'string') throw new Error('transform did not return a sourcemap');
	if (!transformed.code) throw new Error('transform did not return any code');

	// Make imports readable
	const output = transformed.code.replace(/import/g, '\n\timport');

	await expect(output).toMatchFileSnapshot('./OutputMarkdown.md');
});

it('Markdown without auto-conversion should only process enhanced:img', async () => {
	const filename = 'Input.md';
	const vite_plugin = image_plugin(
		{
			name: 'vite-imagetools-mock',
			load(id) {
				if (id.includes('dev') || id.includes('prod')) {
					return 'export default {sources:{avif:"/1 1440w, /2 960w",webp:"/3 1440w, /4 960w",png:"5 1440w, /6 960w"},img:{src:"/7",w:1440,h:1440}};';
				}
				throw new Error(`unrecognized id ${id}`);
			}
		},
		{
			convertMarkdownSyntax: false,
			convertRegularImgTags: false
		}
	);
	const plugin_context = /** @type {import('vite').Rollup.TransformPluginContext} */ (
		/** @type {unknown} */ ({
			// @ts-ignore
			resolve(url) {
				return { id: url };
			}
		})
	);
	const transform =
		/** @type {(this: import('vite').Rollup.TransformPluginContext, code: string, id: string, options?: {ssr?: boolean;}) => Promise<import('vite').Rollup.TransformResult>} */ (
			// @ts-expect-error fails until vite is updated
			typeof vite_plugin.transform === 'function' ? vite_plugin.transform : vite_plugin.transform.handler
		);
	const content = await fs.readFile(resolve(filename), { encoding: 'utf-8' });
	const transformed = await transform.call(plugin_context, content, filename);

	if (!transformed) throw new Error('transform unexpectedly returned no results');
	if (typeof transformed === 'string') throw new Error('transform did not return a sourcemap');
	if (!transformed.code) throw new Error('transform did not return any code');

	// Should still contain markdown image syntax
	expect(transformed.code).toContain('![Alt text for markdown](./dev.png)');
	// Should still contain regular img tag
	expect(transformed.code).toContain('<img src="./dev.png" alt="regular img test" />');
	// Should have transformed enhanced:img
	expect(transformed.code).toContain('<picture>');
});
