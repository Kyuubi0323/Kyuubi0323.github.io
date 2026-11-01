---
title: Static Library vs Dynamic Library
date: 2026-8-20 08:00:00 +0700
categories: [Embedded Systems]
tags: [linux, compiler, c]
comments: false
---

When your program calls a function that lives in another file, the **linker** has to find it. Libraries are how we package reusable code, and there are two types: **static** (`.a`) and **dynamic/shared** (`.so`). This post covers how each is built, the difference between the two, and of course how it works.

---

<h3 id="overview" style="font-weight: bold;">Overview</h3>

| | Static (`.a`) | Dynamic (`.so`) |
|---|---|---|
| Windows equivalent | `.lib` | `.dll` |
| Linked at | build time | load time (or run time) |
| Code ends up | copied into the executable | shared, mapped from the `.so` file |
| Executable size | larger | smaller |
| Update a library | must relink the app | replace the `.so` (if ABI compatible) |
| Needs library on target | no | yes |

---

<h3 id="example" style="font-weight: bold;">Example</h3>

Examples to get a better understanding:

```c
/* mathlib.h */
int add(int a, int b);

/* mathlib.c */
#include "mathlib.h"
int add(int a, int b) { 
    return a + b;
}

/* main.c */
#include <stdio.h>
#include "mathlib.h"
int main(void) { 
    printf("%d\n", add(2, 3));
    return 0; 
}
```

---

<h3 id="static" style="font-weight: bold;">Static Library</h3>

A static library is just an **archive of object files** made by `ar`.

```bash
gcc -c mathlib.c -o mathlib.o
ar rcs libmath.a mathlib.o        # create archive, this only contain 1 .o file
gcc main.c -L. -lmath -o app_static
```

- `-L.` tells the linker where to search(. is the current directory), `-lmath` means `libmath.a` (or `.so`).
- The linker pulls only the object files that are actually referenced, and copies them into `app_static`. (hence the application would be bigger)
- The result is self-contained: no library needed at run time.

Inspect it:

```bash
$ ar t libmath.a          # list members
mathlib.o
$ nm libmath.a            # inspect symbols
mathlib.o:
0000000000000000 T add
```

---

<h3 id="dynamic" style="font-weight: bold;">Dynamic (Shared) Library</h3>

Shared objects must be built as **position-independent code** (`-fPIC`) so that they can be mapped at any address.

```bash
gcc -fPIC -c mathlib.c -o mathlib.o  #compile to object file
gcc -shared -o libmath.so mathlib.o  #link object into shared lib
gcc main.c -L. -lmath -o app_dynamic # build app with shared lib
```

The executable only stores a *reference* to `libmath.so`. At startup the **dynamic linker** (`ld-linux.so`) finds and maps it:

```bash
$ ./app_dynamic
error while loading shared libraries: libmath.so: cannot open shared object file

$ LD_LIBRARY_PATH=. ./app_dynamic     # works
5
```

Ways to tell the loader where to look:

- `LD_LIBRARY_PATH` - quick, for development only.
- `-Wl,-rpath,'$ORIGIN'` - bake a search path into the binary.
- Install into `/usr/lib` or `/usr/local/lib` and run `sudo ldconfig`.

Inspect it:

```bash
ldd app_dynamic                 # which .so files it needs
readelf -d app_dynamic | grep NEEDED
nm -D libmath.so                # exported symbols
```

---

<h3 id="soname" style="font-weight: bold;">Versioning and soname</h3>

Convention for shared libraries use a symlink chain:

```
libmath.so        -> libmath.so.1        (used by the linker at build time)
libmath.so.1      -> libmath.so.1.0.0    (soname, used by the loader at run time)
libmath.so.1.0.0                         (the real file)
```

```bash
gcc -shared -Wl,-soname,libmath.so.1 -o libmath.so.1.0.0 mathlib.o
```

Bump the **major** number when the ABI breaks; apps built against `.so.1` keep using `.so.1` while `.so.2` is installed side by side.

---


<h3 id="dlopen" style="font-weight: bold;">Loading at Run Time with dlopen</h3>

Dynamic libraries can also be loaded on demand, which is how plugins work:

```c
#include <dlfcn.h>
#include <stdio.h>

int main(void) {
    void *h = dlopen("./libmath.so", RTLD_NOW);
    if (!h) { fprintf(stderr, "%s\n", dlerror()); return 1; }

    int (*add)(int, int) = dlsym(h, "add");
    printf("%d\n", add(2, 3));

    dlclose(h);
    return 0;
}
```

```bash
gcc plugin.c -ldl -o plugin      # -ldl not needed on glibc >= 2.34
```

---

<h3 id="update" style="font-weight: bold;">Changing the Library: Rebuild vs Replace</h3>

The real difference shows up when the library implementation changes. Build the same `main.c` both ways, keeping the libraries in separate folders:

```bash
mkdir -p s d
gcc -fPIC -c mathlib.c
ar rcs s/libmath.a mathlib.o                  # static lib
gcc -shared -o d/libmath.so mathlib.o         # dynamic lib

gcc main.c -Ls -l:libmath.a -o app_static
gcc main.c -Ld -lmath -Wl,-rpath,'$ORIGIN/d' -o app_dynamic

$ ./app_static;  ./app_dynamic
add(2, 3) = 5
add(2, 3) = 5
```

Now change the implementation in `mathlib.c` (here `a + b` becomes `a * b`) and rebuild **only the library**:

```bash
sed -i 's/a + b/a * b/' mathlib.c
gcc -fPIC -shared -o d/libmath.so mathlib.c   # new .so, apps untouched

$ ./app_static;  ./app_dynamic
add(2, 3) = 5      # static: still the old code, it was copied into the binary
add(2, 3) = 6      # dynamic: new code, loaded from the new .so at startup
```

The static app only picks up the change after the library **and the app** are rebuilt:

```bash
gcc -c mathlib.c && ar rcs s/libmath.a mathlib.o
gcc main.c -Ls -l:libmath.a -o app_static     # relink required

$ ./app_static
add(2, 3) = 6
```

This is the whole trade-off: with a `.so` you ship one file and every app gets the fix on its next start, with a `.a` you must relink and redeploy every app. It is also why a bad `.so` update (changed signature, different behavior) breaks apps without them being rebuilt.

---

<h3 id="risk" style="font-weight: bold;">Runtime Risks of Dynamic Libraries</h3>

Because linking is finished at run time, a dynamic app can build fine and still fail on the target machine. There are two common cases.

**1. Missing library**

The loader cannot find the `.so` the executable asks for, so the app does not even start:

```bash
$ ./app
./app: error while loading shared libraries: libmath.so: cannot open shared object file: No such file or directory
```

Check with `ldd app` (look for `not found`). Typical causes: library not installed, wrong `rpath` / `LD_LIBRARY_PATH`, or a different distro or version on the target.

**2. ABI break**

The `.so` is replaced by a version whose interface changed, but the app is not rebuilt. Here `add` gains a third parameter:

```c
/* v1.c */  int add(int a, int b)         { return a + b; }
/* v2.c */  int add(int a, int b, int c)  { return a + b + c; }
```

```bash
$ gcc -fPIC -shared -o libmath.so v1.c && ./app
add(2, 3) = 5

$ gcc -fPIC -shared -o libmath.so v2.c && ./app    # app NOT rebuilt
add(2, 3) = -736414659
```

Nothing fails: the symbol `add` still exists, so the loader is happy. The app just passes two arguments and the library reads a third from whatever garbage is in the register. The result is wrong values or a crash, and the C ABI carries no type information that could catch it. The same happens when a struct layout changes.

How to reduce the risk:

- Use the **soname** scheme above and bump the major version on any ABI break, so old apps keep loading `.so.1`.
- Never change the signature, struct layout or meaning of an exported function in place. Add a new function instead.
- Keep structs opaque (pointer + accessor functions) so their layout can change safely.
- Ship the exact `.so` version you tested with (or pin it via `rpath`), and check with `ldd` on the target.

With a static library none of this can happen at run time: any mismatch is a compile or link error, found before you ship.

---
<h3 id="choose" style="font-weight: bold;">Which One to Choose?</h3>

**Prefer static when**

- Bare-metal / MCU firmware: there is no OS loader, so everything is often  linked statically.
- You want a single self-contained binary (containers, `scratch` images, tools shipped to unknown machines).
- You want link-time optimization across the library boundary.

**Prefer dynamic when**

- Many programs share one library (saves disk and RAM).
- You need to patch a library (e.g. a security fix in OpenSSL) without rebuilding every app.

**Summary**

- Linking order matters for static libs: put libraries *after* the objects that use them (`main.c -lmath`, not `-lmath main.c`).
- Duplicate symbol in both static and dynamic variants? The linker prefers `.so` unless you pass `-static` or `-l:libmath.a`.
- "Dependency hell": an incompatible ABI change in a `.so` breaks apps at run time, not build time.
---
