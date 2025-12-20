# Integration Test Apps

This directory contains integration test applications that verify `md-enhanced-images` works correctly in real-world SvelteKit projects.

## Purpose

While the unit tests in `/test` verify that the plugin transforms code correctly, these integration tests ensure that:

1. The plugin integrates properly with SvelteKit's build pipeline
2. Images are actually loaded and rendered in a browser
3. The optimized `<picture>` elements work correctly with different image formats
4. Dynamic imports and static imports both work as expected

## Test Apps

### `basics/`

A minimal SvelteKit app that tests core image enhancement functionality:

- **Static images**: `<enhanced:img src="./birds.jpg" />`
- **SVG images**: Verifies SVG handling and dimensions
- **Dynamic imports**: `import logo from './logo.png?enhanced'` then `<enhanced:img src={logo} />`

The test uses Playwright to:
- Build the SvelteKit app
- Start a preview server
- Verify images are rendered with correct attributes in the browser

## Running Integration Tests

From the repository root:

```bash
# Run all tests (unit + integration)
npm test

# Run only integration tests
npm run test:integration
```

From within a test app (e.g., `test/apps/basics/`):

```bash
# Install dependencies
npm install

# Run the Playwright tests
npm test
```

## How It Works

1. **Build Phase**: Each test app imports `mdEnhancedImages` from the source code (`../../../src/index.js`)
2. **SvelteKit Integration**: The plugin runs during Vite's build process, transforming `<enhanced:img>` tags
3. **Browser Verification**: Playwright launches a browser, navigates to the app, and verifies the rendered output

## Configuration

Each test app has:
- `vite.config.js` - Configures the `mdEnhancedImages()` plugin
- `playwright.config.js` - Uses shared config from `/test/utils.js`
- `test/test.js` - Playwright test cases
- `src/routes/+page.svelte` - Test page with various image scenarios

## Adding New Test Apps

To test new functionality:

1. Create a new directory under `test/apps/`
2. Set up a minimal SvelteKit app structure
3. Configure `vite.config.js` to use `mdEnhancedImages()`
4. Add test cases in `test/test.js`
5. Update the root `package.json` integration test filter if needed
