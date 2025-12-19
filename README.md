# MD Enhanced Images

A Vite plugin for SvelteKit projects that provides enhanced image optimization for both `.svelte` and `.md` (mdsvex) files. This is a fork of the official `@sveltejs/enhanced-img` plugin, extended to support the specific needs of Markdown-based blogs.

**WARNING**: This package is experimental. It uses pre-1.0 versioning and may introduce breaking changes with every minor version release.

## The Pipeline

The transformations occur in the following order:

1.  **Vite Transformation Phase**: This plugin runs with `enforce: 'pre'`, meaning it sees the raw `.md` or `.svelte` source before any other processors.
    *   It scans the file for image tags (`<enhanced:img>`, and optionally `![alt](src)` or `<img>`).
    *   It resolves the image paths using Vite's resolution logic.
    *   It uses `sharp` and `vite-imagetools` to generate responsive source sets and modern formats (AVIF, WebP).
    *   It replaces the tags with optimized `<picture>` elements.
    *   It injects necessary `import` statements into the file's `<script>` block.
2.  **MDSvex Phase**: MDSvex processes the transformed Markdown. Since the plugin has already converted image tags into Svelte-compatible `<picture>` tags and added imports, MDSvex simply treats them as regular Svelte components/logic.
3.  **Svelte Compiler**: The final Svelte component (produced by MDSvex or from a `.svelte` file) is compiled into high-performance JavaScript.

## Configuration

You can configure the plugin in your `vite.config.ts`:

```typescript
import { mdEnhancedImages } from 'md-enhanced-images';

export default defineConfig({
    plugins: [
        mdEnhancedImages({
            /**
             * Automatically convert markdown image syntax `![alt](src)`
             * to optimized <picture> tags.
             * @default false
             */
            convertMarkdownSyntax: true,

            /**
             * Automatically convert regular <img> tags in markdown
             * to optimized <picture> tags if the src is a local asset.
             * @default false
             */
            convertRegularImgTags: true
        }),
        // ...
    ]
});
```

## Changes from `@sveltejs/enhanced-img`

This implementation includes several key modifications to the original `@sveltejs/enhanced-img` logic:

*   **Markdown Support**: Added logic to detect and process `.md` files.
*   **Regex-based Parsing**: Unlike the original which relies solely on the Svelte compiler's `parse` function, this plugin uses a robust regex-based parser for Markdown files. This avoids "unexpected token" errors when Markdown contains content that isn't valid Svelte template syntax.
*   **Auto-Conversion**: Added the ability to opt-in to automatic conversion of standard Markdown `![]()` and HTML `<img>` tags into optimized images.
*   **Generic Helpers**: Refactored attribute serialization and tag replacement into generic functions that can handle both Svelte AST nodes and custom Markdown attribute objects.
*   **Script Injection**: Improved script detection and injection logic to correctly handle Markdown files, which may or may not already have a `<script>` block.
*   **Graceful Resolution**: For auto-converted tags, the plugin gracefully skips images that cannot be resolved as local assets (e.g., remote URLs or public folder assets), whereas the original would throw an error.

## Acknowledgements

This package is a fork of [`@sveltejs/enhanced-img`](https://github.com/sveltejs/kit/tree/main/packages/enhanced-img), which is maintained by the Svelte team.

We'd like to thank the authors of `svelte-preprocess-import-assets`, which the original code is partially based off of. We'd also like to thank the authors of `vite-imagetools` which is used in this package.
