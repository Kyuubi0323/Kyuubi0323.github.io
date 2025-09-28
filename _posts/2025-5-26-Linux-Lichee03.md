---
title: Building Linux-Kernel for Lichee Pi Nano
date: 2025-05-26 14:30:00 +0700
categories: [Hardware Projects, LicheePi]
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

### Install Cross-Compiler

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install gcc-arm-linux-gnueabihf

# Verify installation
arm-linux-gnueabihf-gcc --version
```

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

### Using Default Configuration

The `sunxi_defconfig` provides a working baseline for Allwinner SoCs:

```bash
# Configure kernel for ARM with sunxi defaults
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- sunxi_defconfig
```

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
# Compile device tree binaries
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) dtbs
```

For Lichee Pi Nano, the relevant DTB is:
- `arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb`

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
