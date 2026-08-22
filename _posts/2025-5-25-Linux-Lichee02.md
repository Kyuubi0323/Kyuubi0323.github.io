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

Depending on how the SD card is connected, the location to write data to can be different. Throughout this document ${card} refers to the SD card and ${p} to the partition if any. 
If the SD card is connected via a USB adapter, linux will know it for example as /dev/sdb (with /dev/sda being a boot drive). Please notice that this device can be different based on numerous factors, so when not sure, check the last few lines of dmesg after plugging in the device (dmesg | tail). If connected via a SD slot on a device, linux will know it as /dev/mmcblk0 (or mmcblk1, mmcblk2 depending on which mmc slot is used).

To summarize: ${card} and ${card}${p}1 mean /dev/sdb and /dev/sdb1 on a USB connected SD card, and /dev/mmcblk0, /dev/mmcblk0p1 on an mmc controller connected device.

SD Card Layout
A default U-Boot build for an Allwinner based board uses the following layout on (micro-)SD cards or eMMC storage (from v2018.05 or newer):

```table
start	sector	size	usage
0KB	0	8KB	Unused, available for an MBR or (limited) GPT partition table
8KB	16	32KB	Initial SPL loader
40KB	80	-	U-Boot proper
```

Typically partitions start at 1MB (which is the default setting of most partitioning tools), but there is no hard requirement for this, so U-Boot can grow bigger than 984KB, if needed.

The 8KB offset is dictated by the BROM, it will check for a valid eGON/TOC0 header at this location. The 40KB offset for U-Boot proper is the default U-Boot setting and can be changed at build time using the CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR configuration variable.

Newer SoCs (tested on H2+, A64, H5, H6, T113) can also load the SPL from sector 256 (128KB) of an SD card or eMMC, if no valid eGON/TOC0 signature is found at 8KB (BROM boot order). The U-Boot proper offset needs to be adjusted accordingly in this case. U-boot patch more details

Mainline U-Boot used to have a more complex, fixed layout for the SD card/eMMC sectors in the first Megabyte:

Legacy SD card layout

```table
start	sector	size	usage
0KB	0	8KB	Unused, available for MBR (partition table etc.)
8KB	16	32KB	Initial SPL loader
40KB	80	504KB	U-Boot
544KB	1088	128KB	environment
672KB	1344	128KB	Falcon mode boot params
800KB	1600	-	Falcon mode kernel start
1024KB	2048	-	Free for partitions
```

As the feature set of U-Boot proper grew over time, this proved to be too restricting, as we completely filled the area before the environment and started to corrupt it. To avoid future issues, it was decided to move the default location for the environment to a FAT partition, which is more flexible and has no real size limits.

### Identify the card


First identify the device of the card and export it as ${card}. The commands
```bash
cat /proc/partitions
or
blkid -c /dev/null
```

can help with finding available/correct partition names.

If the SD card is connected via USB and is sdX (replace X for a correct letter)

```bash
#my card is connected via /dev/sdd1 --> X = d
export card=/dev/sdc
export p=""
```

If the SD card is connected via mmc and is mmcblk0

```bash
export card=/dev/mmcblk0
export p=p
```


### Cleaning
To be on safe side erase the first part of your SD Card (also clears the partition table).
```bash
sudo dd if=/dev/zero of=${card} bs=1M count=1
#If you wish to keep the partition table, run:
sudo dd if=/dev/zero of=${card} bs=1k count=1023 seek=1
```

### Write the Bootloader

The build produces `u-boot-sunxi-with-spl.bin`, which already bundles the SPL and U-Boot proper together at the correct relative offsets. This means it can be written directly to the SD card at the 8KB offset with a single `dd` command — no partitioning is required for the bootloader to work.

```bash
sudo dd if=u-boot/u-boot-sunxi-with-spl.bin of=${card} bs=1024 seek=8
sync
```

- `bs=1024 seek=8` writes starting at byte offset 8192 (8KB), which is where the BROM expects to find the eGON/TOC0 header.
- Always double-check `${card}` with `lsblk` or `dmesg | tail` before running `dd` — writing to the wrong device can destroy data on that disk.
- `sync` ensures all buffered writes are flushed to the card before you remove it.




### To update the bootloader from the U-Boot prompt itself:

```bash
mw.b 0x48000000 0x00 0x100000                 # Zero buffer
tftp 0x48000000 u-boot-sunxi-with-spl.bin     # Or use load to read from MMC or SCSI etc
mmc erase 0x10 0x400                          # Erase the MMC region containing U-Boot, do not reset at this point!
mmc write 0x48000000 0x10 0x400               # Write updated U-Boot
```

### Boot and Verify

Connect a USB-to-TTL serial adapter to the F1C100s UART pins (typically 3.3V TX/RX/GND) and open a serial terminal:

```bash
sudo picocom -b 115200 /dev/ttyUSB0
```

Insert the SD card into the Lichee Pi Nano and power it on. On success you should see SPL and U-Boot banners on the serial console, followed by the U-Boot prompt:

```
U-Boot 2024.01 (Aug 22 2026 - 00:15:28 +0700) Allwinner Technology

CPU:   Allwinner F Series (SUNIV)
Model: Lichee Pi Nano
DRAM:  32 MiB
Core:  30 devices, 18 uclasses, devicetree: separate
WDT:   Not starting watchdog@1c20ca0
MMC:   mmc@1c0f000: 0
Loading Environment from FAT... Unable to use mmc 0:0...
In:    serial@1c25000
Out:   serial@1c25000
Err:   serial@1c25000
Net:   No ethernet found.
Hit any key to stop autoboot:  0 
=> �
Unknown command '�' - try 'help'
=> ��
Unknown command '��' - try 'help'
=> 
Unknown command '��' - try 'help'
=> 

```

From the `=>` prompt you can inspect the environment (`printenv`), check detected storage (`mmc list`), or proceed to load and boot a Linux kernel.

```bash
=> printenv
arch=arm
baudrate=115200
board=sunxi
board_name=sunxi
boot_a_script=load ${devtype} ${devnum}:${distro_bootpart} ${scriptaddr} ${prefix}${script}; source ${scriptaddr}
boot_extlinux=sysboot ${devtype} ${devnum}:${distro_bootpart} any ${scriptaddr} ${prefix}${boot_syslinux_conf}
boot_prefixes=/ /boot/
boot_script_dhcp=boot.scr.uimg
boot_scripts=boot.scr.uimg boot.scr
boot_syslinux_conf=extlinux/extlinux.conf
boot_targets=fel mmc0 pxe dhcp 
bootcmd=run distro_bootcmd
bootcmd_dhcp=devtype=dhcp; if dhcp ${scriptaddr} ${boot_script_dhcp}; then source ${scriptaddr}; fi;
bootcmd_fel=if test -n ${fel_booted} && test -n ${fel_scriptaddr}; then echo '(FEL boot)'; source ${fel_scriptaddr}; fi
bootcmd_mmc0=devnum=0; run mmc_boot
bootcmd_pxe=dhcp; if pxe get; then pxe boot; fi
bootdelay=2
bootm_size=0x1700000
console=ttyS0,115200
cpu=arm926ejs
dfu_alt_info_ram=kernel ram 0x81000000 0x1000000;fdt ram 0x81d50000 0x100000;ramdisk ram 0x81800000 0x4000000
distro_bootcmd=for target in ${boot_targets}; do run bootcmd_${target}; done
fdt_addr_r=0x81d50000
fdtcontroladdr=81e76da0
fdtfile=suniv-f1c100s-licheepi-nano.dtb
fdtoverlay_addr_r=0x81d20000
kernel_addr_r=0x81000000
loadaddr=0x81000000
mmc_boot=if mmc dev ${devnum}; then devtype=mmc; run scan_dev_for_boot_part; fi
mmc_bootdev=0
partitions=name=loader1,start=8k,size=32k,uuid=${uuid_gpt_loader1};name=loader2,size=984k,uuid=${uuid_gpt_loader2};name=esp,size=128M,bootable,uuid=${uuid_gpt_esp};name=system,size=-,uuid=${uuid_gpt_system};
pxefile_addr_r=0x81d00000
ramdisk_addr_r=0x81800000
scan_dev_for_boot=echo Scanning ${devtype} ${devnum}:${distro_bootpart}...; for prefix in ${boot_prefixes}; do run scan_dev_for_extlinux; run scan_dev_for_scripts; done;
scan_dev_for_boot_part=part list ${devtype} ${devnum} -bootable devplist; env exists devplist || setenv devplist 1; for distro_bootpart in ${devplist}; do if fstype ${devtype} ${devnum}:${distro_bootpart} bootfstype; then part uuid ${devtype} ${devnum}:${distro_bootpart} distro_bootpart_uuid ; run scan_dev_for_boot; fi; done; setenv devplist
scan_dev_for_extlinux=if test -e ${devtype} ${devnum}:${distro_bootpart} ${prefix}${boot_syslinux_conf}; then echo Found ${prefix}${boot_syslinux_conf}; run boot_extlinux; echo EXTLINUX FAILED: continuing...; fi
scan_dev_for_scripts=for script in ${boot_scripts}; do if test -e ${devtype} ${devnum}:${distro_bootpart} ${prefix}${script}; then echo Found U-Boot script ${prefix}${script}; run boot_a_script; echo SCRIPT FAILED: continuing...; fi; done
scriptaddr=0x81d40000
soc=sunxi
stderr=serial@1c25000
stdin=serial@1c25000
stdout=serial@1c25000
uuid_gpt_esp=c12a7328-f81f-11d2-ba4b-00a0c93ec93b
uuid_gpt_system=69dad710-2ce4-4e3c-b16c-21a1d49abed3

Environment size: 2710/65532 bytes


=> mmc list
mmc@1c0f000: 0 (SD)
```


### For kernel autoload
```boot.cmd
setenv bootargs 'console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait panic=10'

load mmc 0:1 0x81000000 zImage
load mmc 0:1 0x81d00000 suniv-f1c100s-licheepi-nano.dtb

bootz 0x81000000 - 0x81d00000
```
and convert it to boot.scr
```code
mkimage -C none -A arm -T script -d boot.cmd boot.scr
```