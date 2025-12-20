# Git and NPM Ignore Configuration

This document explains the ignore file configuration for the `md-enhanced-images` package.

## Root .gitignore

**Location**: [.gitignore](.gitignore)

**Purpose**: Prevents committing build artifacts, dependencies, and OS-specific files to version control.

### What's Ignored

#### Node.js & Package Managers
- `node_modules/` - Dependencies
- `*.log` - Debug and error logs
- `.pnpm-store/` - PNPM cache
- `package-lock.json`, `yarn.lock` - Lock files (we use npm)

#### Build Outputs
- `.svelte-kit/` - SvelteKit build directory
- `dist/`, `build/` - Generic build directories
- `.vercel/`, `.netlify/` - Deployment artifacts

#### Testing
- `playwright-report/` - Playwright HTML reports
- `test-results/` - Playwright test results
- `playwright/.cache/` - Playwright browser binaries
- `coverage/` - Code coverage reports

#### IDE & Editors
- `.vscode/`, `.idea/` - IDE settings
- `*.swp`, `*.swo` - Vim swap files

#### OS Files
- `.DS_Store` - macOS Finder metadata
- `Thumbs.db` - Windows thumbnail cache

#### Environment & Secrets
- `.env`, `.env.*` - Environment variables (except `.env.example`)

## Test App .gitignore

**Location**: [test/apps/basics/.gitignore](test/apps/basics/.gitignore)

**Purpose**: Prevents committing test app build outputs and test results.

### What's Ignored
- `.svelte-kit/` - SvelteKit build output
- `node_modules/` - Test app dependencies
- `playwright-report/`, `test-results/` - Test results
- `.env*` - Test environment variables

## .npmignore

**Location**: [.npmignore](.npmignore)

**Purpose**: Excludes development and test files from the published npm package.

### What's Excluded from NPM

#### Development Files
- `test/` - All test files and test apps
- `enhanced-img/`, `md-enhanced-images/` - Original source directories
- `*.spec.js`, `*.test.js` - Test files
- `vitest.config.js` - Test configuration
- `TESTING.md` - Testing documentation

#### Build & CI
- `.github/`, `.circleci/` - CI configuration
- `.svelte-kit/`, `build/`, `dist/` - Build artifacts
- `coverage/` - Code coverage reports

#### Source Control
- `.git/`, `.gitignore` - Git files

#### IDE & OS
- `.vscode/`, `.idea/` - IDE settings
- `.DS_Store`, `Thumbs.db` - OS files

### What's Included in NPM

The `files` field in [package.json](package.json) explicitly defines what gets published:

```json
"files": [
  "src",
  "types"
]
```

Plus these files are always included:
- `package.json` - Package metadata
- `README.md` - Documentation
- `LICENSE` - License file (if present)
- `CHANGELOG.md` - Version history

You can preview what will be published with:
```bash
npm pack --dry-run
```

## Verification Commands

### Check what's ignored by git
```bash
git status --ignored
```

### Check what will be published to npm
```bash
npm pack --dry-run
```

### Check package size
```bash
npm pack
tar -tzf md-enhanced-images-*.tgz
```

## Best Practices

1. **Never commit**:
   - `node_modules/`
   - `.env` files with secrets
   - Build outputs
   - OS-specific files

2. **Always commit**:
   - Source code (`src/`)
   - Type definitions (`types/`)
   - Documentation (`README.md`, `CHANGELOG.md`)
   - Configuration files (`package.json`, `tsconfig.json`)

3. **NPM publishing**:
   - Only `src/` and `types/` directories
   - No test files or test apps
   - No development dependencies
   - Keep the package small (<100KB unpacked)

## Current Package Size

```
Package size: ~10.4 KB (gzipped)
Unpacked size: ~33.3 KB
Total files: 7
```

This is excellent for a Vite plugin - small, focused, and production-ready.
