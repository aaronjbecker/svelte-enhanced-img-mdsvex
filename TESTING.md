# Testing Documentation

This document describes the testing setup for `md-enhanced-images`.

## Test Structure

The package has two types of tests:

### 1. Unit Tests (`/test/*.spec.js`)

Fast tests that verify the plugin's code transformation logic without requiring a full build.

**Location**: `/test/*.spec.js`

**Test Files**:
- `markup-plugin.spec.js` - Tests Svelte file transformations (inherited from `@sveltejs/enhanced-img`)
- `markdown-plugin.spec.js` - Tests Markdown file transformations (new functionality)

**What They Test**:
- Transforming `<enhanced:img>` tags into `<picture>` elements
- Converting markdown `![alt](src)` syntax (when enabled)
- Converting regular `<img>` tags in markdown (when enabled)
- Handling dynamic imports
- Generating responsive srcsets
- Preserving attributes and handling edge cases

**Run Unit Tests**:
```bash
npm run test:unit
```

### 2. Integration Tests (`/test/apps/`)

End-to-end tests that build actual SvelteKit apps and verify images render correctly in a browser.

**Location**: `/test/apps/basics/`

**What They Test**:
- Full SvelteKit build pipeline integration
- Image optimization actually works (generates AVIF, WebP, PNG/JPEG)
- Images render correctly in a browser
- Different image scenarios:
  - Static imports: `<enhanced:img src="./birds.jpg" />`
  - SVG handling: `<enhanced:img src="./logo.svg" />`
  - Dynamic imports: `import img from './logo.png?enhanced'`

**Run Integration Tests**:
```bash
# From repository root
npm run test:integration

# Or from the test app directly
cd test/apps/basics
npm install
npm run build
npm run preview
npm test
```

## Test Configuration

### Vitest (Unit Tests)

Configuration: [vitest.config.js](vitest.config.js)

```javascript
export default defineConfig({
	test: {
		include: ['test/**/*.spec.js'],
		globals: true
	}
});
```

### Playwright (Integration Tests)

Configuration: [test/utils.js](test/utils.js) (shared config)

Each test app uses Playwright to:
1. Build the SvelteKit app
2. Start a preview server on port 4173
3. Navigate to pages and verify image elements

## Dependencies

### Development Dependencies

The following are required for testing:

- **vitest** (`^2.0.0`) - Unit test runner
- **@playwright/test** (`^1.48.0`) - Browser automation for integration tests
- **@sveltejs/kit** - Required for integration test apps
- **@sveltejs/vite-plugin-svelte** - Required for Svelte compilation
- **svelte** - Required for Svelte components
- **vite** - Build tool

All testing dependencies are in `devDependencies` in [package.json](package.json).

## Running All Tests

```bash
# Run both unit and integration tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Continuous Integration

The test suite is designed to run in CI environments:

- Unit tests run quickly (< 2 seconds)
- Integration tests use Playwright with automatic retries
- Both test types exit with proper status codes for CI

## Adding New Tests

### Adding Unit Tests

1. Create or modify test files in `/test/*.spec.js`
2. Use Vitest's `it()` and `expect()` APIs
3. For snapshot tests, use `expect().toMatchFileSnapshot()`
4. Run `npm run test:unit -- -u` to update snapshots

### Adding Integration Tests

1. Create a new directory under `/test/apps/`
2. Set up a minimal SvelteKit app
3. Configure `vite.config.js` to use `mdEnhancedImages()`
4. Create test cases in `test/test.js` using Playwright
5. Document the test app in `/test/apps/README.md`

## Test Coverage

The test suite currently covers:

✅ Svelte file transformations (all features from upstream)
✅ Markdown file transformations (new fork functionality)
✅ Auto-conversion of markdown syntax
✅ Auto-conversion of regular img tags
✅ Dynamic imports and expressions
✅ Responsive images with srcsets
✅ Multiple image formats (AVIF, WebP, PNG, JPEG, SVG)
✅ Integration with SvelteKit build pipeline
✅ Browser rendering verification

## Troubleshooting Tests

### Unit Tests Failing

- Check that snapshots match expected output
- Update snapshots with `npm run test:unit -- -u`
- Verify test files use correct import paths

### Integration Tests Failing

- Ensure dependencies are installed in test apps: `cd test/apps/basics && npm install`
- Check that the build succeeds: `npm run build`
- Verify Playwright is installed: `npx playwright install`
- Check server starts on port 4173
- Review Playwright traces if available

### Common Issues

**"Cannot find module"**: Run `npm install` in both root and test app directories

**Snapshot mismatch**: The plugin output may have changed. Review the diff and update with `-u` if intentional

**Build errors in test app**: Check that `vite.config.js` correctly imports `mdEnhancedImages` from `../../../src/index.js`
