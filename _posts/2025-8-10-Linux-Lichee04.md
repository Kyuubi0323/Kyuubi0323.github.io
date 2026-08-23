---
title: Building Rootfs for Lichee Pi Nano
date: 2025-8-10 8:30:00 +0700
categories: [Embedded Systems, LicheePi]
tags: [lichee, linux]     
comments: false
---

This article describes how to build a filesystem with Buildroot for Lichee Nano, including getting the source code from GitHub, configuring compilation options, compiling, and **installing the rootfs onto the SD card's second partition**  — the layout used by the [linux-sunxi Bootable SD card convention](https://linux-sunxi.org/Bootable_SD_card)

---

## 1. Get the Buildroot Source Code

You can download Buildroot from the [official site](https://buildroot.org/) or GitHub:

**Download from GitHub**
```sh
git clone --branch 2023.02.11 --depth=1 https://github.com/buildroot/buildroot.git
cd buildroot/
```

---

## 2. Pre-Compile Configuration

Navigate to the Buildroot directory and enter the configuration page:

```sh
make menuconfig
```

If a `.config` file exists, delete it first:

```sh
rm .config -fv
```

**Modify the following configuration — these match the F1C100s core (ARM926EJ-S / ARMv5TE, no hardware FPU), the same constraint that governs the kernel toolchain choice:**

- **Target options**
  - Target Architecture: `ARM (little endian)`
  - Target Binary Format: `ELF`
  - Target Architecture Variant: `arm926t`
  - Enable VFP extension support: **unchecked** — the Nano has no VFP unit; leaving this checked builds userspace that will crash/fail to run on this board
  - Target ABI: `EABI`
  - Floating point strategy: `Soft float`
  - ARM instruction set: `ARM`
- **Toolchain**
  - C library: `musl` or `uClibc-ng` (recommended — see size comparison below; avoid `glibc` on an 8MB-class flash target)
- **System configuration**
  - `(Lichee Pi)` System hostname
  - `(licheepi)` Root password
  - `[*] Run a getty (login prompt) after boot` → enable, port `ttyS0`, baud `115200` — this is what actually gives you a login prompt over serial; see the `/etc/inittab` note in step 5
  - `[*] remount root filesystem read-write during boot`

> This mirrors the same soft-float requirement covered in the kernel build post — Buildroot's own toolchain here is independent of the one used for the kernel, so it needs to be configured for soft-float ARMv5 separately; it does not inherit the choice made for `CROSS_COMPILE` when building `zImage`.

---

## 3. Compile

Simply run:

```sh
make
```
> *Note: Multi-threaded compilation is not supported by top-level `make`. Depending on download speed, compilation may take from half an hour to half a day.*

Once successful, you'll get the filesystem tarball:  
`output/images/rootfs.tar`

---

## 4. Installing the Rootfs — SD card second partition (recommended path)

This is the path actually validated on real hardware for this board: a 2-partition SD card, FAT32 boot partition (`zImage` + `.dtb` + `boot.scr`) as partition 1, and the rootfs as partition 2, formatted `ext4`. This matches both the official Lichee-Pi `rootfs.rst` guide and the general linux-sunxi SD-card convention, and it's the exact layout that got a full kernel boot log ending in "root filesystem mounted" earlier in this series — the only thing missing at that point was the rootfs content itself, which this step fills in.

```bash
# Format partition 2 as ext4 if you haven't already (adjust device node!)
sudo mkfs.ext4 /dev/sdX2

# Mount and extract
sudo umount /dev/sdX2 2>/dev/null
sudo mount /dev/sdX2 /mnt
sudo cp ./output/images/rootfs.tar /mnt/
sudo tar -xf /mnt/rootfs.tar -C /mnt/
sudo rm /mnt/rootfs.tar
sync
sudo umount /dev/sdX2
```

---

## 5. Startup Log

With rootfs correctly placed on `mmcblk0p2` and `/etc/inittab` configured for `ttyS0`, boot proceeds past the point where the previous post's kernel-only test stopped (`Kernel panic - not syncing: No working init found`) straight through to a working login prompt:

```text
    1.537024] Freeing unused kernel memory: 1024K
[    1.655580] EXT4-fs (mmcblk0p2): re-mounted. Opts: data=ordered
Seeding 2048 bit[    1.874288] random: crng init done
s and crediting
Saving 2048 bits of creditable seed for next boot
Starting syslogd: OK
Starting klogd: OK
Running sysctl: OK
Starting network: OK

Welcome to Buildroot
Lichee login: licheepi
Password: 
```

---

## References

- [Buildroot Official Site](https://buildroot.org/)
- [Buildroot GitHub](https://github.com/buildroot/buildroot)
- [Lichee Nano rootfs guide (Lichee-Pi/Lichee-Nano-Doc-us-english)](https://github.com/Lichee-Pi/Lichee-Nano-Doc-us-english/blob/master/application/build_sys/rootfs.rst)
- [linux-sunxi: Bootable SD card](https://linux-sunxi.org/Bootable_SD_card)
