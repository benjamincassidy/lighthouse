# Release Process

This document describes how to create a new release of Lighthouse.

## Automated Release Workflow

The plugin uses GitHub Actions to automate the release process. **Releases are triggered automatically when you merge version changes to `main`.**

### How It Works

When you merge a PR to `main` that changes `manifest.json` or `package.json` version:

1. ✅ Workflow checks if version changed from latest release
2. ✅ Runs linter and full test suite
3. 🔨 Builds the plugin
4. ✔️ Verifies version consistency between files
5. 📝 Extracts release notes from CHANGELOG.md
6. 🚀 Creates a GitHub release with the version as tag
7. 📦 Attaches `main.js`, `manifest.json`, and `styles.css`

**No manual tagging needed!** Just update the version and merge to main.

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

**Option A: Use the Release Script (Recommended)**

```bash
# Automatically updates all version files
npm run release 1.0.0
```

This script:
- Updates `manifest.json`, `package.json`, `versions.json`
- Regenerates `package-lock.json` with the new version
- Shows you the next steps

See [scripts/README.md](scripts/README.md) for full documentation.

**Option B: Manual Update**

Update these files to the new version number:

```bash
# Example: Releasing version 1.0.0
# manifest.json
{
  "version": "1.0.0",
  ...
}

# package.json
{
  "version": "1.0.0",
  ...
}

# versions.json
{
  "1.0.0": "1.4.0"
}
```

Then run:
```bash
npm install --legacy-peer-deps
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

### 3. Commit and Create PR

```bash
git add manifest.json package.json versions.json CHANGELOG.md
git commit -m "chore: bump version to 0.9.1"
git push origin main

# Or create a PR if you use branches
git checkout -b release-0.9.1
git add manifest.json package.json versions.json CHANGELOG.md
git commit -m "chore: bump version to 0.9.1"
git push origin release-0.9.1
gh pr create --title "Release 0.9.1" --body "See CHANGELOG.md for details"
```

### 4. Merge to Main

Once the PR is merged to `main`, the workflow will automatically:
- Detect the version change
- Run all quality checks
- Create the release with tag `0.9.1`
- Upload all required files

### 5. Monitor the Release

1. Go to GitHub Actions: `https://github.com/benjamincassidy/obsidian-lighthouse/actions`
2. Watch the "Release" workflow run
3. If successful, a new release will appear at: `https://github.com/benjamincassidy/obsidian-lighthouse/releases`

**That's it!** No manual tagging or release creation needed.

## Version Verification

The workflow automatically vis different from latest release
- ⚠️ `package.json` version matches `manifest.json` (warning only)
- ✅ `versions.json` includes the new version

If the version hasn't changed, the workflow skips

If versions don't match, the workflow will fail before creating a release.

## Release Type

All releases are published as **stable releases** (not pre-release), regardless of version number.

For alpha/beta testing, use clear version naming:
- `0.9.0-alpha.1` - Alpha releases
- `0.9.0-beta.1` - Beta releases
- `0.9.0` - Stable releases

## Troubleshooting

### Build Failed

Check the GitHub Actions logs for errors. Common issues:
- Linting errors: Fix with `npm run lint`
- Test failures: Fix with `npm test`
- Build errors: Fix with `npm run build`

### Version Didn't Create Release

If you merged a version change but no release was created:
1. Check GitHub Actions for errors
2. Verify the version in `manifest.json` is different from the latest release
3. Ensure the workflow file has `permissions: contents: write`

### Missing Files

If `main.js` or `styles.css` are missing:
- Run `npm run build` locally to verify they're created
- Check `.gitignore` doesn't exclude them from the release
- Ensure build step in workflow completed successfully

## Rollback

To rollback a release:

1. Delete the GitHub release (if already published)
2. Delete the tag:n GitHub UI or via CLI)
2. Delete the tag:
   ```bash
   git push origin :refs/tags/0.9.0
   ```
3. Revert the version bump commit on main
4. Fix issues and create a new release with a new version
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
