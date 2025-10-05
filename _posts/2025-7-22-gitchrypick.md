---
title: Git Cherry-Pick
date: 2025-07-22 10:20:52 +0700
categories: [XXX, git]
tags: [git, sharing]
---
## What is it?

Cherry-pick takes a commit from another branch and creates a new commit with the same changes on your current branch. It's like copy-pasting commits selectively.

## Basic Usage

```bash
# Pick a single commit
git cherry-pick <commit-hash>

# Pick multiple commits
git cherry-pick commit1 commit2 commit3

# Pick a range of commits
git cherry-pick start-commit..end-commit
```

## Common Use Cases

### 1. Apply hotfix to multiple branches
```bash
git checkout main
git cherry-pick hotfix-commit-hash
```

### 2. Backport features to older releases
```bash
git checkout release-v1.0
git cherry-pick new-feature-commit
```

### 3. Select specific commits from a feature branch
```bash
git checkout main
git cherry-pick feature-branch~2  # Pick specific commit
```

## Useful Flags

```bash
# Add reference to original commit
git cherry-pick -x <commit-hash>

# Don't auto-commit (stage changes only)
git cherry-pick -n <commit-hash>

# Edit commit message
git cherry-pick -e <commit-hash>
```

## Quick Example

Say you have this structure:
```
main:     A---B---C
               \
feature:        D---E---F
```

To apply only commit `E` to main:
```bash
git checkout main
git log --oneline feature  # Find commit hash
git cherry-pick e4d5c6b    # Apply specific commit
```

Result:
```
main:     A---B---C---E'
               \
feature:        D---E---F
```

## Key Points
- Creates **new commits** with different hashes
- **Non-destructive** - original commits stay intact
- Use `-x` flag to track where commits came from
- Best for selective commits, not entire branches

Perfect for hotfixes, backporting, and selective feature integration!
