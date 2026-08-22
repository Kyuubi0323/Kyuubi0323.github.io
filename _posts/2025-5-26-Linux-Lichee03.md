---
title: Building Linux-Kernel for Lichee Pi Nano
date: 2025-05-26 14:30:00 +0700
categories: [Embedded Systems, LicheePi]
tags: [lichee, linux]     
comments: false
---

## Prerequisites

### Hardware Requirements
- Lichee Pi Nano board (F1C100s)
- MicroSD card (8GB or larger)
- USB-to-Serial adapter (for debugging)
- Linux development machine

### Software Requirements
- Cross-compilation toolchain
- Git
- U-Boot (previously built)
- Make and build essentials

## Kernel Source Acquisition

Mainline Kernel (Stable)

```bash
# Full clone for development
git clone git://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
cd linux

# Or shallow clone for quick builds
git clone git://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git --depth=1
```


## Kernel Configuration

### multiconfig
To get a useful kernel, use the following for configuration:

```bash 
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- multi_v7_defconfig
```
This is a kernel built for many compatible platforms, not only sunxi/allwinner. The resulting kernel and modules is rather big, and you might want to remove other platforms through menuconfig.

### Using Default Configuration

The `sunxi_defconfig` provides a working baseline for Allwinner SoCs:

```bash
# Configure kernel for ARM with sunxi defaults
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- sunxi_defconfig
```

This comes as a single zImage, no modules, with many useful features missing.

### Manual Configuration (Optional)

```bash
# Open configuration menu
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- menuconfig
```

### Essential Configuration Options

For Lichee Pi Nano, ensure these options are enabled:

```
# System V IPC (required for fakeroot/packages)
General setup --->
    [*] System V IPC

# Early printk (for debugging)
Kernel hacking --->
    [*] Kernel debugging
    [*] Kernel low-level debugging functions
    [*] Early printk
    Kernel low-level debugging port --->
        (X) Kernel low-level debugging messages via sunXi UART0
```

## Kernel Compilation

### Build Kernel Image

```bash
# Compile kernel image (use -j for parallel build)
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) zImage
```

The compiled kernel will be located at `arch/arm/boot/zImage`.

### Build Device Tree Blobs

```bash
scripts/config --enable MACH_SUNIV
# Compile device tree binaries
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) dtbs
```
:) If fail on building the dtb, modify this line 

```bash
diff --git a/Makefile b/Makefile
index 3d58dfa97..568dba38e 100644
--- a/Makefile
+++ b/Makefile
@@ -301,7 +301,7 @@ no-dot-config-targets := $(clean-targets) \
                         run-command
 no-sync-config-targets := $(no-dot-config-targets) %install modules_sign kernelrelease \
                          image_name
-single-targets := %.a %.i %.ko %.lds %.ll %.lst %.mod %.o %.rsi %.s %/
+single-targets := %.a %.dtb %.dtbo %.i %.ko %.lds %.ll %.lst %.mod %.o %.rsi %.s %/
 
 config-build   :=
 mixed-build    :=
```

For Lichee Pi Nano, the relevant DTB is:
- `arch/arm/boot/dts/allwinner/suniv-f1c100s-licheepi-nano.dtb`

### Build Modules (Optional)

```bash
# Compile kernel modules
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) modules

# Install modules to staging directory
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- INSTALL_MOD_PATH=./modules_install modules_install
```

### Build Headers (Optional)

```bash
# Install kernel headers
make ARCH=arm INSTALL_HDR_PATH=./headers_install headers_install
```
