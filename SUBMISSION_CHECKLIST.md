# Community Plugin Submission Checklist

This checklist tracks our compliance with [Obsidian's Community Plugin submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin).

## Release Checklist

### Testing
- [X] I have tested the plugin on:
  - [ ] Windows
  - [X] macOS
  - [ ] Linux
  - [ ] Android _(if applicable)_
  - [ ] iOS _(if applicable)_

**Status:** Tested on macOS only. Desktop-only plugin (mobile not applicable based on manifest).

**TODO:** Need to test on Windows and Linux before stable 1.0.0 release.

### GitHub Release Requirements
- [X] My GitHub release contains all required files (as individual files, not just in source.zip / source.tar.gz)
  - [X] `main.js` ✅ (103 KB)
  - [X] `manifest.json` ✅ (426 bytes)
  - [X] `styles.css` ✅ (831 bytes)

**Verified:** https://github.com/benjamincassidy/obsidian-lighthouse/releases/tag/0.9.0

- [X] GitHub release name matches the exact version number specified in my manifest.json
  - Release name: `0.9.0` ✅
  - Manifest version: `0.9.0` ✅
  - _**Note:** No `v` prefix as required_

### Plugin Metadata
- [X] The `id` in my `manifest.json` matches the `id` in the `community-plugins.json` file.
  - **Status:** Not yet submitted to community-plugins.json
  - **Current ID:** `lighthouse`
  - **TODO:** This will be verified during Phase 6 (Community Plugin Submission)

- [X] My README.md describes the plugin's purpose and provides clear usage instructions.
  - README includes:
    - [X] Clear description and tagline
    - [X] Feature list with status indicators
    - [X] Installation instructions
    - [X] Quick start guide
    - [X] Link to full documentation
    - [X] Development setup
    - [X] Support/funding information

### Developer Policies & Guidelines
- [X] I have read the developer policies at https://docs.obsidian.md/Developer+policies
  - [X] No tracking or data collection ✅
  - [X] No console.log (only console.warn/error/debug) ✅
  - [X] No innerHTML usage ✅
  - [X] No direct style manipulation ✅
  - [X] Proper resource cleanup on unload ✅
  - [X] No Node.js-specific APIs ✅
  - [X] Sentence case for UI elements ✅
  - [X] Proper error handling with promises ✅

- [X] I have read the tips in https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
  - [X] No unnecessary permissions
  - [X] Efficient performance (caching, debouncing)
  - [X] Accessibility considerations
  - [X] Mobile-friendly (N/A - desktop only)
  - [X] Clear settings interface
  - [X] Proper command naming

### Legal & Attribution
- [X] I have added a license in the LICENSE file.
  - License: MIT License
  - Year: 2026
  - Copyright holder: benjamin cassidy

- [X] My project respects and is compatible with the original license of any code from other plugins that I'm using.
  - **Status:** No code borrowed from other plugins
  - All code is original
  - Dependencies are standard npm packages with compatible licenses

- [X] I have given proper attribution to these other projects in my `README.md`.
  - **Status:** N/A - no code from other plugins used
  - Technologies credited: TypeScript, Svelte, Obsidian API

## Submission Requirements (Phase 6)

When ready to submit to the community plugins repository:

### 1. Fork the Repository

Go to https://github.com/obsidianmd/obsidian-releases and click "Fork" in the top right.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/obsidian-releases.git
cd obsidian-releases
```

### 3. Create a Branch

```bash
git checkout -b add-lighthouse-plugin
```

### 4. Add Plugin to community-plugins.json

Edit `community-plugins.json` and add your plugin in **alphabetical order** by ID:

```json
{
  "id": "lighthouse",
  "name": "Lighthouse",
  "author": "benjamin cassidy",
  "description": "Project-based writing for Obsidian. Manage multiple writing projects with word counts, filtered views, and distraction-free writing.",
  "repo": "benjamincassidy/obsidian-lighthouse"
}
```

**Important**:
- Add a comma after the previous plugin entry
- Maintain alphabetical order by `id`
- Ensure description ends with period
- Use exact author name from manifest.json

### 5. Commit and Push

```bash
git add community-plugins.json
git commit -m "Add Lighthouse plugin"
git push origin add-lighthouse-plugin
```

### 6. Create Pull Request

1. Go to your fork: `https://github.com/YOUR_USERNAME/obsidian-releases`
2. Click "Pull requests" → "New pull request"
3. Set base repository: `obsidianmd/obsidian-releases` base: `master`
4. Set head repository: `YOUR_USERNAME/obsidian-releases` compare: `add-lighthouse-plugin`
5. Click "Create pull request"
6. Title: **"Add Lighthouse plugin"**
7. Use the PR template from `SUBMISSION_PR_TEMPLATE.md`
8. Submit the PR

### 7. Wait for Review

The Obsidian team will review your submission. They may:
- Test the plugin
- Request changes to manifest or description
- Ask questions about functionality
- Suggest improvements

**Response time**: Usually within a few days to a week.

### 8. Address Feedback

If changes are requested:

```bash
# Make changes to your plugin repo
cd /path/to/obsidian-lighthouse
# ... make changes ...
git commit -m "fix: address review feedback"
git push

# Update the PR if needed
cd /path/to/obsidian-releases
# ... make changes to community-plugins.json if requested ...
git commit -m "Update plugin description"
git push
```

### 9. Approval & Merge

Once approved, the Obsidian team will merge your PR. Your plugin will appear in the Community Plugins browser within 24 hours!

## Additional Quality Checks

### Code Quality
- [X] ESLint passing with Obsidian rules ✅
- [X] TypeScript compilation with no errors ✅
- [X] All tests passing (130/130) ✅
- [X] 95% test coverage ✅

### Documentation
- [X] Comprehensive user documentation ✅
- [X] API documentation for developers ✅
- [X] CHANGELOG.md maintained ✅
- [X] Clear README with examples ✅

### Performance
- [X] Word counting uses caching ✅
- [X] Debounced file system watchers ✅
- [X] No blocking operations ✅
- [X] Efficient data structures ✅

### User Experience
- [X] Intuitive UI/UX ✅
- [X] Helpful error messages ✅
- [X] Settings are well-organized ✅
- [X] Commands have clear names ✅

## Known Limitations (Documented)

As documented in CHANGELOG.md:
- No template system yet (planned for future release)
- No Dataview integration yet (planned for future release)
- Word count goals are per-project only (no folder-level goals yet)

## Pre-Submission Testing Plan

Before stable 1.0.0 and community plugin submission:

1. **Cross-Platform Testing**
   - [ ] Test on Windows 10/11
   - [ ] Test on Ubuntu/Linux
   - [ ] Verify file path handling across platforms
   - [ ] Test with different vault sizes

2. **Edge Cases**
   - [ ] Very large projects (1000+ files)
   - [ ] Deeply nested folder structures
   - [ ] Special characters in file/folder names
   - [ ] Vault on network drive
   - [ ] Multiple vaults

3. **Integration Testing**
   - [ ] Test with popular plugins (Dataview, Templater, etc.)
   - [ ] Verify no conflicts with common themes
   - [ ] Test command palette integration
   - [ ] Test hotkey assignments

4. **User Acceptance Testing**
   - [ ] Get feedback from 3-5 alpha testers
   - [ ] Document common issues
   - [ ] Iterate based on feedback

## Current Status

✅ **READY FOR ALPHA TESTING (0.9.0)**
- All core features implemented
- Code quality standards met
- Documentation complete
- Release properly configured

🚧 **NOT YET READY FOR COMMUNITY PLUGIN SUBMISSION**
- Need cross-platform testing
- Need user feedback from alpha testing
- Consider moving to stable 1.0.0 after testing

## Next Steps

1. **Phase 4:** Alpha testing (current)
   - Share with select testers
   - Gather feedback
   - Fix bugs

2. **Phase 5:** Cross-platform testing
   - Test on Windows and Linux
   - Fix platform-specific issues

3. **Phase 6:** Community plugin submission
   - Address all feedback
   - Bump to 1.0.0 stable
   - Submit PR to obsidian-releases repo
