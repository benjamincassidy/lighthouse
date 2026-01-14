#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Get version from command line argument
const version = process.argv[2]

if (!version) {
  console.error('❌ Error: Version argument required')
  console.error('Usage: npm run release <version>')
  console.error('Example: npm run release 1.0.0')
  process.exit(1)
}

// Validate semantic versioning format
if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
  console.error('❌ Error: Invalid version format')
  console.error('Use semantic versioning: major.minor.patch (e.g., 1.0.0, 0.9.3, 1.0.0-beta.1)')
  process.exit(1)
}

console.log(`🚀 Preparing release ${version}...\n`)

/**
 * Get conventional commits since last version
 */
function getConventionalCommits(since) {
  try {
    const commits = execSync(`git log ${since}..HEAD --pretty=format:"%s" --no-merges`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
    })
      .split('\n')
      .filter(Boolean)

    const changes = {
      feat: [],
      fix: [],
      docs: [],
      style: [],
      refactor: [],
      perf: [],
      test: [],
      chore: [],
      breaking: [],
    }

    commits.forEach((commit) => {
      const match = commit.match(/^(\w+)(\(.*?\))?(!)?:\s*(.+)$/)
      if (match) {
        const [, type, , breaking, message] = match
        if (breaking) {
          changes.breaking.push(message)
        } else if (changes[type]) {
          changes[type].push(message)
        }
      }
    })

    return changes
  } catch {
    return null
  }
}

/**
 * Update CHANGELOG.md with new version
 */
function updateChangelog(version, oldVersion) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md')
  let changelog = fs.readFileSync(changelogPath, 'utf8')

  // Check if version already exists
  if (changelog.includes(`## [${version}]`)) {
    console.log('   Version already exists in CHANGELOG.md')
    return
  }

  // Get commits since last version
  const changes = getConventionalCommits(oldVersion)

  // Format today's date
  const today = new Date().toISOString().split('T')[0]

  // Build changelog entry
  let entry = `\n## [${version}] - ${today}\n`

  if (changes && Object.values(changes).some((arr) => arr.length > 0)) {
    // Generate from conventional commits
    if (changes.breaking.length > 0) {
      entry += '\n### ⚠️ Breaking Changes\n'
      changes.breaking.forEach((msg) => (entry += `- ${msg}\n`))
    }
    if (changes.feat.length > 0) {
      entry += '\n### Added\n'
      changes.feat.forEach((msg) => (entry += `- ${msg}\n`))
    }
    if (changes.fix.length > 0) {
      entry += '\n### Fixed\n'
      changes.fix.forEach((msg) => (entry += `- ${msg}\n`))
    }
    if (changes.refactor.length > 0 || changes.perf.length > 0) {
      entry += '\n### Changed\n'
      changes.refactor.forEach((msg) => (entry += `- ${msg}\n`))
      changes.perf.forEach((msg) => (entry += `- ${msg}\n`))
    }
    if (changes.docs.length > 0) {
      entry += '\n### Documentation\n'
      changes.docs.forEach((msg) => (entry += `- ${msg}\n`))
    }
  } else {
    // Create skeleton if no conventional commits found
    entry += `
### Added
- Feature 1
- Feature 2

### Fixed
- Bug fix 1

### Changed
- Change 1
`
  }

  // Insert after [Unreleased] section
  const unreleasedIndex = changelog.indexOf('## [Unreleased]')
  if (unreleasedIndex !== -1) {
    const insertIndex = changelog.indexOf('\n', unreleasedIndex + 15) + 1
    changelog = changelog.slice(0, insertIndex) + entry + changelog.slice(insertIndex)
  } else {
    // Insert at the beginning if no Unreleased section
    const firstVersionIndex = changelog.indexOf('## [')
    if (firstVersionIndex !== -1) {
      changelog =
        changelog.slice(0, firstVersionIndex) + entry + '\n' + changelog.slice(firstVersionIndex)
    }
  }

  // Update comparison links at bottom
  const repo = 'benjamincassidy/obsidian-lighthouse'
  const linkPattern = new RegExp(
    `\\[Unreleased\\]: https://github.com/${repo}/compare/(.+?)\\.\\.\\.HEAD`,
  )
  const match = changelog.match(linkPattern)

  if (match) {
    // Update existing links
    const lastVersion = match[1]
    changelog = changelog.replace(
      linkPattern,
      `[Unreleased]: https://github.com/${repo}/compare/${version}...HEAD`,
    )

    // Add new version link
    const newLink = `[${version}]: https://github.com/${repo}/compare/${lastVersion}...${version}`
    if (!changelog.includes(newLink)) {
      const lastLinkIndex = changelog.lastIndexOf(`[${lastVersion}]:`)
      if (lastLinkIndex !== -1) {
        const lineEnd = changelog.indexOf('\n', lastLinkIndex)
        changelog = changelog.slice(0, lineEnd + 1) + newLink + '\n' + changelog.slice(lineEnd + 1)
      } else {
        // Append at the end
        changelog += `\n${newLink}`
      }
    }
  } else {
    // Add links section if it doesn't exist
    changelog += `\n[Unreleased]: https://github.com/${repo}/compare/${version}...HEAD\n`
    changelog += `[${version}]: https://github.com/${repo}/releases/tag/${version}\n`
  }

  fs.writeFileSync(changelogPath, changelog)
}

try {
  // Update manifest.json
  console.log('📝 Updating manifest.json...')
  const manifestPath = path.join(__dirname, '..', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const oldVersion = manifest.version
  manifest.version = version
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`   ${oldVersion} → ${version}`)

  // Update package.json
  console.log('📝 Updating package.json...')
  const packagePath = path.join(__dirname, '..', 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  packageJson.version = version
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log(`   ${oldVersion} → ${version}`)

  // Update versions.json
  console.log('📝 Updating versions.json...')
  const versionsPath = path.join(__dirname, '..', 'versions.json')
  const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'))
  versions[version] = manifest.minAppVersion
  fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2) + '\n')
  console.log(`   Added ${version}: ${manifest.minAppVersion}`)

  // Update CHANGELOG.md
  console.log('📝 Updating CHANGELOG.md...')
  updateChangelog(version, oldVersion)
  console.log('   Generated changelog entry for ' + version)
  console.log('   ⚠️  Please review and edit CHANGELOG.md to add details!')

  // Run npm install to update package-lock.json
  console.log('\n📦 Running npm install --legacy-peer-deps...')
  execSync('npm install --legacy-peer-deps', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  })

  // Success message
  console.log('\n✅ Version bumped to ' + version)
  console.log('\n📋 Next steps:')
  console.log('  1. Review and edit CHANGELOG.md with detailed release notes')
  console.log('  2. Review all changes:')
  console.log('     git diff')
  console.log('  3. Commit the changes:')
  console.log(
    '     git add manifest.json package.json versions.json package-lock.json CHANGELOG.md',
  )
  console.log(`     git commit -m "chore: bump version to ${version}"`)
  console.log('  4. Push to main to trigger release:')
  console.log('     git push origin main')
  console.log('\n🎉 The GitHub Action will automatically create the release!')
} catch (error) {
  console.error('\n❌ Error during release preparation:')
  console.error(error.message)
  process.exit(1)
}
