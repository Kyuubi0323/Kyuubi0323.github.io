---
title: Memory layout in microcontroller
date: 2025-07-16 06:20:52 +0000
categories: [Embedded Systems]
tags: [mcu, CortexM, ARM]
---

<h3 id="introduction" style="font-weight: bold;">Introduction</h3>
This post is a deep dive into every memory region on an ARM Cortex-M MCU: what lives there, how it works at the hardware and ABI level, and practical tips for each region.

---

<h3 id="arm-memory-map" style="font-weight: bold;">The ARM Cortex-M Address Space</h3>

ARM Cortex-M defines a fixed 4 GB address space split into well-known bands. Unlike a PC where the OS manages memory, on a bare-metal MCU this map is baked into hardware:

```
0xFFFFFFFF  ┌──────────────────────────────┐
            │  Vendor-specific / PPB       │  <- Core debug registers (DWT, ITM, …)
0xE0000000  ├──────────────────────────────┤
            │  External device             │  <- Off-chip peripherals (FMC, QSPI NOR)
0xA0000000  ├──────────────────────────────┤
            │  External RAM                │  <- SDRAM, SRAM via FMC
0x60000000  ├──────────────────────────────┤
            │  Peripheral                  │  <- APB/AHB peripherals (UART, SPI, GPIO)
0x40000000  ├──────────────────────────────┤
            │  SRAM                        │  <- Internal RAM: .data .bss heap stack
0x20000000  ├──────────────────────────────┤
            │  Code                        │  <- Flash: .text .rodata vector table
0x00000000  └──────────────────────────────┘
```

For a real MCU like STM32F407:

| Region | Address | Size |
|---|---|---|
| Flash (code) | `0x08000000` | 1 MB |
| Internal SRAM1 | `0x20000000` | 112 KB |
| Internal SRAM2 | `0x2001C000` | 16 KB |
| CCM RAM (data-only) | `0x10000000` | 64 KB |
| Peripheral bus | `0x40000000` |  -  |

---

<h3 id="flash-rom" style="font-weight: bold;">Flash (ROM)  -  Where Your Code Lives</h3>

Flash is non-volatile, meaning it survives power loss. On reset, the CPU starts executing from Flash. On STM32 the default boot address is `0x08000000`; the very first word read is the **initial stack pointer**, and the second word is the **reset handler address**  -  both come from the vector table embedded in your firmware.

```
Flash layout (typical STM32):
0x08000000  ┌──────────────────┐
            │  Vector Table    │  <- Stack pointer, Reset_Handler, NMI, HardFault, …
0x08000188  ├──────────────────┤
            │  .text           │  <- Compiled Thumb-2 instructions
            ├──────────────────┤
            │  .rodata         │  <- const variables, string literals, lookup tables
            ├──────────────────┤
            │  .data (LMA)     │  <- Initial values for RAM variables  -  copied at boot
            ├──────────────────┤
            │  (empty/erased)  │  <- 0xFF  -  unwritten flash
0x080FFFFF  └──────────────────┘
```

#### Flash hardware facts you must know

**Erase granularity**  -  you cannot write a single byte to Flash without first erasing the sector it belongs to. STM32F4 has sectors of 16 KB, 64 KB, and 128 KB. This matters for in-application programming (IAP) and bootloaders.

**Write endurance**  -  Flash wears out. Typical STM32 internal flash is rated for ~10 000 erase cycles per sector. Never put a write loop that hammers Flash at runtime.

**Read wait states**  -  Flash is slower than the CPU clock. At 168 MHz (STM32F407) you need 5 wait states. The Flash prefetch buffer and instruction cache hide most of this latency. Disabling the cache can cause a 3-5× slowdown.

**Execute-in-place (XiP)**  -  code runs directly from Flash, the CPU fetches instructions over the code bus. This is the default and requires no special handling.

**Copy-to-RAM execution**  -  time-critical ISRs can be placed in RAM for faster execution (no Flash wait states, no cache misses):

```c
// Place this function in the SRAM for lowest-latency execution
__attribute__((section(".RamFunc")))
void TIM2_IRQHandler(void)
{
    // Tight timing code here runs from SRAM at full CPU speed
    TIM2->SR &= ~TIM_SR_UIF;
}
```

Linker script entry:

```c
.RamFunc :
{
    . = ALIGN(4);
    *(.RamFunc)
    *(.RamFunc*)
    . = ALIGN(4);
} >RAM AT> FLASH   /* stored in flash, copied and run from RAM */
```

#### Tips for Flash

- Keep large `const` lookup tables in `.rodata`  -  they cost zero RAM.
- Use `__attribute__((optimize("Os")))` on non-critical functions to reduce code size.
- Run `arm-none-eabi-size` after every build and track the trend.
- If you hit the Flash limit, try `-flto` (link-time optimization)  -  it can cut 10-30% from typical firmware.

---

<h3 id="text-section" style="font-weight: bold;">.text  -  Executable Code</h3>

`.text` contains all compiled function bodies. On Cortex-M the instructions are **Thumb-2**  -  a variable-width encoding (16-bit and 32-bit instructions intermixed) that gives near-ARM performance in near-Thumb code density.

```c
// This entire function body goes to .text
void uart_send_byte(USART_TypeDef *uart, uint8_t b)
{
    while (!(uart->SR & USART_SR_TXE));
    uart->DR = b;
}
```

You can inspect what went where:

```bash
arm-none-eabi-objdump -d firmware.elf | head -60
```

#### Interrupt vectors are part of .text

The vector table is the very first thing in Flash. GCC puts it in a section called `.isr_vector` which the linker script forces to `ORIGIN(FLASH)`:

```c
// startup_stm32f407xx.c (simplified)
extern uint32_t _estack;           // defined in linker script
void Reset_Handler(void);
void Default_Handler(void);

__attribute__((section(".isr_vector")))
const uint32_t g_pfnVectors[] = {
    (uint32_t)&_estack,            // 0: Initial SP value
    (uint32_t)Reset_Handler,       // 1: Reset
    (uint32_t)NMI_Handler,         // 2: NMI
    (uint32_t)HardFault_Handler,   // 3: Hard Fault
    // ... up to 240 external IRQs
};
```

If the vector table is wrong (e.g., misaligned or you forgot `KEEP` in the linker script), the MCU will jump to a garbage address on reset  -  the most common cause of "my MCU does nothing" during early bringup.

---

<h3 id="rodata-section" style="font-weight: bold;">.rodata  -  Read-Only Data</h3>

`.rodata` (read-only data) lives in Flash alongside `.text`. It holds:

- `const` global and static variables with values
- String literals
- Lookup tables marked `const`
- `switch` jump tables

```c
// All of these land in .rodata (Flash, zero RAM cost):
const uint8_t  sin_lut[256] = { 0, 3, 6, 9, ... };
const char     fw_version[]  = "2.1.4";
const uint32_t crc_table[256] = { ... };
```

**Common mistake**  -  forgetting `const`:

```c
// BAD: 1024 bytes wasted in RAM (.data section)
uint8_t sin_lut[256] = { 0, 3, 6, 9, ... };

// GOOD: stays in Flash
const uint8_t sin_lut[256] = { 0, 3, 6, 9, ... };
```

**String literal gotcha**  -  string literals in C are always `const char *`, so `"hello"` goes to `.rodata`. But if you store it in a `char *` (non-const pointer), the pointer lives on the stack and the data is in Flash  -  writes through that pointer cause a HardFault.

```c
char *p = "hello";  // p is on stack, "hello" is in Flash (read-only!)
p[0] = 'H';         // HardFault  -  writing to Flash address
```

---

<h3 id="data-section" style="font-weight: bold;">.data  -  Initialized Variables</h3>

`.data` contains global and static variables that have a non-zero initial value. They need **two addresses**:

- **LMA** (Load Memory Address)  -  where the initial values are stored in Flash
- **VMA** (Virtual Memory Address)  -  where the variable lives at runtime in RAM

The startup code copies from LMA to VMA before `main()`.

```
Flash (LMA):               RAM (VMA):
┌──────────────┐           ┌──────────────┐
│ .data image  │  ──copy── │ .data        │  <- running copy, read/write
│ (initial     │           │              │
│  values)     │           │              │
└──────────────┘           └──────────────┘
```

In the linker script this is expressed as:

```ld
.data :
{
    . = ALIGN(4);
    _sdata = .;        /* VMA start  -  used by startup copy loop */
    *(.data)
    *(.data*)
    . = ALIGN(4);
    _edata = .;        /* VMA end */
} >RAM AT> FLASH       /* AT> FLASH = store initial values in Flash (LMA) */

_sidata = LOADADDR(.data);   /* LMA start  -  where values live in Flash */
```

And in `Reset_Handler`:

```c
// Copy .data from Flash (LMA) to RAM (VMA)
extern uint32_t _sidata;  // LMA: initial values in Flash
extern uint32_t _sdata;   // VMA: start of .data in RAM
extern uint32_t _edata;   // VMA: end of .data in RAM

uint32_t *src = &_sidata;
uint32_t *dst = &_sdata;
while (dst < &_edata) {
    *dst++ = *src++;
}
```

#### Tips for .data

- Large `.data` wastes both Flash (for the image) and RAM (for the copy). Prefer `.bss` when zero is an acceptable initial value.
- A 256-byte `uint8_t lut[] = {1,2,3,...}` costs 256 bytes of Flash **and** 256 bytes of RAM. Make it `const` and it costs only Flash.
- `static` local variables with initial values also go to `.data`:

```c
void foo(void) {
    static uint32_t call_count = 1;  // .data  -  NOT stack
}
```

---

<h3 id="bss-section" style="font-weight: bold;">.bss  -  Uninitialized (Zero-Initialized) Data</h3>

`.bss` holds global and static variables with no explicit initializer, or explicitly initialized to zero. Because the C standard guarantees these are zero at program start, the linker does **not** need to store initial values in Flash  -  only a start and end address.

At startup, `Reset_Handler` zeroes the entire `.bss` range:

```c
extern uint32_t _sbss;
extern uint32_t _ebss;

uint32_t *dst = &_sbss;
while (dst < &_ebss) {
    *dst++ = 0;
}
```

```c
// All of these go to .bss  -  no Flash cost for initial values:
uint8_t  rx_buffer[1024];          // .bss
uint32_t error_count;              // .bss
static float last_temp;            // .bss
int sensor_values[64] = {0};       // .bss (explicitly zero  -  same section)
```

#### .bss vs .data cost table

| Declaration | Flash cost | RAM cost | Section |
|---|---|---|---|
| `uint8_t buf[1024];` | 0 | 1024 | .bss |
| `uint8_t buf[1024] = {0};` | 0 | 1024 | .bss |
| `uint8_t buf[1024] = {1,2,…};` | 1024 | 1024 | .data |
| `const uint8_t buf[1024] = {1,2,…};` | 1024 | 0 | .rodata |

---

<h3 id="stack" style="font-weight: bold;">The Stack  -  How Function Calls Actually Work</h3>

The stack is a region of RAM used for:
- Local (automatic) variables
- Function arguments (beyond what fits in registers)
- Return addresses (LR  -  Link Register saved on context switch or nested calls)
- Saved registers (callee-saved registers pushed/popped per ABI)
- Exception frames (Cortex-M hardware pushes 8 registers automatically on IRQ entry)

On Cortex-M the stack **grows downward**  -  each `PUSH` decreases the Stack Pointer (SP / R13).

#### Stack layout during a call

Consider this call chain: `main()` -> `process()` -> `compute()`:

```
High address (initial SP, top of RAM)
┌──────────────────────────────────────┐
│  main() frame                        │
│    local_var    (4 bytes)            │
│    saved LR     (4 bytes)            │
├──────────────────────────────────────┤  <- SP when process() is called
│  process() frame                     │
│    buffer[256]  (256 bytes)          │
│    idx          (4 bytes)            │
│    saved LR                          │
├──────────────────────────────────────┤  <- SP when compute() is called
│  compute() frame                     │
│    result       (4 bytes)            │
│    temp         (4 bytes)            │
├──────────────────────────────────────┤  <- current SP
│  (free stack space)                  │
│  v grows downward                    │
│                                      │
│  heap grows upward ^                 │
└──────────────────────────────────────┘
Low address
```

#### ARM Cortex-M exception frame (hardware-pushed)

When an interrupt fires, the hardware automatically pushes 8 registers before calling the ISR:

```
Exception entry (hardware does this automatically):
┌────────┐
│  xPSR  │  +28  <- Program Status Register
│  PC    │  +24  <- Return address (where to resume)
│  LR    │  +20  <- Link Register
│  R12   │  +16
│  R3    │  +12
│  R2    │  +8
│  R1    │  +4
│  R0    │  +0   <- SP after push (8 × 4 = 32 bytes used)
└────────┘
```

This means **every interrupt costs at least 32 bytes of stack**  -  even a trivial one. If your ISR calls a function, the call also uses stack. A deeply nested call chain inside an ISR can overflow the stack silently.

#### Stack overflow  -  the silent killer

Stack overflow on bare-metal Cortex-M does **not** generate an immediate fault in most cases. The SP just crosses into `.bss` or `.data` and silently corrupts variables. The crash happens later in a completely unrelated function. This is the most frustrating bug category in embedded.

**Detection method 1  -  stack canary / watermark**

Fill the stack region with a known pattern at startup, then check the low-water mark at runtime:

```c
// In Reset_Handler, after zeroing .bss, before calling main():
extern uint32_t _sstack;   // bottom of stack (low address)
extern uint32_t _estack;   // top of stack (initial SP)

// Fill with canary pattern
uint32_t *p = &_sstack;
while (p < &_estack) {
    *p++ = 0xDEADBEEF;
}
```

```c
// At runtime  -  call periodically or from a low-priority task
uint32_t stack_get_unused_bytes(void)
{
    extern uint32_t _sstack;
    uint32_t *p = &_sstack;
    while (*p == 0xDEADBEEF) p++;
    return (uint32_t)p - (uint32_t)&_sstack;
}

void monitor_task(void)
{
    uint32_t free = stack_get_unused_bytes();
    if (free < 256) {
        log_warning("Stack low: %lu bytes remaining", free);
    }
}
```

**Detection method 2  -  MPU stack guard**

Configure the MPU to make the bottom 32 bytes of the stack a no-access region. Any overflow immediately triggers a MemManage fault instead of silently corrupting data:

```c
void stack_guard_init(void)
{
    extern uint32_t _sstack;

    // Region 0: 32-byte no-access guard at bottom of stack
    MPU->RNR  = 0;
    MPU->RBAR = ((uint32_t)&_sstack & MPU_RBAR_ADDR_Msk) | MPU_RBAR_VALID_Msk | 0;
    MPU->RASR = MPU_RASR_ENABLE_Msk        // enable region
              | (0b00100 << MPU_RASR_SIZE_Pos)  // 2^(4+1) = 32 bytes
              | (0b000   << MPU_RASR_AP_Pos);   // no access (R/W both fault)

    // Enable MPU with default memory map for background regions
    MPU->CTRL = MPU_CTRL_ENABLE_Msk | MPU_CTRL_PRIVDEFENA_Msk;
    __DSB(); __ISB();
}
```

**Detection method 3  -  DWT stack pointer monitor (Cortex-M3/4/7)**

```c
// Use the Data Watchpoint and Trace unit to trigger DebugMon on SP violation
DWT->COMP0   = (uint32_t)&_sstack + 64;    // alert if SP goes below this
DWT->MASK0   = 0;
DWT->FUNCTION0 = DWT_FUNCTION_FUNCTION_WPSP_Msk;  // watchpoint on SP
CoreDebug->DEMCR |= CoreDebug_DEMCR_MON_EN_Msk;
```

#### Stack sizing rules of thumb

- Bare-metal with no RTOS: 1-4 KB is typical. 512 bytes is tight.
- Each RTOS task has its **own independent stack**. FreeRTOS default is 128 words = 512 bytes  -  often too small for tasks that use `printf`.
- Recursive functions on MCU are a red flag. A recursion depth of 10 with 64-byte frames = 640 bytes gone instantly.
- Floating-point: when `PRESERVE8` is required and FPU context is saved, each ISR entry saves an additional 17 FP registers (S0-S15 + FPSCR) + alignment = 72 extra bytes.

#### Tips for the stack

```c
// BAD: 4 KB local array blows the stack in 1 call
void process_data(void)
{
    uint8_t temp_buffer[4096];   // 4 KB on stack!
    // ...
}

// GOOD: static storage, allocated once
void process_data(void)
{
    static uint8_t temp_buffer[4096];   // .bss  -  not on stack
    // but NOT thread-safe / re-entrant!
}

// BETTER if buffer is large and reused: global in .bss
static uint8_t g_process_buf[4096];
```

---

<h3 id="heap" style="font-weight: bold;">The Heap  -  Dynamic Memory on a MCU</h3>

The heap is the region from which `malloc` / `calloc` / `realloc` / `free` allocate blocks. It grows **upward** from the end of `.bss` toward the stack.

```
RAM layout (low -> high):
┌──────────┬──────────┬──────────┬────────────────┬──────────┐
│  .data   │  .bss    │  heap ->  │  (free space)  │  <- stack │
└──────────┴──────────┴──────────┴────────────────┴──────────┘
           ^                     ^                ^
         _end                heap_end           current SP
         (_sbrk base)
```

#### How newlib malloc works on Cortex-M

newlib's `malloc` calls `_sbrk(increment)` to grow the heap. You must implement `_sbrk` yourself (retargeting):

```c
#include <sys/types.h>
#include <errno.h>

extern char _end;      // set by linker: end of .bss = heap base
extern char _estack;   // set by linker: top of RAM = stack top

static char *heap_end = NULL;

void *_sbrk(ptrdiff_t incr)
{
    if (heap_end == NULL) {
        heap_end = &_end;   // first call: initialize to end of .bss
    }

    char *prev_heap_end = heap_end;

    // Guard: ensure heap does not collide with stack
    // Leave at least STACK_GUARD_BYTES between heap top and current SP
    const uint32_t STACK_GUARD_BYTES = 512;
    if (heap_end + incr > (char *)__get_MSP() - STACK_GUARD_BYTES) {
        errno = ENOMEM;
        return (void *)-1;
    }

    heap_end += incr;
    return prev_heap_end;
}
```

#### Heap fragmentation

On a desktop OS the virtual memory system masks fragmentation. On a bare-metal MCU with 64 KB of RAM there is no escape. Classic fragmentation scenario:

```c
// Allocate a mix of sizes
uint8_t *a = malloc(100);   // block A: 100 bytes
uint8_t *b = malloc(200);   // block B: 200 bytes
uint8_t *c = malloc(100);   // block C: 100 bytes

free(a);   // hole of 100 bytes
free(c);   // hole of 100 bytes  -  but they are not adjacent!

// Now try to allocate 150 bytes:
uint8_t *d = malloc(150);   // FAILS  -  each hole is only 100 bytes
                             // even though total free = 200 bytes
```

```
Heap after the above:
┌──────┬──────────┬──────┬──────────┐
│[free]│ [B: 200] │[free]│ [in use] │
│ 100B │          │ 100B │ ...      │
└──────┴──────────┴──────┴──────────┘
        ^ cannot fit 150 bytes in any single hole
```

The allocator cannot compact memory because existing pointers would become invalid.

#### Detecting heap exhaustion

```c
#include <malloc.h>

void print_heap_stats(void)
{
    struct mallinfo mi = mallinfo();
    printf("Heap: used=%d  free=%d  largest_free_block=%d\n",
           mi.uordblks, mi.fordblks, mi.keepcost);
}

// Or measure by trying a large allocation:
size_t heap_largest_free_block(void)
{
    size_t lo = 1, hi = 64 * 1024, mid;
    while (lo < hi) {
        mid = lo + (hi - lo + 1) / 2;
        void *p = malloc(mid);
        if (p) { free(p); lo = mid; }
        else    { hi = mid - 1;     }
    }
    return lo;
}
```

#### Should you use malloc on an MCU?

The standard embedded answer is **avoid it in production firmware** unless you have a good reason. Here is why, and what to use instead:

| Concern | Detail |
|---|---|
| Fragmentation | Leads to allocation failures over time (days/weeks of runtime) |
| Non-deterministic timing | `malloc` time varies with heap state  -  bad for real-time |
| No recovery path | If `malloc` returns NULL in deep embedded code, your options are limited |
| Stack/heap collision | A wild `_sbrk` can silently corrupt the stack |

**Pattern 1  -  static pre-allocated pools (best for MCU)**

```c
// Instead of malloc(sizeof(Packet)) everywhere, manage a fixed pool
typedef struct {
    uint8_t  data[64];
    bool     in_use;
} Packet;

static Packet packet_pool[16];   // .bss  -  16 packets max, known at compile time

Packet *packet_alloc(void)
{
    for (int i = 0; i < 16; i++) {
        if (!packet_pool[i].in_use) {
            packet_pool[i].in_use = true;
            return &packet_pool[i];
        }
    }
    return NULL;   // pool exhausted  -  deterministic, no fragmentation
}

void packet_free(Packet *p)
{
    p->in_use = false;
}
```

**Pattern 2  -  arena / region allocator (allocate-only, reset in bulk)**

```c
// Good for request-response patterns: allocate freely during a request,
// then wipe everything at once when the response is sent.
static uint8_t arena[2048];
static size_t  arena_pos = 0;

void *arena_alloc(size_t n)
{
    n = (n + 3) & ~3u;   // align to 4 bytes
    if (arena_pos + n > sizeof(arena)) return NULL;
    void *p = &arena[arena_pos];
    arena_pos += n;
    return p;
}

void arena_reset(void)
{
    arena_pos = 0;   // O(1) "free everything"
}
```

**When malloc IS acceptable on MCU:**
- Initialization-only: allocate during `main()` setup, never free afterward
- Systems with FreeRTOS heap5 or similar managed heap with deterministic behavior
- Large MCUs (STM32H7 with 1 MB RAM) where fragmentation is manageable

---

<h3 id="special-ram" style="font-weight: bold;">Special RAM Regions  -  DTCM, ITCM, CCM</h3>

High-performance Cortex-M7 MCUs (STM32F7, STM32H7) and some Cortex-M4 (STM32F4 CCM) have additional tightly-coupled RAM regions that are **separate from the main SRAM bus**.

#### CCM RAM (Core Coupled Memory)  -  STM32F4

STM32F407 has 64 KB of CCM RAM at `0x10000000`. The CPU accesses it directly without going through the AHB bus, giving **zero-wait-state** access at any clock speed.

**Limitation**: The DMA controller **cannot** access CCM RAM (it goes through AHB). Never use CCM for DMA buffers.

```ld
/* Add CCM to linker script */
MEMORY
{
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    RAM   (xrw) : ORIGIN = 0x20000000, LENGTH = 112K
    CCMRAM(rw)  : ORIGIN = 0x10000000, LENGTH = 64K
}

/* Place time-critical data in CCM */
.ccmram :
{
    . = ALIGN(4);
    _sccmram = .;
    *(.ccmram)
    *(.ccmram*)
    . = ALIGN(4);
    _eccmram = .;
} >CCMRAM AT> FLASH

_siccmram = LOADADDR(.ccmram);
```

```c
// Annotate variables/functions to go into CCM
__attribute__((section(".ccmram")))
uint32_t pid_state[4];     // PID controller state  -  zero-wait-state access

__attribute__((section(".ccmram")))
void motor_control_isr(void)  // 10 kHz ISR  -  runs from CCM at full speed
{
    // ...
}
```

Don't forget to copy CCM data in `Reset_Handler`:

```c
// Copy .ccmram from Flash LMA to CCM VMA
uint32_t *src = &_siccmram;
uint32_t *dst = &_sccmram;
while (dst < &_eccmram) {
    *dst++ = *src++;
}
```

#### DTCM / ITCM  -  STM32H7 / Cortex-M7

Cortex-M7 has:
- **ITCM** (Instruction TCM, `0x00000000`): 64 KB  -  tightly coupled to the instruction fetch unit, no I-cache needed
- **DTCM** (Data TCM, `0x20000000`): 128 KB  -  tightly coupled to load/store unit, no D-cache needed

```c
// Place ISR in ITCM for guaranteed single-cycle instruction fetch
__attribute__((section(".itcmram")))
void EXTI0_IRQHandler(void) { ... }

// Place DMA-independent hot data in DTCM
__attribute__((section(".dtcmram")))
static float filter_coeffs[64];
```

**DTCM vs D-cache trade-off**: Using DTCM avoids all cache coherency issues (no need for `SCB_CleanDCache`/`SCB_InvalidateDCache` before/after DMA). Put DMA buffers in regular SRAM and computation state in DTCM.

---

<h3 id="linker-scripts" style="font-weight: bold;">Linker Scripts  -  The Memory Orchestrator</h3>

The linker script is the single file that decides where every byte of your firmware goes. It is written in a special GNU LD language.

```ld
/* Complete STM32F407 linker script */
MEMORY
{
    FLASH  (rx)  : ORIGIN = 0x08000000, LENGTH = 1024K
    CCMRAM (rw)  : ORIGIN = 0x10000000, LENGTH = 64K
    RAM    (xrw) : ORIGIN = 0x20000000, LENGTH = 128K
}

ENTRY(Reset_Handler)

_Min_Heap_Size  = 0x800;   /* 2 KB minimum heap  */
_Min_Stack_Size = 0x800;   /* 2 KB minimum stack */

SECTIONS
{
    /* ── 1. Vector table (must be at ORIGIN(FLASH)) ── */
    .isr_vector :
    {
        . = ALIGN(4);
        KEEP(*(.isr_vector))    /* KEEP prevents LTO from removing it */
        . = ALIGN(4);
    } >FLASH

    /* ── 2. Program code ── */
    .text :
    {
        . = ALIGN(4);
        *(.text)
        *(.text*)
        *(.glue_7)
        *(.glue_7t)
        KEEP(*(.init))
        KEEP(*(.fini))
        . = ALIGN(4);
        _etext = .;
    } >FLASH

    /* ── 3. Read-only data ── */
    .rodata :
    {
        . = ALIGN(4);
        *(.rodata)
        *(.rodata*)
        . = ALIGN(4);
    } >FLASH

    /* ── 4. Initialized data (LMA in Flash, VMA in RAM) ── */
    .data :
    {
        . = ALIGN(4);
        _sdata = .;            /* VMA start */
        *(.data)
        *(.data*)
        . = ALIGN(4);
        _edata = .;            /* VMA end */
    } >RAM AT> FLASH

    _sidata = LOADADDR(.data); /* LMA start: initial values in Flash */

    /* ── 5. CCM data (LMA in Flash, VMA in CCM) ── */
    .ccmram :
    {
        . = ALIGN(4);
        _sccmram = .;
        *(.ccmram)
        *(.ccmram*)
        . = ALIGN(4);
        _eccmram = .;
    } >CCMRAM AT> FLASH

    _siccmram = LOADADDR(.ccmram);

    /* ── 6. Zero-initialized data ── */
    .bss :
    {
        . = ALIGN(4);
        _sbss = .;
        __bss_start__ = _sbss;
        *(.bss)
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;
        __bss_end__ = _ebss;
    } >RAM

    /* ── 7. Heap + Stack size check ── */
    ._user_heap_stack :
    {
        . = ALIGN(8);
        PROVIDE(end  = .);     /* newlib _sbrk uses 'end' as heap base */
        PROVIDE(_end = .);
        . = . + _Min_Heap_Size;
        . = . + _Min_Stack_Size;
        . = ALIGN(8);
    } >RAM

    /* ── 8. Stack top (initial SP loaded by hardware from vector[0]) ── */
    _estack = ORIGIN(RAM) + LENGTH(RAM);
}
```

#### Important linker keywords

| Keyword | Meaning |
|---|---|
| `MEMORY { }` | Declares the physical memory regions and their attributes |
| `SECTIONS { }` | Maps input sections -> output sections -> memory regions |
| `>RAM` | Place the output section's VMA in RAM |
| `AT> FLASH` | Place the output section's LMA (stored image) in Flash |
| `LOADADDR(section)` | Returns the LMA of a section (used to set `_sidata`) |
| `KEEP(pattern)` | Prevent dead-code elimination from removing this section |
| `PROVIDE(sym = expr)` | Define a symbol only if not already defined elsewhere |
| `. = ALIGN(4)` | Advance location counter to the next 4-byte aligned address |

---

<h3 id="startup" style="font-weight: bold;">Startup Code  -  What Happens Before main()</h3>

The complete startup sequence on Cortex-M:

```c
// startup_stm32f407xx.c  -  simplified but complete

extern uint32_t _estack;

// Forward declarations
void Reset_Handler(void);
void Default_Handler(void);
void __libc_init_array(void);  // newlib: runs C++ constructors / __attribute__((constructor))

// ISR aliases (all point to Default_Handler unless overridden)
void NMI_Handler(void)          __attribute__((weak, alias("Default_Handler")));
void HardFault_Handler(void)    __attribute__((weak, alias("Default_Handler")));
void MemManage_Handler(void)    __attribute__((weak, alias("Default_Handler")));
// ... etc.

// Vector table
__attribute__((section(".isr_vector"), used))
const uint32_t g_vectors[] = {
    (uint32_t)&_estack,
    (uint32_t)Reset_Handler,
    (uint32_t)NMI_Handler,
    (uint32_t)HardFault_Handler,
    (uint32_t)MemManage_Handler,
    // ... 240 external interrupts
};

void Reset_Handler(void)
{
    // ── Step 1: Copy .data from Flash to RAM ──────────────
    extern uint32_t _sidata, _sdata, _edata;
    uint32_t *src = &_sidata, *dst = &_sdata;
    while (dst < &_edata) *dst++ = *src++;

    // ── Step 2: Copy .ccmram from Flash to CCM ────────────
    extern uint32_t _siccmram, _sccmram, _eccmram;
    src = &_siccmram; dst = &_sccmram;
    while (dst < &_eccmram) *dst++ = *src++;

    // ── Step 3: Zero .bss ─────────────────────────────────
    extern uint32_t _sbss, _ebss;
    dst = &_sbss;
    while (dst < &_ebss) *dst++ = 0;

    // ── Step 4: Stack canary watermark ────────────────────
    extern uint32_t _sstack;
    uint32_t *p = &_sstack;
    uint32_t *sp_now = (uint32_t *)__get_MSP();
    while (p < sp_now - 16) *p++ = 0xDEADBEEF;

    // ── Step 5: FPU enable (Cortex-M4/M7 with FPU) ───────
    SCB->CPACR |= (0xFu << 20);   // CP10 + CP11 full access
    __DSB(); __ISB();

    // ── Step 6: System clock init ─────────────────────────
    SystemInit();   // vendor HAL: sets up PLL, flash wait states

    // ── Step 7: C++ constructors / constructor attributes ─
    __libc_init_array();

    // ── Step 8: Enter application ─────────────────────────
    main();

    // Should never reach here
    while (1);
}

void Default_Handler(void)
{
    // Hang here  -  attach debugger and check PC to identify the IRQ
    __BKPT(0);
    while (1);
}
```

---

<h3 id="memory-analysis" style="font-weight: bold;">Analyzing and Measuring Memory Usage</h3>

#### arm-none-eabi-size

```bash
arm-none-eabi-size firmware.elf
```

```
   text    data     bss     dec     hex filename
  32156     512    4096   36764    8F9C firmware.elf
```

- **Flash used** = text + data = 32156 + 512 = **32 668 bytes**
- **RAM used at startup** = data + bss = 512 + 4096 = **4 608 bytes**
- **RAM used at runtime** = data + bss + stack_peak + heap_peak

#### Map file analysis

```bash
arm-none-eabi-gcc ... -Wl,-Map=firmware.map,--cref
grep -E "^\.text|^\.data|^\.bss|^\.rodata" firmware.map
```

The map file shows which object file contributed to each section and exactly how many bytes. Invaluable for finding "who is eating my Flash."

#### nm  -  symbol sizes

```bash
# Sort all symbols by size, largest first
arm-none-eabi-nm --size-sort --print-size firmware.elf | tail -20
```

```
00000400 B rx_dma_buffer       <- 1 KB in .bss
00000200 D calibration_table   <- 512 bytes in .data (should it be .rodata?)
00001200 T jpeg_decode          <- 4.5 KB of code in .text
```

#### Linker overflow is a compile-time error

```
region `FLASH' overflowed by 2048 bytes
```

This is caught at link time  -  the build fails. But **stack overflow at runtime is silent**  -  that is why watermarking matters.

---

<h3 id="full-example" style="font-weight: bold;">Full Worked Example</h3>

```c
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

/* ─── Flash (.rodata)  -  zero RAM cost ─────────────────────────── */
const uint16_t adc_gain_lut[256] = { /* ... 256 calibration values ... */ };
const char     fw_build_tag[]    = "v2.3.1-release";

/* ─── RAM .data  -  initial value stored in Flash, copied to RAM ── */
uint32_t sample_rate_hz     = 8000;     /* 4 bytes Flash + 4 bytes RAM */
float    filter_cutoff_hz   = 1000.0f;  /* 4 bytes Flash + 4 bytes RAM */

/* ─── RAM .bss  -  no Flash cost, zero-init ────────────────────── */
uint8_t  adc_rx_buf[512];              /* 512 bytes RAM, 0 bytes Flash */
uint32_t dropped_frames;              /* 4 bytes RAM */

/* ─── CCM RAM  -  fast, CPU-only, no DMA ────────────────────────── */
__attribute__((section(".ccmram")))
int32_t  fir_state[64];               /* 256 bytes CCM RAM */

/* ─── Function in Flash (.text) ──────────────────────────────── */
static void process_block(const uint8_t *in, uint8_t *out, size_t n)
{
    /* Stack frame: loop variable i (4 bytes), nothing else */
    for (size_t i = 0; i < n; i++) {
        out[i] = (uint8_t)((in[i] * adc_gain_lut[in[i] >> 8]) >> 16);
    }
}

/* ─── Time-critical ISR in CCM RAM ───────────────────────────── */
__attribute__((section(".ccmram")))
void DMA2_Stream0_IRQHandler(void)
{
    /* Runs from CCM: zero wait-state instruction fetch */
    DMA2->LIFCR = DMA_LIFCR_CTCIF0;
    process_block(adc_rx_buf, adc_rx_buf, 512);
}

int main(void)
{
    uint8_t local_buf[64];   /* 64 bytes on stack  -  OK for small temp buffers */
    memset(local_buf, 0, sizeof(local_buf));

    while (1) { }
}
```

Memory breakdown:

| Symbol | Section | Flash | RAM |
|---|---|---|---|
| `adc_gain_lut` | .rodata | 512 | 0 |
| `fw_build_tag` | .rodata | 11 | 0 |
| `sample_rate_hz` | .data | 4 | 4 |
| `filter_cutoff_hz` | .data | 4 | 4 |
| `adc_rx_buf` | .bss | 0 | 512 |
| `dropped_frames` | .bss | 0 | 4 |
| `fir_state` | .ccmram | 256 (LMA) | 256 (CCM) |
| `local_buf` | stack | 0 | 64 (transient) |

---

<h3 id="tips" style="font-weight: bold;">Tips and Advice by Region</h3>

#### Flash / .rodata
- Mark every table, string, and constant as `const`. One missed `const` on a 1 KB LUT wastes 1 KB of precious RAM.
- Use `-flto -Os` for size-critical builds. LTO can inline and eliminate dead code across translation units.
- Avoid storing large BMP/JPEG data directly in firmware  -  use QSPI external Flash and stream from there.

#### .data
- Audit `.data` in your map file. Any non-trivial `.data` entry is a candidate for `const` conversion.
- `static` local variables with initializers are in `.data`, not the stack. They persist across calls and are **not** thread-safe.

#### .bss
- Prefer `.bss` over `.data`  -  same RAM, but zero Flash cost for the initial image.
- Don't `memset(buf, 0, sizeof(buf))` at the top of `main()`  -  it's already zero from startup. (This is a common beginner pattern that wastes cycles.)

#### Stack
- Set `_Min_Stack_Size` conservatively in the linker script. The linker will error at link time if the stack + heap don't fit in RAM.
- Use the watermark pattern in debug builds; remove it from release only after measuring.
- Keep ISRs short. Moving any non-trivial work out of ISRs into tasks (via a queue or flag) reduces worst-case stack depth.
- Always use the `-fstack-usage` flag during development: GCC will emit a `.su` file for each `.c` file showing per-function stack usage.

```bash
arm-none-eabi-gcc -fstack-usage main.c -c
cat main.su
# main.c:42:6:process_block    48    static
# main.c:55:6:main              80    static
```

#### Heap
- If you must use `malloc`, allocate everything during init and never free. This eliminates fragmentation.
- Always check `malloc` return values. On MCU there is no OOM killer  -  a NULL dereference causes a HardFault.
- Consider FreeRTOS heap5 (`heap_5.c`) instead of newlib malloc  -  it lets you span multiple non-contiguous RAM regions and is better suited to RTOS use.

#### CCM / DTCM
- Put the most frequently-called ISRs and their data in CCM/DTCM.
- **Never** point a DMA source or destination at CCM (STM32F4) or DTCM (STM32H7). The DMA bus cannot reach those regions  -  the transfer will silently fail or corrupt data.
- Use `__attribute__((section(".ccmram")))` sparingly  -  only for code/data with proven cache-miss bottlenecks.

---

<h3 id="conclusion" style="font-weight: bold;">Summary</h3>

| Region | Location | Volatile | DMA | Key rule |
|---|---|---|---|---|
| `.text` | Flash | No | Read-only | Keep functions here by default |
| `.rodata` | Flash | No | Read-only | Every constant table should be `const` |
| `.data` (LMA) | Flash | No |  -  | Costs both Flash + RAM  -  audit carefully |
| `.data` (VMA) | RAM | Yes | Yes | Copied from Flash at boot |
| `.bss` | RAM | Yes | Yes | Free Flash; prefer over `.data` |
| Stack | RAM | Yes | No | Watermark it; never put large arrays here |
| Heap | RAM | Yes | Yes (carefully) | Avoid in production; use pools instead |
| CCM/DTCM | Tightly coupled RAM | Yes | **No** | Zero-wait-state; ISR and hot data only |

---