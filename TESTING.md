# Lighthouse Testing Documentation

## Test Coverage Summary

Current test coverage: **95.08%**

| Module | Statements | Branch | Functions | Lines |
|--------|-----------|---------|-----------|-------|
| **Overall** | 95.08% | 87.4% | 96.29% | 94.88% |
| FolderManager | 93.93% | 83.33% | 95% | 93.93% |
| HierarchicalCounter | 90% | 61.11% | 100% | 90% |
| ProjectManager | 100% | 90% | 100% | 100% |
| ProjectStorage | 93.33% | 91.66% | 93.75% | 92.5% |
| WordCounter | 100% | 100% | 100% | 100% |
| stores | 100% | 100% | 100% | 100% |
| validation | 95.45% | 100% | 80% | 95.45% |

## Test Suites

### Core Module Tests (130 tests total)

#### ProjectManager Tests (20 tests)
- ✅ Project creation with validation
- ✅ Project updates
- ✅ Project deletion
- ✅ Active project management
- ✅ Project retrieval
- ✅ Store synchronization

#### WordCounter Tests (24 tests)
- ✅ Basic word counting
- ✅ Exclude code blocks option
- ✅ Exclude frontmatter option
- ✅ Multi-language support (English, French, German, Spanish)
- ✅ Edge cases (empty strings, only whitespace, only punctuation)
- ✅ Complex formatting (nested code blocks, inline code)

#### FolderManager Tests (33 tests)
- ✅ Folder validation
- ✅ Path normalization (slashes, backslashes, multiple slashes)
- ✅ Content/source folder designation
- ✅ Duplicate prevention
- ✅ Folder hierarchy operations
- ✅ Path resolution (relative/absolute)
- ✅ Get all folders in vault
- ✅ Get folders in specific path

#### HierarchicalCounter Tests (12 tests)
- ✅ File-level word counting
- ✅ Folder-level aggregation
- ✅ Project-level statistics
- ✅ Nested folder handling
- ✅ Content vs source folder distinction
- ✅ Hierarchical structure maintenance

#### Store Tests (23 tests)
- ✅ Project store operations
- ✅ Active project state management
- ✅ Store updates and synchronization

#### Validation Tests (17 tests)
- ✅ Project name validation
- ✅ Path validation
- ✅ Folder path validation
- ✅ Word count goal validation

#### Main Plugin Test (1 test)
- ✅ Basic plugin instantiation

## Edge Cases Tested

### Word Counting
- Empty documents
- Documents with only whitespace
- Documents with only punctuation
- Unicode and special characters
- Code blocks (inline and fenced)
- YAML frontmatter
- Mixed content types

### Folder Operations
- Non-existent folders
- Empty paths
- Malformed paths (multiple slashes, backslashes)
- Duplicate folder assignments
- Conflicting folder types (content vs source)
- Path normalization across platforms

### Project Management
- Projects with no folders
- Projects with invalid folders
- Deleting active project
- Switching between projects
- Empty project lists

## Performance Considerations

### Test Execution
- All 130 tests complete in ~280ms
- Unit tests are isolated and fast
- No external dependencies required

### Mocking Strategy
- Obsidian Vault API fully mocked
- File system operations mocked
- No actual file I/O in tests

## Known Uncovered Code

The following code paths are intentionally not covered (edge cases or error handling):

1. **FolderManager** (lines 27-28, 50, 130, 208, 213):
   - `folderExists()` adapter constructor check (line 27-28)
   - File vs folder distinction edge case (line 50)
   - Validation error paths (130, 208, 213)

2. **HierarchicalCounter** (lines 37-41, 47):
   - Active file detection edge cases
   - Error handling for corrupted files

3. **ProjectManager** (line 66):
   - Unreachable code path in delete operation

4. **ProjectStorage** (lines 34-35, 54):
   - Plugin data edge cases

5. **validation** (line 47):
   - Unused validation utility

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- FolderManager.test.ts
```

## Manual Testing Checklist

### UI Components
- [ ] Dashboard displays correctly
- [ ] Project switcher works
- [ ] Stats panel updates in real-time
- [ ] File explorer filters by project
- [ ] Project modal (create/edit) functions
- [ ] Settings tab displays all options

### Core Functionality
- [ ] Project creation and deletion
- [ ] Word counting accuracy
- [ ] Folder designation (content vs source)
- [ ] Project switching
- [ ] Zen mode toggle
- [ ] Session/today tracking persistence

### Edge Cases
- [ ] Large vaults (1000+ files)
- [ ] Projects with many folders (50+)
- [ ] Long documents (10,000+ words)
- [ ] Special characters in paths
- [ ] Corrupted settings recovery

### Cross-Platform
- [ ] macOS
- [ ] Windows
- [ ] Linux

## Future Testing Improvements

1. **Integration Tests**: Test full plugin lifecycle with real Obsidian instance
2. **Performance Tests**: Benchmark with large vault datasets
3. **UI Tests**: Automated Svelte component testing
4. **E2E Tests**: Full user workflow testing
5. **Mobile Testing**: Obsidian mobile compatibility

## Test Maintenance

- Tests are co-located with source files (`*.test.ts`)
- Keep tests focused and fast
- Update tests when changing functionality
- Maintain high coverage (>90%)
- Document complex test setups
