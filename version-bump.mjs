import { readFileSync, writeFileSync } from 'fs'

/* global process */
const targetVersion = process.env.npm_package_version

// Read minAppVersion from manifest.json
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
const { minAppVersion } = manifest
manifest.version = targetVersion
writeFileSync('manifest.json', JSON.stringify(manifest, null, 2))

// Update versions.json
let versions = JSON.parse(readFileSync('versions.json', 'utf8'))
versions[targetVersion] = minAppVersion
writeFileSync('versions.json', JSON.stringify(versions, null, 2))
