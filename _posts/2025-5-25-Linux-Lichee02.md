---
title: Building U-Boot for Lichee Pi Nano
date: 2025-05-25 14:30:00 +0700
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

```bash
# Insert SD card and identify device (e.g., /dev/sdb)
lsblk

# Create partition table (optional, for complete setup)
sudo fdisk /dev/sdX  # Replace X with your SD card device
```

### Write U-Boot to SD Card

The bootloader must be written to specific sectors:

```bash
# Write U-Boot to SD card (IMPORTANT: Replace /dev/sdX with your SD card)
sudo dd if=u-boot-sunxi-with-spl.bin of=/dev/sdX bs=1024 seek=8 conv=sync

# Verify the write
sudo dd if=/dev/sdX bs=1024 skip=8 count=1000 | hexdump -C | head
```

### Understanding the Installation

- **Offset 8KB**: Where SPL must be located for BROM to find it
- **bs=1024 seek=8**: Write starting at 8KB offset
- **conv=sync**: Ensure complete write

## Creating Boot Scripts

### Basic Boot Script

Create `boot.cmd` for automatic kernel loading:

```bash
cat > boot.cmd << 'EOF'
# Set console and root device
setenv bootargs console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait panic=10

# Load device tree and kernel
load mmc 0:1 0x43000000 sun4i-a10-licheepi-nano.dtb
load mmc 0:1 0x42000000 zImage

# Boot the kernel
bootz 0x42000000 - 0x43000000
EOF
```

### Convert Script to U-Boot Format

```bash
# Convert boot.cmd to boot.scr
mkimage -C none -A arm -T script -d boot.cmd boot.scr

# Copy to SD card first partition
sudo mount /dev/sdX1 /mnt
sudo cp boot.scr /mnt/
sudo umount /mnt
```

## Troubleshooting Common Issues

### Build Errors

**Python.h not found:**
```bash
sudo apt install python3-dev
```

**dtc not found:**
```bash
sudo apt install device-tree-compiler
```

**swig not found:**
```bash
sudo apt install swig
```

### Boot Issues

**No output on serial console:**
- Check serial connection (115200 8N1)
- Verify console= parameter in bootargs
- Test with different terminal software

**U-Boot doesn't start:**
- Verify SD card write was successful
- Check power supply (stable 5V)
- Try different SD card

**Kernel panic:**
- Verify root filesystem exists
- Check device tree compatibility
- Ensure proper kernel version

## Advanced Configuration

### DRAM Settings

The F1C100s requires specific DRAM configuration. Check your board's DRAM specifications:

```bash
# View current DRAM settings in defconfig
grep -i dram configs/licheepi_nano_defconfig
```

Common DRAM parameters:
- **DRAM_CLK**: Memory clock frequency
- **DRAM_TYPE**: DDR2/DDR3 type
- **DRAM_ZQ**: Impedance calibration
- **DRAM_ODT_EN**: On-die termination

### Environment Variables

Configure U-Boot environment storage:

```bash
# Common environment locations:
# - SD card
# - SPI flash
# - NAND flash
```

### Network Boot

Enable network booting for development:

```bash
# In U-Boot console:
setenv serverip 192.168.1.100    # TFTP server IP
setenv ipaddr 192.168.1.101      # Board IP
setenv netmask 255.255.255.0
setenv bootfile zImage
setenv fdtfile sun4i-a10-licheepi-nano.dtb

# Network boot command
tftpboot 0x42000000 ${bootfile}
tftpboot 0x43000000 ${fdtfile}
bootz 0x42000000 - 0x43000000
```

## Testing Your Build

### Serial Console Setup

Connect to the board's serial console:

```bash
# Using screen
screen /dev/ttyUSB0 115200

# Using minicom
minicom -D /dev/ttyUSB0 -b 115200

# Using picocom
picocom /dev/ttyUSB0 -b 115200
```

### Boot Sequence

A successful boot shows:

```
U-Boot SPL 2024.01 (May 25 2025 - 14:30:00)
DRAM: 32 MiB
Trying to boot from MMC1

U-Boot 2024.01 (May 25 2025 - 14:30:00) Allwinner Technology

CPU:   Allwinner F1C100s (SUN8I)
Model: Lichee Pi Nano
DRAM:  32 MiB
MMC:   mmc@1c0f000: 0
Loading Environment from nowhere... OK
In:    serial@1c25000
Out:   serial@1c25000
Err:   serial@1c25000
Net:   No ethernet found.
Hit any key to stop autoboot:  0
```

## Next Steps

With U-Boot successfully built and installed:

1. **Build Linux Kernel**: Compile a kernel for the F1C100s
2. **Create Root Filesystem**: Set up Buildroot or custom rootfs
3. **Optimize Performance**: Tune DRAM and clock settings
4. **Add Peripherals**: Enable USB, SPI, I2C support

## Conclusion

Building U-Boot for the Lichee Pi Nano requires attention to detail but follows a straightforward process. The key points are:

- **Proper toolchain setup** with ARM cross-compiler
- **Correct defconfig** for the F1C100s SoC
- **Careful SD card installation** at the right offset
- **Serial console** for debugging and interaction

The Lichee Pi Nano's small form factor and low cost make it an excellent platform for learning embedded Linux development. With a working U-Boot, you're ready to proceed with kernel and filesystem development.

## References

- [Linux Sunxi U-Boot Documentation](https://linux-sunxi.org/U-Boot)
- [U-Boot Official Documentation](https://docs.u-boot.org/)
- [Allwinner F1C100s Datasheet](http://linux-sunxi.org/F1C100s)
- [Lichee Pi Nano Hardware Documentation](http://wiki.sipeed.com/hardware/en/lichee/nano/nano.html)
