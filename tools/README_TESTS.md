# Test Suite Documentation

This directory contains unit tests for the changed files in the pull request.

## Test Files

### 1. test_posts.py
Tests for blog post validation (_posts/*.md files)

**What it tests:**
- YAML frontmatter structure and completeness
- Required fields: layout, title, date, categories, tags
- Date format validation (YYYY-MM-DD HH:MM:SS +ZZZZ)
- Title presence and non-emptiness
- Content existence beyond frontmatter
- Code block balance (matching ``` markers)
- Header formatting (space after #)
- Filename format (YYYY-MM-DD-title.md)

**Tested files:**
- _posts/2025-9-15-Linux-usermod.md
- _posts/2025-9-20-Poetry.md

**Run tests:**
```bash
python3 tools/test_posts.py
```

**Test coverage:** 16 tests (8 per blog post)

### 2. test_install.py
Tests for the installation script (tools/install.sh)

**What it tests:**
- Basic file structure (shebang, syntax, line endings)
- Command presence and correctness
  - apt update and install with required packages
  - rbenv and ruby-build cloning
  - PATH and init configuration
  - Ruby version installation
  - Bundler installation
- Script quality
  - Non-interactive install (-y flag)
  - Version consistency
  - Logical command ordering

**Tested files:**
- tools/install.sh

**Run tests:**
```bash
python3 tools/test_install.py
```

**Test coverage:** 21 tests

## Running All Tests

To run all tests together:
```bash
python3 tools/test_posts.py && python3 tools/test_install.py
```

Or use a simple loop:
```bash
for test in tools/test_*.py; do python3 "$test"; done
```

## Test Results

Current status: **All tests passing** ✓

- Blog post tests: 16/16 passed
- Install script tests: 21/21 passed
- **Total: 37/37 tests passed**

## Requirements

- Python 3.6+
- Standard library only (no external dependencies)

## Test Design

Tests are **unit tests** that validate:
- Static content structure (blog posts)
- Script logic and command structure (install.sh)

Tests do NOT:
- Execute the installation script
- Require Jekyll or Ruby to be installed
- Make network requests
- Modify the filesystem

This ensures fast, safe, and portable test execution.