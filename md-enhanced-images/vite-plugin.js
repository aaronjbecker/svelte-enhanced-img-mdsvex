/** @import { AST } from 'svelte/compiler' */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadSvelteConfig } from '@sveltejs/vite-plugin-svelte';
import MagicString from 'magic-string';
import sharp from 'sharp';
import { parse } from 'svelte-parse-markup';
import { walk } from 'zimmerframe';

// TODO: expose this in vite-imagetools rather than duplicating it
const OPTIMIZABLE = /^[^?]+\.(avif|heif|gif|jpeg|jpg|png|tiff|webp)(\?.*)?$/;

/**
 * Creates the Svelte image plugin.
 * @param {import('vite').Plugin<void>} imagetools_plugin
 * @param {import('./types/index.js').MdEnhancedImageOptions} [options]
 * @returns {import('vite').Plugin<void>}
 */
export function image_plugin(imagetools_plugin, options = {}) {
	// TODO: clear this map in dev mode to avoid memory leak
	/**
	 * URL to image details
	 * @type {Map<string, import('vite-imagetools').Picture>}
	 */
	const images = new Map();

	/** @type {import('vite').ResolvedConfig} */
	let vite_config;

	/** @type {Partial<import('@sveltejs/vite-plugin-svelte').SvelteConfig | undefined>} */
	let svelte_config;

	const name = 'vite-plugin-enhanced-img-markdown';

	return {
		name,
		enforce: 'pre',
		async configResolved(config) {
			vite_config = config;
			for (const plugin of config.plugins || []) {
				if (plugin.name === name) {
					break;
				}
				if (plugin.name === 'vite-plugin-svelte') {
					throw new Error(
						'@sveltejs/enhanced-img must come before the Svelte or SvelteKit plugins'
					);
				}
			}
			svelte_config = await loadSvelteConfig();
			if (!svelte_config) throw new Error('Could not load Svelte config file');
		},
		/**
		 * @param {string} content
		 * @param {string} filename
		 */
		async transform(content, filename) {
			/** @type {import('./types/index.js').MdEnhancedImageOptions} */
			const opts = options;
			const plugin_context = this;
			const extensions = svelte_config?.extensions || ['.svelte'];
			const is_md = filename.endsWith('.md');

			if (is_md || extensions.some((ext) => filename.endsWith(ext))) {
				if (!content.includes('<enhanced:img') && 
					!(is_md && ((opts.convertMarkdownSyntax && content.includes('![')) || (opts.convertRegularImgTags && content.includes('<img'))))) {
					return;
				}

				const s = new MagicString(content);

				/**
				 * Import path to import name
				 * e.g. ./foo.png => __IMPORTED_ASSET_0__
				 * @type {Map<string, string>}
				 */
				const imports = new Map();

				/**
				 * @param {any} node_or_attrs
				 * @param {string} src_value
				 * @param {boolean} is_expression
				 * @param {number} start_pos
				 * @param {number} end_pos
				 * @param {boolean} [graceful]
				 * @returns {Promise<boolean>}
				 */
				async function update_element_generic(
					node_or_attrs,
					src_value,
					is_expression,
					start_pos,
					end_pos,
					graceful = false
				) {
					if (is_expression) {
						s.update(start_pos, end_pos, dynamic_img_to_picture(content, node_or_attrs, src_value));
						return true;
					}

					const original_url = src_value.trim();
					let url = original_url;

					if (OPTIMIZABLE.test(url)) {
						const sizes = get_attr_value_generic(node_or_attrs, 'sizes');
						const width = get_attr_value_generic(node_or_attrs, 'width');
						url += url.includes('?') ? '&' : '?';
						if (sizes && typeof sizes === 'object' && 'raw' in sizes) {
							url += 'imgSizes=' + encodeURIComponent(sizes.raw) + '&';
						} else if (typeof sizes === 'string') {
							url += 'imgSizes=' + encodeURIComponent(sizes) + '&';
						}

						if (width && typeof width === 'object' && 'raw' in width) {
							url += 'imgWidth=' + encodeURIComponent(width.raw) + '&';
						} else if (typeof width === 'string') {
							url += 'imgWidth=' + encodeURIComponent(width) + '&';
						}
						url += 'enhanced';
					}

					// resolves the import so that we can build the entire picture template string and don't
					// need any logic blocks
					const resolved_id = (await plugin_context.resolve(url, filename))?.id;
					if (!resolved_id) {
						if (graceful) return false;
						const query_index = url.indexOf('?');
						const file_path = query_index >= 0 ? url.substring(0, query_index) : url;
						if (existsSync(path.resolve(vite_config.publicDir, file_path))) {
							throw new Error(
								`Could not locate ${file_path}. Please move it to be located relative to the page in the routes directory or reference it beginning with /static/. See https://vitejs.dev/guide/assets for more details on referencing assets.`
							);
						}
						throw new Error(
							`Could not locate ${file_path}. See https://vitejs.dev/guide/assets for more details on referencing assets.`
						);
					}

					if (OPTIMIZABLE.test(url)) {
						let image = images.get(resolved_id);
						if (!image) {
							image = await process_id(resolved_id, plugin_context, imagetools_plugin);
							images.set(resolved_id, image);
						}
						s.update(start_pos, end_pos, img_to_picture_generic(content, node_or_attrs, image));
						return true;
					} else {
						const metadata = await sharp(resolved_id).metadata();
						// this must come after the await so that we don't hand off processing between getting
						// the imports.size and incrementing the imports.size
						const name = imports.get(original_url) || '__IMPORTED_ASSET_' + imports.size + '__';
						const attributes = 'attributes' in node_or_attrs ? node_or_attrs.attributes : node_or_attrs;
						const new_markup = `<img ${serialize_img_attributes_generic(content, attributes, {
							src: `{${name}}`,
							width: metadata.width || 0,
							height: metadata.height || 0
						})} />`;
						s.update(start_pos, end_pos, new_markup);
						imports.set(original_url, name);
						return true;
					}
				}

				/**
				 * @type {Array<Promise<any>>}
				 */
				const pending_updates = [];

				if (is_md) {
					/** @type {Array<[number, number]>} */
					const targeted_ranges = [];

					/**
					 * @param {any} node_or_attrs
					 * @param {string} src_value
					 * @param {boolean} is_expression
					 * @param {number} start_pos
					 * @param {number} end_pos
					 * @param {boolean} [graceful]
					 */
					function push_update(node_or_attrs, src_value, is_expression, start_pos, end_pos, graceful = false) {
						if (targeted_ranges.some(([st, en]) => (start_pos >= st && start_pos < en) || (end_pos > st && end_pos <= en))) {
							return;
						}
						targeted_ranges.push([start_pos, end_pos]);
						pending_updates.push(
							update_element_generic(node_or_attrs, src_value, is_expression, start_pos, end_pos, graceful)
						);
					}

					// 1. Process <enhanced:img> tags
					const ENHANCED_IMG_REGEX = /<enhanced:img\s+([^>]*?)\/?>/g;
					let match;
					while ((match = ENHANCED_IMG_REGEX.exec(content)) !== null) {
						const full_tag = match[0];
						const attr_string = match[1];
						const tag_start = match.index;
						const tag_end = tag_start + full_tag.length;

						const attributes = parse_md_attributes(full_tag, attr_string, tag_start);
						const src_attr = attributes.find((a) => a.name === 'src');
						if (src_attr) {
							const is_expression = src_attr.value.type === 'ExpressionTag';
							let src_value = '';
							if (is_expression && src_attr.value.expression) {
								src_value = content
									.substring(src_attr.value.expression.start, src_attr.value.expression.end)
									.trim();
							} else if (src_attr.value.raw) {
								src_value = src_attr.value.raw;
							}

							if (src_value) {
								push_update(attributes, src_value, is_expression, tag_start, tag_end);
							}
						}
					}

					// 2. Process regular <img> tags if requested
					if (opts.convertRegularImgTags) {
						const REGULAR_IMG_REGEX = /<img\s+([^>]*?)\/?>/g;
						while ((match = REGULAR_IMG_REGEX.exec(content)) !== null) {
							const full_tag = match[0];
							const attr_string = match[1];
							const tag_start = match.index;
							const tag_end = tag_start + full_tag.length;

							const attributes = parse_md_attributes(full_tag, attr_string, tag_start);
							const src_attr = attributes.find((a) => a.name === 'src');
							if (src_attr) {
								const is_expression = src_attr.value.type === 'ExpressionTag';
								let src_value = '';
								if (is_expression && src_attr.value.expression) {
									src_value = content
										.substring(src_attr.value.expression.start, src_attr.value.expression.end)
										.trim();
								} else if (src_attr.value.raw) {
									src_value = src_attr.value.raw;
								}

								if (src_value) {
									push_update(
										attributes,
										src_value,
										is_expression,
										tag_start,
										tag_end,
										true // graceful
									);
								}
							}
						}
					}

					// 3. Process markdown image syntax if requested
					if (opts.convertMarkdownSyntax) {
						const MD_IMG_REGEX = /!\[(.*?)\]\((.*?)\)/g;
						while ((match = MD_IMG_REGEX.exec(content)) !== null) {
							const full_match = match[0];
							const alt = match[1];
							const src = match[2];
							const tag_start = match.index;
							const tag_end = tag_start + full_match.length;

							const is_expression = src.startsWith('{') && src.endsWith('}');
							const src_value = is_expression ? src.slice(1, -1).trim() : src;

							// Simulate attributes for update_element_generic
							const attributes = [
								{
									name: 'src',
									value: is_expression ? { type: 'ExpressionTag' } : { type: 'Text', raw: src_value }
								}
							];
							if (alt) {
								attributes.push({
									name: 'alt',
									value: { type: 'Text', raw: alt }
								});
							}

							push_update(
								attributes,
								src_value,
								is_expression,
								tag_start,
								tag_end,
								true // graceful
							);
						}
					}

					await Promise.all(pending_updates);
				} else {
					const ast = parse(content, { filename, modern: true });

					walk(/** @type {import('svelte/compiler').AST.TemplateNode} */ (ast), null, {
						RegularElement(node, { next }) {
							if ('name' in node && node.name === 'enhanced:img') {
								const src = get_attr_value_generic(node, 'src');

								if (src && typeof src !== 'boolean') {
									const is_expression = src.type === 'ExpressionTag';
									let src_value;
									if (is_expression) {
										const start =
											'end' in src.expression ? src.expression.end : src.expression.range?.[0];
										const end =
											'start' in src.expression ? src.expression.start : src.expression.range?.[1];
										if (typeof start !== 'number' || typeof end !== 'number') {
											throw new Error('ExpressionTag has no range');
										}
										src_value = content.substring(start, end).trim();
									} else {
										src_value = src.raw;
									}

									if (src_value) {
										pending_updates.push(
											update_element_generic(node, src_value, is_expression, node.start, node.end)
										);
									}
								}

								return;
							}

							next();
						}
					});

					await Promise.all(pending_updates);

					// handle css
					if (ast.css) {
						const css = content.substring(ast.css.start, ast.css.end);
						const modified = css.replaceAll('enhanced\\:img', 'img');
						if (modified !== css) {
							s.update(ast.css.start, ast.css.end, modified);
						}
					}

					// add imports to Svelte script
					let text = '';
					if (imports.size) {
						for (const [path, import_name] of imports.entries()) {
							text += `\timport ${import_name} from "${path}";\n`;
						}
					}

					if (ast.instance) {
						// @ts-ignore
						s.appendLeft(ast.instance.content.start, text);
					} else if (text) {
						s.prepend(`<script>${text}</script>\n`);
					}
				}

				if (is_md) {
					// add imports to Markdown script
					let text = '';
					if (imports.size) {
						for (const [path, import_name] of imports.entries()) {
							text += `\timport ${import_name} from "${path}";\n`;
						}
					}

					const script_match = content.match(/<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>/);
					if (script_match && typeof script_match.index === 'number') {
						const script_content = script_match[1];
						const script_tag_full = script_match[0];
						const script_start = script_match.index + script_tag_full.indexOf(script_content);
						const script_end = script_start + script_content.length;

						let enhanced_script = script_content;
						if (opts.convertRegularImgTags || opts.convertMarkdownSyntax || content.includes('<enhanced:img')) {
							enhanced_script = enhance_imports(script_content);
						}

						s.update(script_start, script_end, enhanced_script + '\n' + text);
					} else if (text) {
						s.prepend(`<script>\n${text}</script>\n\n`);
					}
				}

				return {
					code: s.toString(),
					map: s.generateMap()
				};
			}
		}
	};
}

/**
 * @param {string} resolved_id
 * @param {import('vite').Rollup.PluginContext} plugin_context
 * @param {import('vite').Plugin} imagetools_plugin
 * @returns {Promise<import('vite-imagetools').Picture>}
 */
async function process_id(resolved_id, plugin_context, imagetools_plugin) {
	if (!imagetools_plugin.load) {
		throw new Error('Invalid instance of vite-imagetools. Could not find load method.');
	}
	const hook = imagetools_plugin.load;
	const handler = typeof hook === 'object' ? hook.handler : hook;
	const module_info = await handler.call(plugin_context, resolved_id);
	if (!module_info) {
		throw new Error(`Could not load ${resolved_id}`);
	}
	const code = typeof module_info === 'string' ? module_info : module_info.code;
	return parse_object(code.replace('export default', '').replace(/;$/, '').trim());
}

/**
 * @param {string} full_tag
 * @param {string} attr_string
 * @param {number} tag_start
 * @returns {any[]}
 */
function parse_md_attributes(full_tag, attr_string, tag_start) {
	const attributes = [];
	const ATTR_REGEX = /([\w-]+)=(?:"([^"]*)"|'([^']*)'|{([^}]*)})/g;
	let attr_match;
	while ((attr_match = ATTR_REGEX.exec(attr_string)) !== null) {
		const name = attr_match[1];
		const value = attr_match[2] || attr_match[3] || attr_match[4];
		const isExpression = !!attr_match[4];
		const attr_full = attr_match[0];
		const attr_offset = full_tag.indexOf(attr_string) + attr_match.index;

		attributes.push({
			name,
			value: isExpression
				? {
						type: 'ExpressionTag',
						expression: {
							start: tag_start + attr_offset + name.length + 2,
							end: tag_start + attr_offset + attr_full.length - 1
						}
					}
				: { type: 'Text', raw: value },
			start: tag_start + attr_offset,
			end: tag_start + attr_offset + attr_full.length
		});
	}
	return attributes;
}

/**
 * @param {string} str
 */
export function parse_object(str) {
	const updated = str
		.replaceAll(/{(\n\s*)?/gm, '{"')
		.replaceAll(':', '":')
		.replaceAll(/,(\n\s*)?([^ ])/g, ',"$2');
	try {
		return JSON.parse(updated);
	} catch {
		throw new Error(`Failed parsing string to object: ${str}`);
	}
}

/**
 * @param {any} node_or_attrs
 * @param {string} attr
 * @returns {any}
 */
function get_attr_value_generic(node_or_attrs, attr) {
	const attributes = Array.isArray(node_or_attrs) ? node_or_attrs : node_or_attrs.attributes;
	if (!attributes) return;

	const attribute = attributes.find((/** @type {any} */ v) => v.name === attr);

	if (!attribute || !('value' in attribute) || typeof attribute.value === 'boolean') return;

	// Check if value is an array and has at least one element
	if (Array.isArray(attribute.value)) {
		if (attribute.value.length > 0) return attribute.value[0];
		return;
	}

	// If it's not an array or is empty, return the value as is
	return attribute.value;
}

/**
 * @param {string} content
 * @param {any[]} attributes
 * @param {{
 *   src: string,
 *   width: string | number,
 *   height: string | number
 * }} details
 */
function serialize_img_attributes_generic(content, attributes, details) {
	const attribute_strings = attributes.map((/** @type {any} */ attribute) => {
		if ('name' in attribute && attribute.name === 'src') {
			return `src=${details.src}`;
		}
		if (typeof attribute.start === 'number' && typeof attribute.end === 'number') {
			return content.substring(attribute.start, attribute.end);
		}
		// Simulated attribute without offsets
		if (attribute.name && attribute.value) {
			const value = attribute.value;
			const val = typeof value === 'string' ? value : value.raw;
			return `${attribute.name}="${val}"`;
		}
		return '';
	});

	/** @type {number | undefined} */
	let user_width;
	/** @type {number | undefined} */
	let user_height;
	for (const attribute of attributes) {
		if ('name' in attribute && 'value' in attribute) {
			const value = Array.isArray(attribute.value) ? attribute.value[0] : attribute.value;
			if (value && typeof value === 'object') {
				if ('raw' in value) {
					if (attribute.name === 'width') user_width = parseInt(value.raw);
					if (attribute.name === 'height') user_height = parseInt(value.raw);
				} else if (value.type === 'Text' && 'raw' in value) {
					if (attribute.name === 'width') user_width = parseInt(value.raw);
					if (attribute.name === 'height') user_height = parseInt(value.raw);
				}
			} else if (typeof value === 'string') {
				if (attribute.name === 'width') user_width = parseInt(value);
				if (attribute.name === 'height') user_height = parseInt(value);
			}
		}
	}
	if (!user_width && !user_height) {
		if (details.width && details.height) {
			attribute_strings.push(`width=${details.width}`);
			attribute_strings.push(`height=${details.height}`);
		}
	} else if (!user_width && user_height) {
		if (details.width && details.height && !String(details.width).includes('{')) {
			attribute_strings.push(
				`width=${Math.round(
					(stringToNumber(details.width) * user_height) / stringToNumber(details.height)
				)}`
			);
		}
	} else if (!user_height && user_width) {
		if (details.width && details.height && !String(details.width).includes('{')) {
			attribute_strings.push(
				`height=${Math.round(
					(stringToNumber(details.height) * user_width) / stringToNumber(details.width)
				)}`
			);
		}
	}

	return attribute_strings.join(' ');
}

/**
 * @param {string|number} param
 */
function stringToNumber(param) {
	return typeof param === 'string' ? parseInt(param) : param;
}

/**
 * @param {string} content
 * @param {any} node_or_attrs
 * @param {import('vite-imagetools').Picture} image
 */
function img_to_picture_generic(content, node_or_attrs, image) {
	/** @type {any[]} attributes */
	const attributes = Array.isArray(node_or_attrs) ? [...node_or_attrs] : [...node_or_attrs.attributes];
	const index = attributes.findIndex((/** @type {any} */ attribute) => attribute.name === 'sizes');
	let sizes_string = '';
	if (index >= 0) {
		const attribute = attributes[index];
		if (typeof attribute.start === 'number' && typeof attribute.end === 'number') {
			sizes_string = ' ' + content.substring(attribute.start, attribute.end);
		} else {
			const value = attribute.value;
			const val = typeof value === 'string' ? value : value.raw;
			sizes_string = ` sizes="${val}"`;
		}
		attributes.splice(index, 1);
	}

	let res = '<picture>';

	for (const [format, srcset] of Object.entries(image.sources)) {
		res += `<source srcset=${to_value(srcset)}${sizes_string} type="image/${format}" />`;
	}

	res += `<img ${serialize_img_attributes_generic(content, attributes, {
		src: to_value(image.img.src),
		width: image.img.w,
		height: image.img.h
	})} />`;

	return (res += '</picture>');
}

/**
 * @param {string} src
 */
function to_value(src) {
	// __VITE_ASSET__ needs to be contained in double quotes to work with Vite asset plugin
	return src.startsWith('__VITE_ASSET__') ? `{"${src}"}` : `"${src}"`;
}

/**
 * For images like `<img src={manually_imported} />`
 * @param {string} content
 * @param {any} node_or_attrs
 * @param {string} src_var_name
 */
function dynamic_img_to_picture(content, node_or_attrs, src_var_name) {
	const attributes = Array.isArray(node_or_attrs) ? [...node_or_attrs] : [...node_or_attrs.attributes];
	const index = attributes.findIndex((/** @type {any} */ attribute) => attribute.name === 'sizes');
	let sizes_string = '';
	if (index >= 0) {
		const attribute = attributes[index];
		if (typeof attribute.start === 'number' && typeof attribute.end === 'number') {
			sizes_string = ' ' + content.substring(attribute.start, attribute.end);
		} else {
			const value = attribute.value;
			const val = typeof value === 'string' ? value : value.raw;
			sizes_string = ` sizes="${val}"`;
		}
		attributes.splice(index, 1);
	}

	return `{#if typeof ${src_var_name} === 'string'}
	<img ${serialize_img_attributes_generic(content, attributes, {
		src: `{${src_var_name}}`,
		width: '',
		height: ''
	})} />
{:else}
	<picture>
		{#each Object.entries(${src_var_name}.sources) as [format, srcset]}
			<source {srcset}${sizes_string} type={'image/' + format} />
		{/each}
		<img ${serialize_img_attributes_generic(content, attributes, {
			src: `{${src_var_name}.img.src}`,
			width: `{${src_var_name}.img.w}`,
			height: `{${src_var_name}.img.h}`
		})} />
	</picture>
{/if}`;
}

/**
 * Automatically appends ?enhanced to image imports in a script block
 * @param {string} script_content
 * @returns {string}
 */
function enhance_imports(script_content) {
	const IMPORT_REGEX =
		/import\s+([\w\s{},*]+)\s+from\s+['"]([^'"]+\.(?:avif|heif|gif|jpeg|jpg|png|tiff|webp))(?:\?([^'"]*))?['"]/g;
	return script_content.replace(IMPORT_REGEX, (match, imports, path, query) => {
		if (query && query.includes('enhanced')) return match;
		// For now, only handle default imports like `import image_1 from "..."`
		if (imports.trim().includes('{') || imports.trim().includes('*')) return match;

		const new_query = query ? `${query}&enhanced` : 'enhanced';
		return `import ${imports} from "${path}?${new_query}"`;
	});
}
