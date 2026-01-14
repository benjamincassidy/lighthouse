# Release Process

This document describes how to create a new release of Lighthouse.

## Automated Release Workflow

The plugin uses GitHub Actions to automate the release process. When you push a version tag, it will:

1. ✅ Run linter and tests
2. 🔨 Build the plugin
3. ✔️ Verify version consistency across files
4. 📝 Extract release notes from CHANGELOG.md
5. 🚀 Create a GitHub release
6. 📦 Attach `main.js`, `manifest.json`, and `styles.css`
7. 🏷️ Automatically mark `0.x` versions as pre-release

## Pre-Release Checklist

Before creating a release, ensure:

- [ ] All changes committed and pushed to `main`
- [ ] Tests passing: `npm test`
- [ ] Linter passing: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] Version updated in:
  - [ ] `manifest.json`
  - [ ] `package.json`
  - [ ] `versions.json`
- [ ] `CHANGELOG.md` updated with:
  - [ ] New version header `## [X.Y.Z] - YYYY-MM-DD`
  - [ ] All changes documented
  - [ ] Comparison link at bottom
- [ ] Documentation up to date
- [ ] README.md reflects current features

## Creating a Release

### 1. Update Version Numbers

Update these files to the new version number:

```bash
# Example: Releasing version 0.9.0
# manifest.json
{
  "version": "0.9.0",
  ...
}

# package.json
{
  "version": "0.9.0",
  ...
}

# versions.json
{
  "0.9.0": "1.4.0"
}
```

### 2. Update CHANGELOG.md

Add a new version section:

```markdown
## [0.9.0] - 2026-01-14

### Added
- New feature 1
- New feature 2

### Fixed
- Bug fix 1

### Changed
- Change 1
```

Add comparison link at bottom:

```markdown
[0.9.0]: https://github.com/benjamincassidy/obsidian-lighthouse/releases/tag/0.9.0
```

### 3. Commit Changes

```bash
git add manifest.json package.json versions.json CHANGELOG.md
git commit -m "chore: bump version to 0.9.0"
git push origin main
```

### 4. Create and Push Tag

```bash
# Create a tag with the version number
git tag 0.9.0

# Or with a message
git tag -a 0.9.0 -m "Release version 0.9.0"

# Push the tag to trigger the release workflow
git push origin 0.9.0
```

**Note:** Tags can be formatted as `0.9.0` or `v0.9.0` - the workflow handles both.

### 5. Monitor the Release

1. Go to GitHub Actions: `https://github.com/benjamincassidy/obsidian-lighthouse/actions`
2. Watch the "Release" workflow run
3. If successful, a new release will appear at: `https://github.com/benjamincassidy/obsidian-lighthouse/releases`

## Version Verification

The workflow automatically verifies:

- ✅ `manifest.json` version matches the tag
- ⚠️ `package.json` version matches the tag (warning only)
- ✅ `versions.json` includes the new version

If versions don't match, the workflow will fail before creating a release.

## Pre-release vs. Stable

The workflow automatically determines release type:

- **Pre-release:** Versions starting with `0.` or containing `alpha`/`beta`
- **Stable:** Version `1.0.0` and above

Pre-releases are marked as such on GitHub and won't show up as the "latest" release.

## Troubleshooting

### Build Failed

Check the GitHub Actions logs for errors. Common issues:
- Linting errors: Fix with `npm run lint`
- Test failures: Fix with `npm test`
- Build errors: Fix with `npm run build`

### Version Mismatch

If versions don't match:
1. Delete the tag: `git tag -d 0.9.0 && git push origin :refs/tags/0.9.0`
2. Update version numbers in all files
3. Commit and push changes
4. Create and push the tag again

### Missing Files

If `main.js` or `styles.css` are missing:
- Run `npm run build` locally to verify they're created
- Check `.gitignore` doesn't exclude them from the release
- Ensure build step in workflow completed successfully

## Rollback

To rollback a release:

1. Delete the GitHub release (if already published)
2. Delete the tag:
   ```bash
   git tag -d 0.9.0
   git push origin :refs/tags/0.9.0
   ```
3. Fix issues and create a new release

## Manual Release (Fallback)

If the automated workflow fails, you can create a manual release:

1. Build locally: `npm run build`
2. Go to: `https://github.com/benjamincassidy/obsidian-lighthouse/releases/new`
3. Create new tag (e.g., `0.9.0`)
4. Fill in release title and notes
5. Upload `main.js`, `manifest.json`, and `styles.css`
6. Mark as pre-release if applicable
7. Publish release

## First Release Special Notes

For the first `0.9.0` release:

- ✅ All core features implemented
- ✅ Documentation complete
- ✅ Tests passing (95% coverage)
- ✅ Obsidian plugin policies followed
- 🏷️ Will be marked as pre-release (0.x version)
- 📣 Ready for alpha testing

After release, users can manually install by:
1. Downloading `main.js`, `manifest.json`, and `styles.css`
2. Creating `.obsidian/plugins/lighthouse/` in their vault
3. Placing files in that folder
4. Enabling the plugin in Obsidian settings

## After Release

1. ✅ Test the release by manually installing in a test vault
2. 📣 Announce on:
   - GitHub Discussions
   - Reddit r/ObsidianMD (if appropriate)
   - Discord (if applicable)
3. 🐛 Monitor for bug reports
4. 📝 Plan next release based on feedback
