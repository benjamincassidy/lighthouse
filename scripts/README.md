# Release Scripts

Automated scripts for preparing and releasing Lighthouse plugin versions.

## Scripts

### 1. `release.js` - Version Bump and Changelog

Prepares a new release by updating all version files and generating changelog entries.

**Usage:**
```bash
npm run release <version>
```

**Examples:**
```bash
# Patch release (bug fixes)
npm run release 0.9.3

# Minor release (new features)
npm run release 0.10.0

# Major release (breaking changes)
npm run release 1.0.0

# Pre-release versions
npm run release 1.0.0-beta.1
npm run release 1.0.0-rc.1
```

**What It Does:**

1. ✅ **Updates `manifest.json`** with new version
2. ✅ **Updates `package.json`** with new version
3. ✅ **Updates `versions.json`** with new version → minAppVersion mapping
4. ✅ **Generates `CHANGELOG.md` entry** from conventional commits or skeleton
5. ✅ **Runs `npm install --legacy-peer-deps`** to update `package-lock.json`
6. ✅ **Provides next steps** for completing the release

### 2. `generate-manifest.js` - Binary Manifest Generation

Generates `tools-manifest.json` for bundled Pandoc and Typst binaries during GitHub releases.

**Usage:**
```bash
node scripts/generate-manifest.js <version> <base-url>
```

**Example:**
```bash
node scripts/generate-manifest.js 1.1.0 https://github.com/owner/repo/releases/download/1.1.0
```

**What It Does:**

1. 📦 **Reads binary archives** from `dist/binaries/*.gz`
2. 🔓 **Decompresses each file** to compute SHA-256 hash and size
3. 📝 **Generates manifest JSON** with platform-specific download URLs
4. ✅ **Outputs to** `dist/tools-manifest.json`

**Manifest Structure:**
```json
{
  "pandoc": {
    "version": "3.6.4",
    "platforms": {
      "darwin-arm64": {
        "url": "https://github.com/.../pandoc-darwin-arm64.gz",
        "sha256": "abc123...",
        "size": 123456789
      },
      "darwin-x64": { ... },
      "linux-x64": { ... },
      "linux-arm64": { ... },
      "win32-x64": { ... }
    }
  },
  "typst": { ... }
}
```

### 3. `bootstrap-tools.js` - Local Binary Installation

Download and install Pandoc and Typst binaries locally for development.

**Usage:**
```bash
npm run bootstrap-tools
```

## Automated Binary Bundling

The GitHub Actions release workflow automatically:

1. 📥 **Downloads Pandoc and Typst** for all supported platforms (5 platforms each)
2. 🗜️ **Gzips binaries** for efficient distribution
3. 🔐 **Generates manifest** with SHA-256 checksums
4. 📤 **Attaches to release** as downloadable assets
5. 🔗 **Injects version** into plugin code at build time

**Supported Platforms:**
- `darwin-arm64` - macOS Apple Silicon
- `darwin-x64` - macOS Intel
- `linux-x64` - Linux x86_64
- `linux-arm64` - Linux ARM64
- `win32-x64` - Windows 64-bit

**Binary Naming Convention:**
```
<tool>-<platform>.gz
```

Examples:
- `pandoc-darwin-arm64.gz`
- `typst-linux-x64.gz`
- `pandoc-win32-x64.gz`

## Version Injection

The build system injects the current plugin version into the code at compile time:

**In `ToolsManifest.ts`:**
```typescript
declare const __LIGHTHOUSE_VERSION__: string

function getManifestUrl() {
  return `https://github.com/.../${__LIGHTHOUSE_VERSION__}/tools-manifest.json`
}
```

**In `esbuild.config.mjs`:**
```javascript
const manifest = JSON.parse(readFileSync('./manifest.json', 'utf8'))
const version = manifest.version

esbuild.context({
  define: {
    __LIGHTHOUSE_VERSION__: JSON.stringify(version),
  },
  // ...
})
```

This ensures the plugin always downloads binaries from its own release, not from upstream sources.

## Release Workflow

The complete release process:

1. **Developer**: Run `npm run release <version>` to bump version
2. **Developer**: Review and edit `CHANGELOG.md`
3. **Developer**: Commit changes and push to `main`
4. **GitHub Actions**: Detect version change in `manifest.json`
5. **GitHub Actions**: Download Pandoc and Typst binaries for all platforms
6. **GitHub Actions**: Generate `tools-manifest.json` with current release URLs
7. **GitHub Actions**: Build plugin with version injection
8. **GitHub Actions**: Create release with:
   - `main.js`, `manifest.json`, `styles.css` (plugin files)
   - 10 `.gz` binary files (5 Pandoc + 5 Typst)
   - `tools-manifest.json` (download registry)
9. **Users**: Download plugin, which automatically fetches binaries from the release

## Changelog Generation

The release script intelligently generates CHANGELOG.md entries:

### Conventional Commits (Recommended)

If you use [Conventional Commits](https://www.conventionalcommits.org/), the script will automatically categorize your changes:

```bash
# Your commits:
git commit -m "feat: add new dashboard widget"
git commit -m "fix: resolve word count bug"
git commit -m "docs: update installation guide"

# Generated changelog:
## [1.0.0] - 2026-01-14

### Added
- add new dashboard widget

### Fixed
- resolve word count bug

### Documentation
- update installation guide
```

**Supported commit types:**
- `feat:` → **Added** section
- `fix:` → **Fixed** section
- `refactor:` / `perf:` → **Changed** section
- `docs:` → **Documentation** section
- `!` suffix (e.g., `feat!:`) → **Breaking Changes** section

### Skeleton Generation

If no conventional commits are found, a skeleton entry is created for you to fill in:

```markdown
## [1.0.0] - 2026-01-14

### Added
- Feature 1
- Feature 2

### Fixed
- Bug fix 1

### Changed
- Change 1
```

### Comparison Links

The script automatically maintains comparison links at the bottom of CHANGELOG.md:

```markdown
[Unreleased]: https://github.com/benjamincassidy/lighthouse/compare/1.0.0...HEAD
[1.0.0]: https://github.com/benjamincassidy/lighthouse/compare/0.9.0...1.0.0
```

## Complete Release Process

### 1. Run the Release Script

```bash
npm run release 1.0.0
```

This will:
- Update all version files
- Generate CHANGELOG.md entry from your commits
- Regenerate package-lock.json

### 2. Review and Edit CHANGELOG.md

The script generates a changelog entry, but you should review and enhance it:

```bash
# Review the generated entry
git diff CHANGELOG.md

# Edit if needed to add more context or details
```

### 3. Review All Changes

```bash
git diff
```

### 4. Commit and Push

```bash
git add manifest.json package.json versions.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.0"
git push origin main
```

### 5. Automatic Release

The GitHub Action will automatically:
- Detect the version change
- Run tests and build
- Create a GitHub release with tag `1.0.0`
- Upload `main.js`, `manifest.json`, `styles.css`

No manual tagging needed! 🎉

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes or major new features
- **MINOR** (0.9.0): New features, backwards compatible
- *Best Practices

### Use Conventional Commits

For automatic changelog generation, follow the conventional commits format:

```bash
# Features
git commit -m "feat: add project templates support"
git commit -m "feat(dashboard): add custom widgets"

# Bug fixes
git commit -m "fix: resolve file path encoding issue"
git commit -m "fix(stats): correct word count for markdown tables"

# Breaking changes
git commit -m "feat!: change project folder structure"
git commit -m "refactor!: rename API methods"

# Other types
git commit -m "docs: update README with new examples"
git commit -m "style: format code with prettier"
git commit -m "refactor: simplify word counting logic"
git commit -m "perf: optimize file tree rendering"
git commit -m "test: add tests for ProjectManager"
git commit -m "chore: update dependencies"
```

### *PATCH** (0.9.1): Bug fixes, backwards compatible

### Pre-release Versions

For testing before official release:

- **Alpha**: `1.0.0-alpha.1` - Early development, may be unstable
- **Beta**: `1.0.0-beta.1` - Feature complete, testing phase
- **RC**: `1.0.0-rc.1` - Release candidate, final testing

## Troubleshooting

### Invalid Version Format

Error: `Invalid version format`

**Solution**: Use semantic versioning format: `major.minor.patch`
- ✅ Valid: `1.0.0`, `0.9.3`, `1.0.0-beta.1`
- ❌ Invalid: `1.0`, `v1.0.0`, `1.0.0.0`

### npm install Fails

Error during `npm install --legacy-peer-deps`

**Solution**:
1. Check npm is installed: `npm --version`
2. Try manually: `npm install --legacy-peer-deps`
3. Clear cache: `npm cache clean --force && npm install --legacy-peer-deps`

### File Permission Error

Error: `EACCES: permission denied`

**Solution**:
```bash
chmod +x scripts/release.js
```

## Script Location

The script is located at: [`scripts/release.js`](../scripts/release.js)

It's a Node.js script that uses the built-in `fs` and `child_process` modules, so no additional dependencies are needed.
