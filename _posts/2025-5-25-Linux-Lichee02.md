---
title: Building U-Boot for Lichee Pi Nano
date: 2025-05-25 14:30:00 +0700
categories: [Hardware Projects, LicheePi]
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

### Understanding U-Boot Versions

- **Development branch** (`master`): Latest features but potentially unstable
- **Release tags** (e.g., `v2024.01`): Stable, tested versions
- **LTS versions**: Long-term support releases for production use

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

### Optional: Customize Configuration

If you need to modify the configuration:

```bash
# Open configuration menu
make CROSS_COMPILE=arm-linux-gnueabihf- menuconfig
```

Key areas you might want to configure:
- **Boot delay**: Time before auto-boot
- **Environment storage**: Where U-Boot saves settings
- **Network support**: Ethernet/USB networking
- **USB support**: USB host/device functionality

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

## Installing U-Boot to SD Card

### Prepare SD Card

Introduction
This page describes how to create a bootable SD card. Depending on how the SD card is connected, the location to write data to can be different. Throughout this document ${card} refers to the SD card and ${p} to the partition if any. If the SD card is connected via a USB adapter, linux will know it for example as /dev/sdb (with /dev/sda being a boot drive). Please notice that this device can be different based on numerous factors, so when not sure, check the last few lines of dmesg after plugging in the device (dmesg | tail). If connected via a SD slot on a device, linux will know it as /dev/mmcblk0 (or mmcblk1, mmcblk2 depending on which mmc slot is used).

Data is either stored raw on the SD card or in a partition. If ${p} is used then the appropiate partition should be used. Also this differs for USB adapters or mmc controllers. When using an USB adapter, ${p} will be 1, 2, 3 etc so the resulting device is /dev/sdb1. Using an mmc controller, this would be p1, p2, p3 etc so the resulting device is /dev/mmcblk0p1.

To summarize: ${card} and ${card}${p}1 mean /dev/sdb and /dev/sdb1 on a USB connected SD card, and /dev/mmcblk0, /dev/mmcblk0p1 on an mmc controller connected device.

Exclamation.png If the SD card is connected in another way, the device nodes can change to be even different, take this into account.

SD Card Layout
A default U-Boot build for an Allwinner based board uses the following layout on (micro-)SD cards or eMMC storage (from v2018.05 or newer):

start	sector	size	usage
0KB	0	8KB	Unused, available for an MBR or (limited) GPT partition table
8KB	16	32KB	Initial SPL loader
40KB	80	-	U-Boot proper
Typically partitions start at 1MB (which is the default setting of most partitioning tools), but there is no hard requirement for this, so U-Boot can grow bigger than 984KB, if needed.

The 8KB offset is dictated by the BROM, it will check for a valid eGON/TOC0 header at this location. The 40KB offset for U-Boot proper is the default U-Boot setting and can be changed at build time using the CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR configuration variable.

Newer SoCs (tested on H2+, A64, H5, H6, T113) can also load the SPL from sector 256 (128KB) of an SD card or eMMC, if no valid eGON/TOC0 signature is found at 8KB (BROM boot order). The U-Boot proper offset needs to be adjusted accordingly in this case. U-boot patch more details

Mainline U-Boot used to have a more complex, fixed layout for the SD card/eMMC sectors in the first Megabyte:

Legacy SD card layout
start	sector	size	usage
0KB	0	8KB	Unused, available for MBR (partition table etc.)
8KB	16	32KB	Initial SPL loader
40KB	80	504KB	U-Boot
544KB	1088	128KB	environment
672KB	1344	128KB	Falcon mode boot params
800KB	1600	-	Falcon mode kernel start
1024KB	2048	-	Free for partitions
As the feature set of U-Boot proper grew over time, this proved to be too restricting, as we completely filled the area before the environment and started to corrupt it. To avoid future issues, it was decided to move the default location for the environment to a FAT partition, which is more flexible and has no real size limits.
````
