---
title: Memory layout in microcontroller
date: 2025-07-16 06:20:52 +0000
tags: [mcu, CortexM, ARM]
---

<h3 id="introduction" style="font-weight: bold;">Introduction</h3>
Understanding how source code transforms into executable firmware and gets organized in microcontroller memory is fundamental for embedded developers. This post explores the journey from C source code to flash memory, covering memory sections (.text, .data, .bss), memory layout, and how linker scripts orchestrate the entire process on ARM Cortex-M microcontrollers.

---

<h3 id="compilation-process" style="font-weight: bold;">From Source Code to Binary</h3>

Before diving into memory layout, let's understand how source code becomes executable firmware:

**1. Preprocessing** → **2. Compilation** → **3. Assembly** → **4. Linking** → **5. Binary Generation**

```c
// main.c - Your source code
int global_var = 42;        // Initialized global variable
int uninitialized_var;      // Uninitialized global variable
const int constant = 100;   // Constant data

int main(void) {
    int local_var = 10;     // Local variable (stack)
    static int static_var;  // Static variable
    
    // Your application code
    while(1) {
        // Main loop
    }
}
```

This gets transformed through the toolchain:
- **GCC Compiler**: Converts C to assembly
- **Assembler**: Converts assembly to object files (.o)
- **Linker**: Combines object files and places them in memory sections
- **objcopy**: Generates final binary/hex files for flashing

---

<h3 id="memory-sections" style="font-weight: bold;">Memory Sections Explained</h3>

Compiled code is organized into distinct sections, each with specific purposes:

<h4 id="text-section" style="font-weight: bold;">.text Section (Code)</h4>
- **Contains**: Executable instructions, constants, string literals
- **Location**: Flash memory (ROM)
- **Characteristics**: Read-only, non-volatile
- **Examples**: Function code, interrupt handlers, const variables

```c
const char* welcome_msg = "Hello World";  // Goes to .text (or .rodata)
void delay_ms(uint32_t ms) {              // Function code goes to .text
    // Implementation...
}
```

<h4 id="data-section" style="font-weight: bold;">.data Section (Initialized Data)</h4>
- **Contains**: Initialized global and static variables
- **Storage**: Flash (initial values) + RAM (runtime copy)
- **Characteristics**: Read-write, values copied from flash to RAM at startup
- **Examples**: Global variables with initial values

```c
int sensor_count = 5;           // .data section
static float calibration = 1.5; // .data section
```

<h4 id="bss-section" style="font-weight: bold;">.bss Section (Uninitialized Data)</h4>
- **Contains**: Uninitialized global and static variables
- **Location**: RAM only
- **Characteristics**: Zero-initialized at startup, no flash storage needed
- **Examples**: Global arrays, uninitialized variables

```c
int buffer[1024];               // .bss section
static char rx_buffer[256];     // .bss section
```

<h4 id="stack-section" style="font-weight: bold;">Stack</h4>
- **Contains**: Local variables, function parameters, return addresses
- **Location**: RAM (grows downward)
- **Management**: Automatic (push/pop operations)

<h4 id="heap-section" style="font-weight: bold;">Heap</h4>
- **Contains**: Dynamically allocated memory (malloc/free)
- **Location**: RAM (grows upward)
- **Management**: Manual allocation/deallocation

---

<h3 id="memory-layout" style="font-weight: bold;">ARM Cortex-M Memory Layout</h3>

ARM Cortex-M microcontrollers use a standardized memory map:

```
0xFFFFFFFF  ┌─────────────────┐
            │   Device        │  ← Peripheral registers
0xE0000000  ├─────────────────┤
            │   External RAM  │  ← External SRAM (if available)
0x60000000  ├─────────────────┤
            │   External      │  ← External devices
0x40000000  ├─────────────────┤
            │   Peripherals   │  ← MCU peripherals (UART, SPI, etc.)
0x20000000  ├─────────────────┤
            │   SRAM          │  ← Internal RAM (.data, .bss, stack, heap)
            │                 │
            │   ┌─ Stack ──┐  │  ← Grows downward
            │   │          │  │
            │   │    ↓     │  │
            │   │          │  │
            │   │    ↑     │  │
            │   └─ Heap ───┘  │  ← Grows upward
            │   .bss         │  ← Zero-initialized data
            │   .data        │  ← Initialized data (copied from flash)
0x08000000  ├─────────────────┤
            │   Flash        │  ← Program memory
            │   .text        │  ← Code and constants
            │   .data init   │  ← Initial values for .data section
0x00000000  └─────────────────┘
```

---

<h3 id="startup-process" style="font-weight: bold;">Startup Process: From Flash to RAM</h3>

When an MCU resets, the following happens:

**1. Reset Vector**
```c
// Vector table (stored in flash at 0x08000000)
uint32_t vector_table[] = {
    (uint32_t)&_estack,        // Initial stack pointer
    (uint32_t)Reset_Handler,   // Reset handler address
    // ... other interrupt vectors
};
```

**2. Reset Handler Execution**
```c
void Reset_Handler(void) {
    // 1. Copy .data section from flash to RAM
    extern uint32_t _sidata, _sdata, _edata;
    uint32_t *src = &_sidata;  // Source in flash
    uint32_t *dst = &_sdata;   // Destination in RAM
    
    while (dst < &_edata) {
        *dst++ = *src++;       // Copy initialized data
    }
    
    // 2. Zero-initialize .bss section
    extern uint32_t _sbss, _ebss;
    dst = &_sbss;
    while (dst < &_ebss) {
        *dst++ = 0;            // Clear uninitialized data
    }
    
    // 3. Set up system (clocks, etc.)
    SystemInit();
    
    // 4. Jump to main()
    main();
}
```

---

<h3 id="linker-scripts" style="font-weight: bold;">Linker Scripts: The Memory Orchestrator</h3>

Linker scripts (`.ld` files) define how sections are placed in memory:

```ld
/* STM32F4xx Linker Script Example */
MEMORY
{
    FLASH (rx)   : ORIGIN = 0x08000000, LENGTH = 512K
    RAM (xrw)    : ORIGIN = 0x20000000, LENGTH = 128K
}

/* Entry point */
ENTRY(Reset_Handler)

/* Stack size */
_Min_Heap_Size = 0x200;
_Min_Stack_Size = 0x400;

SECTIONS
{
    /* Vector table and code in flash */
    .isr_vector :
    {
        . = ALIGN(4);
        KEEP(*(.isr_vector))
        . = ALIGN(4);
    } >FLASH
    
    /* Program code and constants */
    .text :
    {
        . = ALIGN(4);
        *(.text)           /* Code */
        *(.text*)          /* Code */
        *(.glue_7)         /* ARM/Thumb interwork */
        *(.glue_7t)
        *(.eh_frame)
        
        KEEP (*(.init))
        KEEP (*(.fini))
        
        . = ALIGN(4);
        _etext = .;        /* End of .text section */
    } >FLASH
    
    /* Constants */
    .rodata :
    {
        . = ALIGN(4);
        *(.rodata)         /* Read-only data */
        *(.rodata*)
        . = ALIGN(4);
    } >FLASH
    
    /* Initialized data (stored in flash, copied to RAM) */
    .data : 
    {
        . = ALIGN(4);
        _sdata = .;        /* Start of .data in RAM */
        *(.data)           /* Initialized data */
        *(.data*)
        . = ALIGN(4);
        _edata = .;        /* End of .data in RAM */
    } >RAM AT> FLASH      /* Stored in flash, runs in RAM */
    
    _sidata = LOADADDR(.data);  /* Start of .data in flash */
    
    /* Uninitialized data */
    .bss :
    {
        . = ALIGN(4);
        _sbss = .;         /* Start of .bss */
        __bss_start__ = _sbss;
        *(.bss)
        *(.bss*)
        *(COMMON)
        . = ALIGN(4);
        _ebss = .;         /* End of .bss */
        __bss_end__ = _ebss;
    } >RAM
    
    /* Stack and heap */
    ._user_heap_stack :
    {
        . = ALIGN(8);
        PROVIDE ( end = . );
        PROVIDE ( _end = . );
        . = . + _Min_Heap_Size;
        . = . + _Min_Stack_Size;
        . = ALIGN(8);
        _estack = .;       /* Top of stack */
    } >RAM
}
```

---

<h3 id="memory-analysis" style="font-weight: bold;">Analyzing Memory Usage</h3>

**Using size command:**
```bash
arm-none-eabi-size firmware.elf
```
Output:
```
   text    data     bss     dec     hex filename
  15234     356    2048   17638    44e6 firmware.elf
```

**Understanding the output:**
- **text**: Code + constants (stored in flash)
- **data**: Initialized variables (stored in flash + RAM)
- **bss**: Uninitialized variables (RAM only)
- **Total Flash used**: text + data
- **Total RAM used**: data + bss + stack + heap

**Memory map generation:**
```bash
arm-none-eabi-gcc -Wl,-Map=firmware.map ...
```

---

<h3 id="practical-examples" style="font-weight: bold;">Practical Examples</h3>

<h4 id="example-code" style="font-weight: bold;">Example Code Analysis</h4>

```c
// main.c
#include <stdint.h>

// .text section (flash)
const char version[] = "v1.0.0";
const uint32_t config_table[] = {100, 200, 300};

// .data section (flash + RAM)
uint32_t sensor_reading = 0x1234;
static float temperature = 25.5f;

// .bss section (RAM only)
uint8_t rx_buffer[512];
static uint32_t error_count;

// Stack variables (local to functions)
int main(void) {
    uint32_t local_var = 42;        // Stack
    static uint32_t call_count = 0; // .bss (first time) or .data (if initialized)
    
    // Heap allocation (if using malloc)
    uint8_t *dynamic_buffer = malloc(1024); // Heap
    
    while(1) {
        // Main loop
    }
}
```

**Memory placement:**
- `version[]`, `config_table[]` → Flash (.text/.rodata)
- `sensor_reading`, `temperature` → Flash (initial) + RAM (runtime)
- `rx_buffer[]`, `error_count` → RAM (.bss)
- `local_var` → Stack
- `call_count` → RAM (.bss)
- `dynamic_buffer` content → Heap

---

<h3 id="optimization-tips" style="font-weight: bold;">Memory Optimization Tips</h3>

**1. Use const for read-only data:**
```c
// Better: stays in flash
const uint32_t lookup_table[] = {1, 2, 3, 4};

// Wasteful: copied to RAM
uint32_t lookup_table[] = {1, 2, 3, 4};
```

**2. Initialize to zero when possible:**
```c
// Uses .bss (no flash storage)
uint8_t buffer[1024] = {0};

// Uses .data (flash + RAM)
uint8_t buffer[1024] = {1, 2, 3, /*...*/ };
```

**3. Use appropriate data types:**
```c
// Better for memory usage
uint8_t flags = 0;

// Wasteful on 8-bit systems
uint32_t flags = 0;
```

---

<h3 id="debugging-memory" style="font-weight: bold;">Debugging Memory Issues</h3>

**Common problems and solutions:**

**1. Stack Overflow:**
- Symptoms: Random crashes, variables corruption
- Debug: Check stack usage, reduce local variables
- Solution: Increase stack size in linker script

**2. Flash Overflow:**
- Symptoms: Linker error "region `FLASH' overflowed"
- Solution: Optimize code, use external flash, or larger MCU

**3. RAM Shortage:**
- Symptoms: malloc() returns NULL, .bss section too large
- Solution: Reduce buffer sizes, use flash for constants

---

<h3 id="conclusion" style="font-weight: bold;">Conclusion</h3>

Understanding memory layout is crucial for efficient embedded development. The journey from source code to MCU memory involves careful orchestration by the linker, guided by linker scripts that define where each section lives. Key takeaways:

- **Code (.text)** lives in flash and contains your program instructions
- **Initialized data (.data)** is stored in flash but copied to RAM at startup
- **Uninitialized data (.bss)** exists only in RAM and is zero-initialized
- **Linker scripts** control the memory organization and define symbols for startup code
- **Memory analysis tools** help optimize resource usage

Mastering these concepts enables you to write more efficient firmware, debug memory-related issues, and make informed decisions about resource allocation in resource-constrained embedded systems.

---