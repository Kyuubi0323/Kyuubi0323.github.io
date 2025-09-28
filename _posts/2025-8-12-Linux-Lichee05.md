---
title: Creating Bootable SD Card
date: 2025-8-12 10:30:00 +0700
categories: [Hardware Projects, LicheePi]
tags: [lichee, linux]     
comments: false
---

# Creating Bootable SD Cards for Linux-Sunxi Devices

When working with **Allwinner/Sunxi** based boards like the Lichee Pi series, Orange Pi, or Banana Pi, creating a properly structured bootable SD card is crucial for system functionality. 

## Understanding Sunxi Boot Process

The Allwinner/Sunxi SoCs follow a specific boot sequence that requires careful SD card preparation:

1. **BROM (Boot ROM)**: Built-in first-stage bootloader
2. **SPL (Secondary Program Loader)**: Second stage bootloader  
3. **U-Boot**: Third stage bootloader
4. **Kernel**: Linux kernel and filesystem

## SD Card Partitioning Requirements

### Basic Partition Layout

For sunxi devices, the SD card requires a specific partition structure:


| Start | Sector | Size | Usage
|----------------|------------------|----------------|------------------|
| 0KB 	| 0 	| 8KB 	| Unused, available for an MBR or (limited) GPT partition table
| 8KB 	| 16 	| 32KB 	| Initial SPL loader
| 40KB 	| 80 	| - 	| U-Boot proper 


### Critical Sector Locations

The boot components must be placed at exact sector positions:

- **Sector 16 (8KB)**: SPL location - this is where BROM looks for the SPL
- **Sector 32768 (16MB)**: U-Boot main binary location
- **Sector 40960 (20MB)**: Start of first partition (recommended)

## Creating the Bootable SD Card

### Step 1: Prepare the SD Card

**Warning**: This will erase all data on the SD card!

```bash
# Identify your SD card device (e.g., /dev/sdX: /dev/sdc)
lsblk

# Unmount any mounted partitions
sudo umount /dev/sdX*

export card=/dev/sdX
export p=""
# Clear the beginning of the SD card
dd if=/dev/zero of=${card} bs=1M count=1 status=progress
```

### Step 2: Bootloader

You will need to write the u-boot-sunxi-with-spl.bin to the sd-card

```bash
dd if=u-boot-sunxi-with-spl.bin of=${card} bs=1024 seek=8
```

### Step 3: Partition

With recent U-Boot it's fine to use ext2/ext4 as boot partition, and other filesystems in the root partition too. Partition the card with a 16MB boot partition starting at 1MB, and the rest as root partition 

```bash
sudo blockdev --rereadpt ${card}
sudo sfdisk ${card} <<EOT
1M,,L
EOT
#create partition format
mkfs.vfat ${card}${p}1
mkfs.ext4 ${card}${p}2
cardroot=${card}${p}2
```

add boot.scr and kernel image

```bash
sudo mount ${card}${p}1 /mnt/
sudo cp linux-sunxi/arch/arm/boot/zImage /mnt/
sudo cp boot.scr /mnt/
sudo umount /mnt/
```
### Step 4: Rootfs

This depends on what distribution you want to install. Which partition layout you use does not matter much, since the root device is passed to the kernel as argument. You might need tweaks to /etc/fstab or other files if your layout does not match what the rootfs expects. As of this writing most available images use two partitions with separate /boot.
Using rootfs tarball

```bash
sudo mount ${card}${p}2 /mnt/
sudo tar -C /mnt/ -xjpf my-chosen-rootfs.tar.bz2
sudo umount /mnt
```

## References

- [Linux-Sunxi Bootable SD Card Guide](https://linux-sunxi.org/Bootable_SD_card)
- [U-Boot Documentation](https://docs.u-boot.org/)
- [Allwinner Boot Process](https://linux-sunxi.org/BROM)