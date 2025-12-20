import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import { mdsvex } from 'mdsvex';
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkFootnotes from "remark-footnotes";
import remarkToc from "remark-toc";
import remarkD2 from "./src/lib/blog/remark-d2.js";
import rehypeEnhancedImg from "./src/lib/blog/rehype-enhanced-img.js";
import { codeToHtml } from 'shiki';

/* MDSVEX CODE HIGHLIGHTING */
// modified from Rodney Lab: https://rodneylab.com/sveltekit-shiki-syntax-highlighting
//   associated repo: https://github.com/rodneylab/sveltekit-shiki-code-highlighting/blob/main/src/lib/utilities/codeHighlighter.mjs
// not showing line numbers or line-level highlighting, but both are possible (see links above).
// list of themes: https://shiki.style/themes
const THEMES = { 'light': 'catppuccin-latte', 'dark': 'catppuccin-mocha' };

/**
 * Returns code with curly braces and backticks replaced by HTML entity equivalents
 * @param {string} html - highlighted HTML
 * @returns {string} - escaped HTML
 */
function escapeHtml(code) {
  return code.replace(
    /[{}`]/g,
    (character) => ({ '{': '&lbrace;', '}': '&rbrace;', '`': '&grave;' }[character]),
  );
}

function escapeBackticks(code) {
  return code.replace(/`/g, '\\`');
}

/**
 * @param code {string} - code to highlight
 * @param lang {string} - code language
 * @param meta {string} - code meta
 * @returns {Promise<string>} - highlighted html
 */
async function highlighter(code, lang) {
  // `codeToHtml` shorthand creates a singleton instance of the highlighter that's cached at package level.
  // languages and themes are loaded as needed but otherwise cached. 
  // cf. https://shiki.style/guide/install#shorthands
  let html = await codeToHtml(code, {
    lang,
    themes: THEMES
  });
  // add code block wrapper around the rendered HTML
  html = `<ShikiBlockWrapper code={\`${escapeBackticks(code)}\`} lang="${lang}">${escapeHtml(html)}</ShikiBlockWrapper>`;
  return html;
}

/* SVELTEKIT CONFIG */
/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  onwarn: (warning, handler) => {
    if ((warning.code === 'css-unused-selector' || warning.code === 'css_unused_selector') && 
        warning.message.includes('[data-theme="dark"]')) {
      return;
    }
    if (warning.code === 'a11y-no-noninteractive-tabindex' || warning.code === 'a11y_no_noninteractive_tabindex') {
      return;
    }
    // very rarely, this warning is useful-- but most of the time the non-reactive usage is to initialize a state variable, so it's just annoying.
    if (warning.code === 'state_referenced_locally') {
      return;
    }
    if ((warning.code === 'a11y-missing-attribute' || warning.code === 'a11y_missing_attribute') &&
        warning.filename?.endsWith('.md') &&
        warning.message.includes('<img>') &&
        warning.message.includes('alt')) {
      return;
    }
    handler(warning);
  },
  kit: {
    // assets and pre-rendered pages are pre-compressed by default,
    // cf. https://kit.svelte.dev/docs/adapter-node#options
    adapter: adapter({
      precompress: false,
    }),
    // add route aliases
    alias: {
      $components: 'src/lib/components',
      $posts: 'src/posts'
    },
    prerender: {
      // should reflect # of cores on the server, leaving at least one available for other processes.
      concurrency: 2,
      crawl: false,
      origin: process.env.ORIGIN,
    }
  },
  // by default, SvelteKit evaluates all markup preprocessors,
  // then all script preprocessors, then all style preprocessors.
  // `sequence` preprocessor ensures that each child applies all 3 steps before the next child.
  // cf. https://github.com/pchynoweth/svelte-sequential-preprocessor?tab=readme-ov-file#overview
  // this is now included in the melt-ui package, so it is no longer necessary to install it separately.
  preprocess: [
    // note: mdsvex MUST be the first preprocessor, 
    //   otherwise un-escaped curly braces etc. will cause svelte compiler errors.
    mdsvex({
      extensions: ['.md'],
      // Adds IDs to headings, and anchor links to those IDs. Note: must stay in this order to work.
      rehypePlugins: [
        rehypeSlug,
        rehypeAutolinkHeadings,
        // rehypeEnhancedImg,
      ],
      remarkPlugins: [
        [remarkD2, {
          compilePath: "static/d2",
        }],
        remarkFootnotes,
        [remarkToc, {
          tight: true,
        }],
      ],
      highlight: {
        highlighter: highlighter,
      },
    }),
    sequence([
      vitePreprocess(),
      preprocessMeltUI()]),
  ]
};
export default config;