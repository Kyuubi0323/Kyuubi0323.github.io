---
title: Creating Bootable SD Card
date: 2025-8-12 10:30:00 +0700
categories: [Embedded Systems, LicheePi]
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
| 8KB 	| 16 	| - 	| SPL + U-Boot proper (combined image, see note below)


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
# If flashing directly to an onboard SD/eMMC slot instead of a USB reader,
# the device is usually /dev/mmcblk0 and partitions are /dev/mmcblk0p1, p2, ...
# (this matches root=/dev/mmcblk0p2 used in bootargs throughout this series) — in that case:
#   export card=/dev/mmcblk0
#   export p="p"

# Clear the beginning of the SD card
sudo dd if=/dev/zero of=${card} bs=1M count=1 status=progress
```

### Step 2: Bootloader

You will need to write the u-boot-sunxi-with-spl.bin to the sd-card

```bash
sudo dd if=u-boot/u-boot-sunxi-with-spl.bin of=${card} bs=1024 seek=8
```

### Step 3: Partition

With recent U-Boot it's fine to use ext2/ext4 as boot partition, and other filesystems in the root partition too. Partition the card with a 16MB boot partition starting at 1MB, and the rest as root partition 

```bash
sudo blockdev --rereadpt ${card}
sudo sfdisk ${card} <<EOT
1M,16M,c
,,L
EOT
#create partition format
sudo mkfs.vfat ${card}${p}1
sudo mkfs.ext4 ${card}${p}2
cardroot=${card}${p}2
```

add boot.scr and kernel image

```bash
sudo mount ${card}${p}1 /mnt/
sudo cp linux/arch/arm/boot/zImage /mnt/
sudo cp linux/arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb /mnt/

sudo cp boot.scr /mnt/
sync
sudo umount /mnt/
```

> Always run `sync` before `umount`/removing the card. A `cp` without a following `sync` can leave the old file's data still on the card even though the directory entry looks updated — the single most common reason a freshly-copied image still boots the previous one. (`suniv-f1c100s-licheepi-nano.dtb` above is the path for the 4.14-era kernel tree used in this series; on the mainline tree it lives under `arch/arm/boot/dts/allwinner/` instead.)
### Step 4: Rootfs

This depends on what distribution you want to install. Which partition layout you use does not matter much, since the root device is passed to the kernel as argument. You might need tweaks to /etc/fstab or other files if your layout does not match what the rootfs expects. As of this writing most available images use two partitions with separate /boot.
Using rootfs tarball

```bash
sudo mkfs.ext4 ${card}${p}2   # if not already formatted from Step 3
sudo mount ${card}${p}2 /mnt/
sudo tar -C /mnt/ -xpf my-chosen-rootfs.tar.bz2   # add -j if your tarball is actually bzip2-compressed
sync
sudo umount /mnt
```

## References

- [Linux-Sunxi Bootable SD Card Guide](https://linux-sunxi.org/Bootable_SD_card)
- [U-Boot Documentation](https://docs.u-boot.org/)
- [Allwinner Boot Process](https://linux-sunxi.org/BROM)