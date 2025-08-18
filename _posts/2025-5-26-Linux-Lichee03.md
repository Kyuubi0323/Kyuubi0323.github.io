---
title: Building Linux-Kernel for Lichee Pi Nano
date: 2025-05-26 14:30:00 +0700
categories: [Hardware Projects, LicheePi]
tags: [lichee, u-boot, linux]     
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

## SD Card Preparation

### Partition Layout

```bash
# Create partitions (assuming /dev/sdX is your SD card)
sudo fdisk /dev/sdX

# Create two partitions:
# 1. FAT32 boot partition (32MB)
# 2. ext4 root partition (remaining space)

# Format partitions
sudo mkfs.vfat /dev/sdX1
sudo mkfs.ext4 /dev/sdX2
```

### Copy Boot Files

```bash
# Mount boot partition
sudo mkdir -p /mnt/boot
sudo mount /dev/sdX1 /mnt/boot

# Copy kernel and device tree
sudo cp arch/arm/boot/zImage /mnt/boot/
sudo cp arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb /mnt/boot/

# Copy U-Boot files (from previous U-Boot build)
sudo cp u-boot-sunxi-with-spl.bin /mnt/boot/
```

## Boot Script Configuration

### Create boot.cmd

```bash
# Create boot command script
cat > boot.cmd << 'EOF'
# Load kernel and device tree
fatload mmc 0 0x80008000 zImage
fatload mmc 0 0x80c00000 suniv-f1c100s-licheepi-nano.dtb

# Set kernel command line
setenv bootargs console=ttyS0,115200 earlyprintk root=/dev/mmcblk0p2 rootwait panic=10

# Boot kernel
bootz 0x80008000 - 0x80c00000
EOF

# Generate boot.scr
sudo mkimage -C none -A arm -T script -d boot.cmd /mnt/boot/boot.scr
```

### Boot Parameters Explanation

```
console=ttyS0,115200    # Serial console output
earlyprintk             # Early kernel messages
root=/dev/mmcblk0p2     # Root filesystem location
rootwait               # Wait for root device
panic=10               # Reboot after 10 seconds on panic
```

## Root Filesystem Setup

### Mount Root Partition

```bash
# Mount root partition
sudo mkdir -p /mnt/rootfs
sudo mount /dev/sdX2 /mnt/rootfs
```

### Install Base System

```bash
# Option 1: Use existing rootfs
sudo tar -xf rootfs.tar.gz -C /mnt/rootfs/

# Option 2: Bootstrap minimal system
sudo debootstrap --arch=armhf --foreign bullseye /mnt/rootfs/
```

### Install Kernel Modules

```bash
# Copy modules to root filesystem
sudo cp -r modules_install/lib/modules/* /mnt/rootfs/lib/modules/
```

## Testing and Validation

### Serial Console Connection

```bash
# Connect via USB-to-Serial adapter
# TX -> Pin 4 (UART0_TX)
# RX -> Pin 5 (UART0_RX)  
# GND -> Pin 6 (GND)

# Monitor serial output
sudo minicom -D /dev/ttyUSB0 -b 115200
```

### Boot Process Verification

Expected boot sequence:
1. U-Boot SPL loads
2. U-Boot loads kernel and DTB
3. Kernel initializes hardware
4. Root filesystem mounts
5. Init system starts

### Kernel Version Check

```bash
# After successful boot
uname -a
cat /proc/version
```

## Troubleshooting

### Kernel Won't Boot

```bash
# Enable early printk in kernel config
Kernel hacking --->
    [*] Early printk

# Check U-Boot environment
printenv

# Verify load addresses don't conflict
# Kernel: 0x80008000
# DTB: 0x80c00000
```

### Missing Device Support

```bash
# Check device tree compatibility
cat /proc/device-tree/compatible

# Verify DTB loading
dmesg | grep -i "machine model"
```

### Module Loading Issues

```bash
# Check module dependencies
lsmod
modinfo <module_name>

# Verify module paths
ls /lib/modules/$(uname -r)/
```

## Performance Optimization

### Compiler Optimizations

```bash
# Enable optimizations in kernel config
General setup --->
    Compiler optimization level --->
        (X) Optimize for size (-Os)
```

### Memory Configuration

```bash
# Adjust for 32MB RAM constraint
# Reduce kernel memory usage
CONFIG_SLUB=y
CONFIG_CC_OPTIMIZE_FOR_SIZE=y
```

## Advanced Features

### Custom Device Tree Modifications

```bash
# Edit device tree source
vim arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dts

# Add custom peripherals or modify pinmux
# Recompile DTB after changes
```

### Kernel Development

```bash
# Create development branch
git checkout -b lichee-nano-dev

# Apply custom patches
git am *.patch

# Build and test iteratively
```

## Automation Script

```bash
#!/bin/bash
# build_lichee_kernel.sh - Automated kernel build

set -e

CROSS_COMPILE=arm-linux-gnueabihf-
ARCH=arm
JOBS=$(nproc)

echo "Building kernel for Lichee Pi Nano..."

# Configure
make ARCH=${ARCH} CROSS_COMPILE=${CROSS_COMPILE} sunxi_defconfig

# Build kernel
make ARCH=${ARCH} CROSS_COMPILE=${CROSS_COMPILE} -j${JOBS} zImage

# Build device tree
make ARCH=${ARCH} CROSS_COMPILE=${CROSS_COMPILE} -j${JOBS} dtbs

# Build modules
make ARCH=${ARCH} CROSS_COMPILE=${CROSS_COMPILE} -j${JOBS} modules

echo "Build complete!"
echo "Kernel: arch/arm/boot/zImage"
echo "DTB: arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb"
```

## Deployment Workflow

### Continuous Integration

```bash
# Test build on multiple kernel versions
for version in v6.1 v6.6 v6.10; do
    git checkout ${version}
    ./build_lichee_kernel.sh
done
```

### Quick Deploy

```bash
#!/bin/bash
# deploy_kernel.sh - Quick kernel deployment

BOOT_MOUNT=/mnt/boot
KERNEL_PATH=arch/arm/boot/zImage
DTB_PATH=arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb

sudo cp ${KERNEL_PATH} ${BOOT_MOUNT}/
sudo cp ${DTB_PATH} ${BOOT_MOUNT}/
sudo sync
sudo umount ${BOOT_MOUNT}

echo "Kernel deployed to SD card"
```

