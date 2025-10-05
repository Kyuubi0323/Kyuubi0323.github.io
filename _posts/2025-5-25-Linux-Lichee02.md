---
title: Building U-Boot for Lichee Pi Nano
date: 2025-05-25 14:30:00 +0700
categories: [Embedded Systems, LicheePi]
tags: [lichee, u-boot, linux]     
comments: false
---

# Building U-Boot for Lichee Pi Nano 2

The **Lichee Pi Nano** is a compact Linux-capable development board based on the **Allwinner F1C100s** ARM9 SoC. This guide walks through the complete process of building mainline U-Boot for this tiny but powerful board.

## Overview

The Lichee Pi Nano uses the Allwinner F1C100s, which is part of the sunxi family of processors. Building U-Boot for this board requires cross-compilation and specific configuration for the sunxi platform.

### What You'll Need

- **Host System**: Linux development machine (Ubuntu/Debian recommended)
- **Cross-compilation toolchain**: ARM cross-compiler
- **Dependencies**: Several development packages
- **Hardware**: Lichee Pi Nano board and microSD card

## Prerequisites and Dependencies

### Install Required Packages

First, install the essential build dependencies:

```bash
# Update package lists
sudo apt update

# Install cross-compilation toolchain
sudo apt install gcc-arm-linux-gnueabihf

# Install build dependencies
sudo apt install build-essential git bc bison flex libssl-dev

# Install U-Boot specific dependencies
sudo apt install swig python3-dev device-tree-compiler
```

### Verify Toolchain Installation

Confirm your cross-compiler is properly installed:

```bash
arm-linux-gnueabihf-gcc --version
```

You should see output indicating the ARM GCC cross-compiler version.

## Getting U-Boot Source Code

### Clone the Repository

Download the latest U-Boot source code:

```bash
# Clone the official U-Boot repository
git clone git://git.denx.de/u-boot.git
cd u-boot

# List available releases
git tag -l | grep -E 'v202[0-9]\.[0-9]+$' | tail -10

# Checkout a stable release (recommended)
git checkout v2024.01
```

## Configuring U-Boot for Lichee Pi Nano

### Find the Correct Defconfig

The Lichee Pi Nano uses a specific configuration file. Locate it in the configs directory:

```bash
# Search for Lichee Pi Nano configuration
find configs/ -name "*licheepi*" -o -name "*nano*" -o -name "*f1c100s*"

# List sunxi-related configurations
ls configs/ | grep -i sunxi
```

For the Lichee Pi Nano (F1C100s), the configuration is typically:
```bash
ls configs/licheepi_nano_defconfig
```

### Understanding the Configuration

Let's examine what's in the defconfig:

```bash
cat configs/licheepi_nano_defconfig
```

The configuration typically includes:
- **Architecture**: ARM
- **SoC**: Allwinner F1C100s
- **DRAM settings**: Board-specific memory configuration
- **Boot source**: SD card support
- **Console**: Serial console configuration

## Building U-Boot

### Configure the Build

Set up the build configuration:

```bash
# Clean any previous builds
make distclean

# Configure for Lichee Pi Nano
make CROSS_COMPILE=arm-linux-gnueabihf- licheepi_nano_defconfig
```

### Booting with boot.cmd
For booting from SD with mainline U-Boot, the recommended way is: create a file boot.cmd on the first partition (also check Kernel arguments for extra 'bootargs' options):

```bash
#create boot.cmd 
nano boot.cmd
```
copy these snippet code into the boot.cmd
```
setenv bootargs console=ttyS0,115200 earlyprintk root=/dev/mmcblk0p2 rootwait panic=10 init=/bin/sh

load mmc 0:1 0x80008000 zImage
load mmc 0:1 0x80A00000 suniv-f1c100s-licheepi-nano.dtb

bootz 0x80008000 - 0x80A00000
```
boot.cmd isn't used directly, but needs to be wrapped with uboot header with the command:

```bash
mkimage -C none -A arm -T script -d boot.cmd boot.scr
```
### Optional: Customize Configuration

If you need to modify the configuration:

```bash
# Open configuration menu
make CROSS_COMPILE=arm-linux-gnueabihf- menuconfig
```

### Compile U-Boot

Build the bootloader:

```bash
# Build U-Boot (use -j for parallel compilation)
make CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc)
```

The build process will:
1. **Compile SPL** (Secondary Program Loader)
2. **Compile main U-Boot**
3. **Generate device tree blobs**
4. **Create final binary**

### Build Output

After successful compilation, you'll find these important files:

```bash
# List generated files
ls -la u-boot*

# Key files:
# u-boot-sunxi-with-spl.bin - Complete bootloader for SD card
# u-boot.bin                - Main U-Boot binary
# u-boot.img                - U-Boot with header
# spl/sunxi-spl.bin         - SPL (Secondary Program Loader)
```

## Understanding the Boot Process

### Allwinner Boot Sequence

The F1C100s follows this boot sequence:

1. **BROM** (Boot ROM): Built-in first-stage bootloader
2. **SPL** (Secondary Program Loader): Initializes DRAM and loads U-Boot
3. **U-Boot**: Full bootloader that loads the kernel
4. **Linux Kernel**: Operating system

### Memory Layout

```
0x00000000: BROM (Boot ROM)
0x00001000: SRAM A1 (SPL execution area)
0x80000000: DRAM (U-Boot and kernel load area)
```
