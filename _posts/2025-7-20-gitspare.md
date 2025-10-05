---
title: Git sparse-checkout
date: 2025-07-20 10:20:52 +0700
categories: [XXX, git]
tags: [git, sharing]
---

<h3 id="introduction" style="font-weight: bold;">Introduction</h3>
When working with large repositories, you often don't need the entire codebase locally. Maybe you're only interested in a specific subdirectory, or you're working on a monorepo where different teams manage different folders. Git's sparse-checkout feature allows you to selectively check out only the files and directories you need, saving disk space and reducing clone times.

---

<h3 id="what-is-sparse-checkout" style="font-weight: bold;">What is Sparse-Checkout?</h3>
Git sparse-checkout is a feature that allows you to have a working directory that contains only a subset of the files from your repository. Instead of checking out all files, you can specify patterns to include or exclude specific directories and files.

**Benefits:**
- **Reduced disk usage**: Only download and store the files you need
- **Faster operations**: Git commands work faster on smaller working directories
- **Focused development**: Avoid distractions from unrelated code
- **Better for large monorepos**: Work with specific components without the entire repository

---

<h3 id="basic-sparse-checkout" style="font-weight: bold;">Basic Sparse-Checkout Setup</h3>

Here's how to clone a repository and check out only specific subdirectories:

<h4 id="method-1-clone-and-configure" style="font-weight: bold;">Method 1: Clone and Configure</h4>

**Step 1: Clone the repository (without checking out files)**
```bash
git clone --no-checkout https://github.com/user/large-repo.git
cd large-repo
```

**Step 2: Enable sparse-checkout**
```bash
git config core.sparseCheckout true
```

**Step 3: Define what you want to include**
```bash
# Create sparse-checkout file with patterns
echo "path/to/subfolder/*" > .git/info/sparse-checkout
echo "another/important/directory/*" >> .git/info/sparse-checkout
echo "important-file.txt" >> .git/info/sparse-checkout
```

**Step 4: Check out the files**
```bash
git checkout main  # or whatever branch you want
```

<h4 id="method-2-modern-sparse-checkout" style="font-weight: bold;">Method 2: Using Modern Git (v2.25+)</h4>

**Step 1: Clone with sparse-checkout enabled**
```bash
git clone --filter=blob:none --sparse https://github.com/user/large-repo.git
cd large-repo
```

**Step 2: Set sparse-checkout patterns**
```bash
git sparse-checkout init --cone
git sparse-checkout set path/to/subfolder another/important/directory
```

---

<h3 id="practical-examples" style="font-weight: bold;">Practical Examples</h3>

<h4 id="example-1-android-source" style="font-weight: bold;">Example 1: Android AOSP - Only Framework</h4>
```bash
# Clone Android source but only get the framework directory
git clone --filter=blob:none --sparse https://android.googlesource.com/platform/frameworks/base
cd base
git sparse-checkout init --cone
git sparse-checkout set core services
```

<h4 id="example-2-linux-kernel" style="font-weight: bold;">Example 2: Linux Kernel - Specific Architecture</h4>
```bash
# Clone Linux kernel but only ARM architecture files
git clone --filter=blob:none --sparse https://github.com/torvalds/linux.git
cd linux
git sparse-checkout init --cone
git sparse-checkout set arch/arm drivers/gpio include/linux
```

---

<h3 id="sparse-checkout-patterns" style="font-weight: bold;">Sparse-Checkout Patterns</h3>

<h4 id="cone-vs-non-cone" style="font-weight: bold;">Cone vs Non-Cone Mode</h4>

**Cone Mode (Recommended - Git 2.25+):**
```bash
git sparse-checkout init --cone
git sparse-checkout set src docs tools
```
- Simpler syntax
- Better performance
- Only works with directory paths

**Non-Cone Mode (Legacy):**
```bash
# Manually edit .git/info/sparse-checkout
echo "src/*" > .git/info/sparse-checkout
echo "docs/*.md" >> .git/info/sparse-checkout
echo "!src/temp/*" >> .git/info/sparse-checkout
```

---

**Partial Clone Filters:**
- `--filter=blob:none`: Skip all blobs (file contents)
- `--filter=blob:limit=1k`: Skip blobs larger than 1KB
- `--filter=tree:0`: Skip all trees (directory listings)

---

<h3 id="real-world-scenarios" style="font-weight: bold;">Real-World Scenarios</h3>

<h4 id="scenario-1-documentation-only" style="font-weight: bold;">Scenario 1: Documentation Writer</h4>
You only need documentation files from a large project:

```bash
git clone --filter=blob:none --sparse https://github.com/kubernetes/kubernetes.git
cd kubernetes
git sparse-checkout init --cone
git sparse-checkout set docs api/openapi-spec
```

---


---

<h3 id="performance-comparison" style="font-weight: bold;">Performance Comparison</h3>

Here's what you can expect with sparse-checkout on a large repository:

| Operation | Full Clone | Sparse-Checkout | Savings |
|-----------|------------|-----------------|---------|
| Clone time | 10 minutes | 2 minutes | 80% |
| Disk usage | 2.5 GB | 500 MB | 80% |
| Git status | 3 seconds | 0.5 seconds | 83% |

---

<h3 id="conclusion" style="font-weight: bold;">Conclusion</h3>

Git sparse-checkout is a powerful feature for working with large repositories efficiently. By selectively checking out only the files and directories you need, you can:

- **Save disk space and bandwidth**
- **Focus on relevant code without distractions**
- **Work efficiently with monorepos and large projects**

**Key flag:**
- Use `--filter=blob:none --sparse` for maximum efficiency
- Prefer cone mode for simpler patterns and better performance
- Combine with partial clone for very large repositories

---
