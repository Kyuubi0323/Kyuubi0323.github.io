---
title: Buildroot Build File System
date: 2025-8-10 8:30:00 +0700
categories: [Embedded Systems, LicheePi]
tags: [lichee, linux]     
comments: false
---

This article describes how to build a filesystem with Buildroot for Lichee Nano, including getting the source code from GitHub, configuring compilation options, compiling, packaging, downloading, and viewing startup logs. It also compares the impact of different C libraries on filesystem size, recommending musl for reduced size. Packaging script and example `rootfs.tar` files are provided.

---

## 1. Get the Buildroot Source Code

You can download Buildroot from the [official site](https://buildroot.org/) or GitHub:

**Download from Official:**
```sh
wget https://buildroot.org/downloads/buildroot-2017.08.tar.gz
tar xvf buildroot-2017.08.tar.gz
```

**Download from GitHub:**
```sh
git clone https://github.com/buildroot/buildroot.git
# Latest version at the time of writing: 2022.02.x
```
> *Recommendation: Use the GitHub source code package. The official lichee package may not compile successfully.*

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

**Modify the following configuration:**

- **Target options**
  - Target Architecture: `ARM (little endian)`
  - Target Binary Format: `ELF`
  - Target Architecture Variant: `arm926t`
  - Enable VFP extension support: *(unchecked)*
  - Target ABI: `EABI`
  - Floating point strategy: `Soft float`
  - ARM instruction set: `ARM`
- **Toolchain**
  - C library: `musl` *(Recommended for smaller filesystem size)*

---

## 3. Compile

Simply run:

```sh
make
```
> *Note: Multi-threaded compilation is not supported. Depending on download speed, compilation may take from half an hour to half a day.*

If downloads are slow, lichee officially suggests using `dl.zip`, but the extracted directory may not match Buildroot's requirements. It's often necessary to download packages again during compilation.

Once successful, you'll get the filesystem tar package:  
`output/image/rootfs.tar`

---

## 4. Filesystem Size Comparison

Tested with different C libraries:

**Buildroot 2017.08:**
- `uClibc-ng`: `rootfs.tar` ≈ 1.6 MB
- `glibc`: `rootfs.tar` ≈ 3.5 MB
- `musl`: `rootfs.tar` ≈ 1.6 MB

**Buildroot 2021.02.4:**
- `uClibc-ng`: `rootfs.tar` ≈ 2.0 MB
- `glibc`: `rootfs.tar` ≈ 3.8 MB
- `musl`: `rootfs.tar` ≈ 2.1 MB

> *musl or uClibc-ng fit well in SPI-flash.*

**Sample rootfs.tar (uClibc-ng, root passwordless):**
- `buildrootfs-2017-lichee-nano-rootfs.tar`
- `buildrootfs-2021.02.4-lichee-nano-rootfs.tar`

---

## 5. Packaging and Burning to SPI-Flash

Package the compiled files into a `jfss2` image and burn to SPI-flash.

### Packaging Script Example

```bash
#!/bin/bash

curPath=$(readlink -f "$(dirname "$0")")
# root.tar path
_ROOTFS_FILE=$curPath/output/image/rootfs.tar
# .ko files path
_MOD_FILE=$curPath/../linux/out/lib/modules

mkdir rootfs
echo "Packing rootfs..."
# Extract rootfs.tar
tar -xvf $_ROOTFS_FILE -C ./rootfs >/dev/null &&\
# Copy .ko files to lib/modules
cp -r $_MOD_FILE  rootfs/lib/modules/
# Create filesystem image (adjust params for your SPI-flash)
mkfs.jffs2 -s 0x100 -e 0x10000 --pad=0xAF0000 -d rootfs/ -o jffs2.img
echo "rootfs update done!"
```

### Burn the Image

Use `sunxi-fel`:

```sh
sudo sunxi-fel -p spiflash-write 0x0510000 ./jffs2.img
```
> *After burning, power on and you should see a successful boot.*

---

## 6. Startup Log

*(Insert your boot log image or output here)*

---

## Appendix: Common Configurations & Notes

- Welcome message, login prompt, and root password are in system configs.
- No need to check with kernel/bootloader, as they're directly burned onto SPI-flash.
- To create other image formats, use the extracted tar and tools like `mkfs.jffs2`.
- Toolchain's linux header sets the compiler; usually can be ignored.
- Further learning can be found in official Buildroot documentation and archives.

---

## References

- [Buildroot Official Site](https://buildroot.org/)
- [Buildroot GitHub](https://github.com/buildroot/buildroot)
- [Lichee Nano Official Documentation](#)