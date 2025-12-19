import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture } from 'vite-imagetools';
import './ambient.js';

type EnhancedImgAttributes = Omit<HTMLImgAttributes, 'src'> & { src: string | Picture };

// https://svelte.dev/docs/svelte/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': EnhancedImgAttributes;
	}
}

export interface MdEnhancedImageOptions {
	/**
	 * Automatically convert markdown image syntax `![alt](src)` to `<enhanced:img src={src} alt={alt} />`
	 * @default false
	 */
	convertMarkdownSyntax?: boolean;
	/**
	 * Automatically convert regular `<img>` tags in markdown to `<enhanced:img>` if the src is a vite asset
	 * @default false
	 */
	convertRegularImgTags?: boolean;
}

export function mdEnhancedImages(options?: MdEnhancedImageOptions): Plugin[];
