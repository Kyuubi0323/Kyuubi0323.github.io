---
title: How Compilers Actually Link Your Code
date: 2025-12-20 08:00:00 +0700
categories: [Embedded Systems]
tags: [mcu, linux, compiler]
comments: false
---

When you write `#include <stdio.h>`, you are pulling in years of infrastructure that most developers never think about. This post peels back the layers: what **libc** and **glibc** actually are, how **compilers** (GCC, Clang) connect your code to them, and why MCU developers reach for **newlib** instead.

---

<h3 id="what-is-libc" style="font-weight: bold;">What Is libc?</h3>

**libc** is the C Standard Library  -  the implementation of everything standardized in ISO C:
`printf`, `malloc`, `fopen`, `memcpy`, `strlen`, `pthread_create`, and hundreds more.

Every C program on Linux implicitly links against it. It is the bridge between **your code** and the **operating system kernel**.

```text
Your Code (.c)
    │
    ▼
  libc  ──── wraps raw Linux syscalls into portable C functions
    │
    ▼
 Linux Kernel  (syscalls: read, write, mmap, ioctl, …)
```

Without libc, calling `printf("hello\n")` would require you to manually invoke the `write` syscall using inline assembly or a syscall stub  -  every single time.

---

<h3 id="what-is-glibc" style="font-weight: bold;">What Is glibc?</h3>

**glibc** (GNU C Library) is the *dominant implementation* of libc on Linux desktop and server systems. When people say "libc on Linux," they almost always mean glibc.

```bash
$ ls -la /lib/x86_64-linux-gnu/libc.so.6
lrwxrwxrwx ... libc.so.6 -> libc-2.35.so   # This IS glibc
$ ldd --version
ldd (Ubuntu GLIBC 2.35-0ubuntu3) 2.35       # The glibc version
```

glibc provides:
- The full ISO C standard library (`stdio.h`, `stdlib.h`, `string.h`, …)
- POSIX extensions (`unistd.h`, `sys/socket.h`, `pthread.h`, …)
- Linux-specific extensions (`sys/ioctl.h`, `sys/epoll.h`, …)
- The **dynamic linker/loader** (`ld-linux.so`) that runs before `main()`
- Startup code (`crt1.o`, `crti.o`, `crtn.o`) that calls `main()`

```bash
$ file /bin/ls
/bin/ls: ELF 64-bit LSB pie executable, dynamically linked,
         interpreter /lib64/ld-linux-x86-64.so.2   # <- glibc's dynamic linker
```

---

<h3 id="alternative-libc" style="font-weight: bold;">libc Is Not Just glibc</h3>

**glibc** is the most feature-complete but also the heaviest. There are several other implementations:

| Library | Use Case | Notes |
|---|---|---|
| **glibc** | Desktop / Server Linux | Default on Debian, Ubuntu, Fedora |
| **musl** | Embedded Linux, containers | Alpine Linux uses musl; small and strict |
| **newlib** | Bare-metal / RTOS | Used by `arm-none-eabi-gcc` toolchains |

When you build with `arm-none-eabi-gcc` for a bare-metal MCUs, there is **no Linux kernel**  -  the libc is **newlib**, and syscalls like `write` call a weak stub (`_write`) that you can re-write its implementation yourself (e.g., redirecting to UART instead of std-out).

---

<h3 id="newlib-mcu" style="font-weight: bold;">newlib  -  libc for Microcontrollers</h3>

When you target a bare-metal MCU (STM32, nRF52, RP2040…) there is no OS, no kernel, and no glibc. The toolchain (`arm-none-eabi-gcc`) ships with **newlib** as its C library. Understanding how it works explains a lot of the "mysterious" behavior in embedded C projects.

#### What newlib provides

newlib implements the same C standard headers you know  -  `stdio.h`, `string.h`, `stdlib.h`, `math.h`  -  but without any OS backing:

```text
Your Firmware (.c)
    │
    ▼
  newlib  ──── pure C: printf, malloc, memcpy, ...
    │
    ▼
 Syscall stubs  (_write, _read, _sbrk, _close, ...)
    │
    ▼
 Your hardware  (UART, Flash, RAM  -  no kernel!)
```

The stubs are **weak symbols**. If you do not provide them, the linker uses a default that either loops forever or returns an error. If you do provide them, newlib routes all I/O through your implementation.

#### Retargeting  -  implementing the syscall stubs

The most common retargeting task is redirecting `printf` to a UART. You implement `_write`:

```c
// retarget.c  -  redirect stdout to UART
#include <sys/stat.h>
#include <errno.h>

// Called by newlib whenever printf/puts/fwrite needs to output bytes
int _write(int file, char *ptr, int len)
{
    (void)file;  // ignore fd, always send to UART1
    for (int i = 0; i < len; i++) {
        // HAL_UART_Transmit blocks until the byte is sent, but be careful with that blocking function
        HAL_UART_Transmit(&huart1, (uint8_t *)&ptr[i], 1, HAL_MAX_DELAY);
    }
    return len;
}
```

Other commonly retargeted stubs:

| Stub | Called by | What to implement |
|---|---|---|
| `_write` | `printf`, `puts`, `fwrite` | Send bytes to UART / RTT / semihosting |
| `_read` | `scanf`, `getchar`, `fread` | Receive bytes from UART |
| `_sbrk` | `malloc`, `calloc`, `realloc` | Move the heap break pointer in your RAM |
| `_close`, `_fstat`, `_lseek` | file operations | Return `-1` / `ENOSYS` on bare-metal |
| `_exit` | `exit()`, `abort()` | Infinite loop or NVIC_SystemReset() |

#### `_sbrk` and the heap

`malloc` in newlib calls `_sbrk` to grow the heap. You must tell it where the heap lives:

```c
// Linker script defines these symbols:
extern char _end;      // end of BSS segment  -  start of heap
extern char _estack;   // top of RAM  -  where stack grows down from

void *_sbrk(ptrdiff_t incr)
{
    static char *heap_end = &_end;
    char *prev = heap_end;

    // Make sure heap doesn't collide with stack
    if (heap_end + incr > &_estack - 512) {
        errno = ENOMEM;
        return (void *)-1;
    }
    heap_end += incr;
    return prev;
}
```

Without a correct `_sbrk`, `malloc` will either corrupt the stack or immediately fail.

#### Semihosting  -  debug I/O without a UART

Semihosting is an ARM mechanism that lets the MCU tunnel I/O through the debug probe (J-Link, ST-Link) to a host terminal. It is built into newlib:

```bash
# Link with semihosting support (ARM GCC):
arm-none-eabi-gcc main.c -specs=rdimon.specs -lrdimon -o fw.elf
```

```c
// With semihosting, printf goes to the debugger console  -  no UART needed
#include <stdio.h>
int main(void) {
    printf("Hello from Cortex-M via semihosting\n");
}
```

Semihosting is **extremely slow** (each character traps into the debug interface) and must be disabled before release. Use it only during development.

#### newlib-nano  -  the size-optimized variant

STM32CubeIDE and most ARM GCC distributions ship **newlib-nano**, a stripped-down variant:

```bash
# Use newlib-nano (enabled by default in many cube projects):
arm-none-eabi-gcc main.c -specs=nano.specs -o fw.elf
```

Differences from full newlib:

| Feature | newlib | newlib-nano |
|---|---|---|
| `printf` float support | Yes | No (add `-u _printf_float`) |
| Code size | Larger | ~30-50% smaller |
| `malloc` implementation | dlmalloc | simpler, smaller allocator |
| Wide char / wchar_t | Full | Minimal |

#### Comparison at a glance

| | glibc | musl | newlib | newlib-nano |
|---|---|---|---|---|
| Target | Linux desktop/server | Embedded Linux | Bare-metal MCU | Bare-metal MCU (small) |
| OS required | Linux kernel | Linux kernel | None | None |
| Size | Large | Small | Medium | Small |
| Float printf | Yes | Yes | Yes | Opt-in (`-u _printf_float`) |
| Actively maintained | Yes | Yes | Yes | Yes |
| Toolchain | x86-64, AArch64… | x86-64, AArch64… | arm-none-eabi | arm-none-eabi |

---

<h3 id="how-gcc-clang-link-libc" style="font-weight: bold;">How GCC and Clang Link Against libc</h3>

This is the part most developers take for granted. When you run:

```bash
$ gcc main.c -o main
```

GCC does far more than compile. It orchestrates the entire toolchain pipeline:

```text
main.c
  │
  ▼ (1) Preprocessor  cpp
  │     Expands #include, #define -> main.i
  │
  ▼ (2) Compiler      cc1
  │     Translates C to assembly -> main.s
  │
  ▼ (3) Assembler     as
  │     Assembles to object file -> main.o
  │
  ▼ (4) Linker        ld  (invoked via collect2)
        Links main.o + crt1.o + libc.so -> main (ELF executable)
```

You can inspect each stage:

```bash
$ gcc -E  main.c -o main.i   # Stop after preprocessing
$ gcc -S  main.c -o main.s   # Stop after compiling to assembly
$ gcc -c  main.c -o main.o   # Stop after assembling
$ gcc     main.c -o main     # Full pipeline + link
```

**Clang** follows the exact same four stages  -  it is a drop-in GCC replacement at the command-line level:

```bash
$ clang main.c -o main       # Identical result on most systems
```

The key difference is internal architecture:

| | GCC | Clang / LLVM |
|---|---|---|
| Front-end | GCC's own parser | Clang (separate, reusable AST) |
| Middle-end | GIMPLE / RTL passes | LLVM IR + LLVM passes |
| Back-end | Target-specific GCC back-ends | LLVM code generators |
| Tooling | Separate tools (sparse, etc.) | clangd, clang-tidy, clang-format built-in |

Both ultimately call the system **linker** (`ld` or `lld`) which wires up your object files to the libc shared object.

#### The Hidden `-lc` Flag

You never type `-lc`, but GCC adds it automatically:

```bash
$ gcc -v main.c -o main 2>&1 | grep "\-lc"
# You'll see something like:
# ... /usr/lib/gcc/x86_64-linux-gnu/11/collect2 ... -lc ...
```

`-lc` tells the linker to link against `libc.so.6` (glibc). To prevent this:

```bash
$ gcc -nostdlib main.c -o main  # No libc, no startup code  -  you're on your own
$ gcc -nodefaultlibs main.c -o main  # No default libs, but keep startup code
```

These flags are essential in **bare-metal** or **OS kernel** development where there is no libc at all.

---

<h3 id="startup-before-main" style="font-weight: bold;">What Happens Before main()</h3>

This is one of the most misunderstood parts. When you run a Linux program, the kernel doesn't call `main()`  -  it jumps to `_start`, which is provided by glibc's **CRT** (C Runtime):

```text
Kernel loads ELF
    │
    ▼
ld-linux.so  (dynamic linker  -  resolves shared library symbols)
    │
    ▼
_start       (from crt1.o, provided by glibc)
    │
    ├── Initializes argc, argv, envp
    ├── Calls __libc_start_main()
    │       ├── Sets up stdio buffers
    │       ├── Registers atexit handlers
    │       ├── Runs .init_array constructors (C++ static objects, __attribute__((constructor)))
    │       └── Calls main()
    │
    └── After main() returns -> calls exit() -> runs .fini_array destructors -> _exit syscall
```

`crt1.o`, `crti.o`, and `crtn.o` are the **C Runtime Objects** silently linked by GCC. You can list them:

```bash
$ gcc --print-file-name=crt1.o
/usr/lib/x86_64-linux-gnu/crt1.o
```

---

<h3 id="syscall-wrappers" style="font-weight: bold;">glibc as a Syscall Wrapper</h3>

The Linux kernel exposes ~300+ system calls (syscalls). glibc wraps each one into a normal C function so you don't have to write inline assembly:

```c
// What glibc does internally for read():
ssize_t read(int fd, void *buf, size_t count)
{
    // x86-64: syscall number 0 = __NR_read
    return syscall(__NR_read, fd, buf, count);
}
```

The raw Linux kernel interface uses CPU registers and the `syscall` instruction:

```asm
; x86-64 raw write syscall (no libc)
mov rax, 1          ; syscall number: write
mov rdi, 1          ; fd: stdout
mov rsi, msg        ; buffer pointer
mov rdx, 13         ; length
syscall
```

glibc makes all of that invisible. It also handles **errno**  -  the kernel returns a negative error code, glibc converts it to a positive value stored in the thread-local `errno` variable.

```c
// glibc errno handling (simplified):
long ret = raw_syscall(...);
if (ret < 0) {
    errno = -ret;   // e.g. kernel returns -ENOENT -> errno = ENOENT (2)
    return -1;
}
return ret;
```


---

<h3 id="references" style="font-weight: bold;">References</h3>

- [The GNU C Library (glibc)  -  official documentation](https://www.gnu.org/software/libc/manual/)
- [newlib  -  official documentation](https://sourceware.org/newlib/)
- [newlib retargeting guide (syscall stubs)](https://sourceware.org/newlib/libc.html#Stubs)
- [GNU Linker (ld) documentation  -  Linker Scripts](https://sourceware.org/binutils/docs/ld/Scripts.html)
- [GCC ARM Options (`-specs`, `-nostdlib`, `-fstack-usage`)](https://gcc.gnu.org/onlinedocs/gcc/ARM-Options.html)
- [Linux man-pages: `syscall(2)`](https://man7.org/linux/man-pages/man2/syscall.2.html)
- [Linux man-pages: `libc(7)`  -  overview of standard C library](https://man7.org/linux/man-pages/man7/libc.7.html)
