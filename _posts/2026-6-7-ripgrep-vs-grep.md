---
title: "ripgrep (rg) vs grep"
date: 2026-6-7 09:00:00 +0700
categories: [TIL, tools]
tags: [sharing, linux]
comments: false
---

<h3 id="What is ripgrep?" style="font-weight: bold;"> What is ripgrep?</h3>


`ripgrep` is a line-oriented search tool written in Rust, built to do the same job as `grep` but faster and with better defaults for working inside a codebase.


```text
rg -i -n "TODO" ./
```

That's it. No flags needed to search recursively (if using grep, we need to explicit the -r flag), and it already skips the stuff you almost never want to search.

<h3 id="The main differences" style="font-weight: bold;">The main differences</h3>


**1. Recursive by default**

With `grep` you need `-r` to search a whole directory:

```text
grep -r "TODO" .
```

With `rg`, recursive is the default behavior:

```text
rg "TODO"
```

**2. Follow .gitignore rule automatically**

`grep -r` will search inside `node_modules`, `.git`, build artifacts, everything. `rg` reads your `.gitignore` (and `.ignore`) files and skips all of that automatically:

```text
rg "TODO"          # skips node_modules, .git, dist, etc.
grep -r "TODO" .    # searches everything, including junk
```

If you actually want to search ignored files too, you can force it:

```text
rg -uu "TODO"
```

**3. Speed**

`rg` is built on Rust's regex engine with automatic parallelism and smart filtering (skipping binary files, ignored files, etc.), so on large repos it's much more faster than a plain `grep -r`.

**4. Better output by default**

Line numbers, colored matches, and grouping by file all come out of the box with `rg`:

```text
rg "TODO"
src/main.rs
12: // TODO: handle error case
45: // TODO: refactor this later
```

With `grep` you'd need to add `-n` and `--color` yourself.

<h3 id="Quick install" style="font-weight: bold;">Quick install</h3>

```text
# debian/ubuntu
sudo apt install ripgrep
```


