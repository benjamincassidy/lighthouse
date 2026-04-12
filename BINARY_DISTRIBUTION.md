# Binary Distribution System

## Overview

Lighthouse bundles Pandoc and Typst binaries with each plugin release, enabling users to export documents to PDF, DOCX, and EPUB without requiring manual tool installation. This document describes the automated binary distribution system.

## Architecture

### 1. Build-Time Version Injection

The plugin version is injected into the code at build time, allowing the binary download URLs to point to the current release.

**File:** `esbuild.config.mjs`
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

**File:** `src/core/tools/ToolsManifest.ts`
```typescript
declare const __LIGHTHOUSE_VERSION__: string

function getVersionSpecificManifestUrl(): string | null {
  const version = typeof __LIGHTHOUSE_VERSION__ !== 'undefined' ? __LIGHTHOUSE_VERSION__ : null

  if (version) {
    return `https://github.com/owner/repo/releases/download/${version}/tools-manifest.json`
  }

  return null
}

export function getToolsManifestUrl(): string {
  // Try version-specific URL first, fall back to tools-v1
  return getVersionSpecificManifestUrl() || FALLBACK_MANIFEST_URL
}
```

### 2. GitHub Actions Release Workflow

The release workflow automatically downloads and bundles binaries with each plugin release.

**File:** `.github/workflows/release.yml`

**Steps:**
1. Download Pandoc binaries for all platforms from `jgm/pandoc` releases
2. Download Typst binaries for all platforms from `typst/typst` releases
3. Extract executables from platform-specific archives
4. Gzip each binary for efficient distribution
5. Generate `tools-manifest.json` with SHA-256 checksums and URLs
6. Attach all assets to the GitHub release

**Platforms Supported:**
- `darwin-arm64` - macOS Apple Silicon
- `darwin-x64` - macOS Intel
- `linux-x64` - Linux x86_64
- `linux-arm64` - Linux ARM64
- `win32-x64` - Windows 64-bit

**Binary Naming Convention:**
```
<tool>-<platform>.gz

Examples:
- pandoc-darwin-arm64.gz
- typst-linux-x64.gz
- pandoc-win32-x64.gz
```

### 3. Manifest Generation

The `generate-manifest.js` script creates a tools manifest during the release build.

**File:** `scripts/generate-manifest.js`

**Process:**
1. Reads all `.gz` files from `dist/binaries/`
2. Decompresses each file to compute:
   - SHA-256 hash (for integrity verification)
   - Uncompressed size (for progress display)
3. Generates JSON manifest with download URLs pointing to current release
4. Outputs to `dist/tools-manifest.json`

**Manifest Structure:**
```json
{
  "pandoc": {
    "version": "3.6.4",
    "platforms": {
      "darwin-arm64": {
        "url": "https://github.com/owner/repo/releases/download/1.1.0/pandoc-darwin-arm64.gz",
        "sha256": "abc123...",
        "size": 123456789
      },
      "darwin-x64": { ... },
      "linux-x64": { ... },
      "linux-arm64": { ... },
      "win32-x64": { ... }
    }
  },
  "typst": {
    "version": "0.12.0",
    "platforms": { ... }
  }
}
```

### 4. Runtime Binary Download

When a user triggers an export, the plugin downloads the required binary if not already installed.

**File:** `src/core/tools/BinaryManager.ts`

**Download Flow:**
1. Check if binary is already installed and up-to-date
2. Fetch `tools-manifest.json` from the current release
3. Detect user's platform (`darwin-arm64`, `linux-x64`, etc.)
4. Download the gzipped binary for that platform
5. Decompress and verify SHA-256 checksum
6. Install to plugin directory: `.obsidian/plugins/lighthouse/bin/`
7. Make executable (`chmod 0o755` on Unix)
8. Update `installed.json` with version metadata

**Platform Detection:**
```typescript
function currentPlatformKey(): string | null {
  const p = process.platform // 'darwin' | 'linux' | 'win32'
  const a = process.arch     // 'x64' | 'arm64'

  if (p === 'darwin' && (a === 'x64' || a === 'arm64')) return `${p}-${a}`
  if (p === 'linux' && (a === 'x64' || a === 'arm64')) return `${p}-${a}`
  if (p === 'win32' && a === 'x64') return `${p}-${a}`

  return null // Unsupported platform
}
```

## Release Assets

Each plugin release includes:

### Plugin Files (3 files)
- `main.js` - Bundled plugin code
- `manifest.json` - Plugin metadata
- `styles.css` - Plugin styles

### Binary Archives (10 files)
- `pandoc-darwin-arm64.gz` (Pandoc for macOS Apple Silicon)
- `pandoc-darwin-x64.gz` (Pandoc for macOS Intel)
- `pandoc-linux-x64.gz` (Pandoc for Linux x86_64)
- `pandoc-linux-arm64.gz` (Pandoc for Linux ARM64)
- `pandoc-win32-x64.gz` (Pandoc for Windows 64-bit)
- `typst-darwin-arm64.gz` (Typst for macOS Apple Silicon)
- `typst-darwin-x64.gz` (Typst for macOS Intel)
- `typst-linux-x64.gz` (Typst for Linux x86_64)
- `typst-linux-arm64.gz` (Typst for Linux ARM64)
- `typst-win32-x64.gz` (Typst for Windows 64-bit)

### Manifest (1 file)
- `tools-manifest.json` - Download registry with URLs, hashes, and sizes

**Total:** 14 files per release

## Binary Versions

The current release bundles:
- **Pandoc 3.6.4** - Universal document converter
- **Typst 0.12.0** - Modern typesetting system for PDF generation

To update binary versions, modify the release workflow:

```yaml
env:
  PANDOC_VER: '3.6.4'  # Update here
  TYPST_VER: '0.12.0'  # Update here
```

## Fallback Strategy

If a version-specific manifest is not available (e.g., during development or for older releases), the plugin falls back to the `tools-v1` release:

```
https://github.com/owner/repo/releases/download/tools-v1/tools-manifest.json
```

This fallback release contains manually curated binaries and is maintained separately.

## Security

### Integrity Verification

Every binary is verified using SHA-256 checksums:

1. During release build, checksums are computed from decompressed binaries
2. Checksums are stored in `tools-manifest.json`
3. At runtime, downloaded binaries are verified before installation
4. Download is rejected if checksum doesn't match

### HTTPS Downloads

All downloads use HTTPS from GitHub's CDN:
```
https://github.com/owner/repo/releases/download/<version>/<file>
```

GitHub handles caching, rate limiting, and CDN distribution.

## Development Workflow

### Local Binary Installation

For development, use the bootstrap script to download binaries:

```bash
npm run bootstrap-tools
```

This downloads and installs Pandoc and Typst locally without requiring a full release.

### Testing Binary Downloads

To test the download system:

1. Build the plugin with a test version
2. Create a draft GitHub release with binaries
3. Point the plugin to the draft release
4. Test downloads on different platforms

### Manual Manifest Generation

To manually generate a manifest:

```bash
node scripts/generate-manifest.js 1.1.0 https://github.com/owner/repo/releases/download/1.1.0
```

## File Size Considerations

### Gzipped Binaries
- Pandoc: ~50-180 MB per platform (gzipped)
- Typst: ~10-35 MB per platform (gzipped)

### Total release size
- Plugin files: ~200 KB
- All binaries: ~500-800 MB (10 archives)
- Manifest: ~2 KB

**Note:** GitHub's Actions artifact size limit is 2 GB per run, well within our needs.

## Troubleshooting

### Binary Download Failures

If binary downloads fail:

1. Check network connectivity
2. Verify the release exists and contains the binaries
3. Check the manifest URL is correct
4. Verify platform detection works correctly

**Debug logs:**
```typescript
console.log('Platform:', process.platform, process.arch)
console.log('Manifest URL:', getToolsManifestUrl())
```

### Checksum Verification Failures

If checksum verification fails:

1. Re-download the binary (may have been corrupted)
2. Verify the manifest contains correct checksums
3. Check if the binary version in the release matches the manifest version

### Unsupported Platforms

For unsupported platforms (e.g., Linux ARM32, Windows ARM):

1. The plugin will detect the platform is unsupported
2. Show an error message to the user
3. User must manually install Pandoc/Typst system-wide
4. Plugin can still use system-installed binaries

## Future Improvements

Potential enhancements:

1. **Incremental updates** - Only download changed binaries
2. **Compression** - Use better compression (xz, brotli)
3. **Delta updates** - Binary diffs between versions
4. **Mirror CDN** - Fallback download sources
5. **Platform detection** - Better ARM detection
6. **Offline mode** - Bundle binaries with plugin download

## Contributing

When adding support for new platforms:

1. Update `currentPlatformKey()` in `ToolsManifest.ts`
2. Add platform to release workflow download steps
3. Update `PLATFORMS` in `generate-manifest.js`
4. Test binary downloads on the new platform
5. Update documentation

## License

Binaries are downloaded from upstream projects and retain their original licenses:

- **Pandoc:** GPL-2.0+ (https://github.com/jgm/pandoc)
- **Typst:** Apache-2.0 (https://github.com/typst/typst)

Lighthouse does not modify these binaries, only redistributes them for convenience.
