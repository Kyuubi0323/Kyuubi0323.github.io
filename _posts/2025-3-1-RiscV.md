---
title: Buildroot Build File System
date: 2025-8-10 8:30:00 +0700
categories: [Embedded Systems]
tags: [lichee, u-boot, linux]     
comments: false
---

This article describes how to build a filesystem with Buildroot for Lichee Nano, including getting the source code from GitHub, configuring compilation options, compiling, packaging, downloading, and viewing startup logs. It also compares the impact of different C libraries on filesystem size, recommending musl for reduced size. Packaging script and example `rootfs.tar` files are provided.

---

<h3 id="architecture" style="font-weight: bold;">Architecture</h3>

<h3 id="get-buildroot" style="font-weight: bold;">1. Get the Buildroot Source Code</h3>

You can download Buildroot from the <a href="https://buildroot.org/">official site</a> or GitHub:

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
> <em>Recommendation: Use the GitHub source code package. The official lichee package may not compile successfully.</em>

---

<h3 id="pre-compile-config" style="font-weight: bold;">2. Pre-Compile Configuration</h3>

Navigate to the Buildroot directory and enter the configuration page:

```sh
make menuconfig
```

If a `.config` file exists, delete it first:

```sh
rm .config -fv
```

<strong>Modify the following configuration:</strong>

<ul>
<li><strong>Target options</strong>
  <ul>
    <li>Target Architecture: <code>ARM (little endian)</code></li>
    <li>Target Binary Format: <code>ELF</code></li>
    <li>Target Architecture Variant: <code>arm926t</code></li>
    <li>Enable VFP extension support: <em>(unchecked)</em></li>
    <li>Target ABI: <code>EABI</code></li>
    <li>Floating point strategy: <code>Soft float</code></li>
    <li>ARM instruction set: <code>ARM</code></li>
  </ul>
</li>
<li><strong>Toolchain</strong>
  <ul>
    <li>C library: <code>musl</code> <em>(Recommended for smaller filesystem size)</em></li>
  </ul>
</li>
</ul>

---

<h3 id="compile" style="font-weight: bold;">3. Compile</h3>

Simply run:

```sh
make
```
> <em>Note: Multi-threaded compilation is not supported. Depending on download speed, compilation may take from half an hour to half a day.</em>

If downloads are slow, lichee officially suggests using <code>dl.zip</code>, but the extracted directory may not match Buildroot's requirements. It's often necessary to download packages again during compilation.

Once successful, you'll get the filesystem tar package:  
<code>output/image/rootfs.tar</code>

---

<h3 id="filesystem-size" style="font-weight: bold;">4. Filesystem Size Comparison</h3>

Tested with different C libraries:

<strong>Buildroot 2017.08:</strong>
<ul>
<li><code>uClibc-ng</code>: <code>rootfs.tar</code> ≈ 1.6 MB</li>
<li><code>glibc</code>: <code>rootfs.tar</code> ≈ 3.5 MB</li>
<li><code>musl</code>: <code>rootfs.tar</code> ≈ 1.6 MB</li>
</ul>

<strong>Buildroot 2021.02.4:</strong>
<ul>
<li><code>uClibc-ng</code>: <code>rootfs.tar</code> ≈ 2.0 MB</li>
<li><code>glibc</code>: <code>rootfs.tar</code> ≈ 3.8 MB</li>
<li><code>musl</code>: <code>rootfs.tar</code> ≈ 2.1 MB</li>
</ul>

> <em>musl or uClibc-ng fit well in SPI-flash.</em>

<strong>Sample rootfs.tar (uClibc-ng, root passwordless):</strong>
<ul>
<li>buildrootfs-2017-lichee-nano-rootfs.tar</li>
<li>buildrootfs-2021.02.4-lichee-nano-rootfs.tar</li>
</ul>

---

<h3 id="packaging-burning" style="font-weight: bold;">5. Packaging and Burning to SPI-Flash</h3>

Package the compiled files into a <code>jfss2</code> image and burn to SPI-flash.

<strong>Packaging Script Example</strong>

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

<strong>Burn the Image</strong>

Use <code>sunxi-fel</code>:

```sh
sudo sunxi-fel -p spiflash-write 0x0510000 ./jffs2.img
```
> <em>After burning, power on and you should see a successful boot.</em>

---

<h3 id="startup-log" style="font-weight: bold;">6. Startup Log</h3>

*(Insert your boot log image or output here)*

---

<h3 id="appendix" style="font-weight: bold;">Appendix: Common Configurations &amp; Notes</h3>

<ul>
<li>Welcome message, login prompt, and root password are in system configs.</li>
<li>No need to check with kernel/bootloader, as they're directly burned onto SPI-flash.</li>
<li>To create other image formats, use the extracted tar and tools like <code>mkfs.jffs2</code>.</li>
<li>Toolchain's linux header sets the compiler; usually can be ignored.</li>
<li>Further learning can be found in official Buildroot documentation and archives.</li>
</ul>

---

<h3 id="references" style="font-weight: bold;">References</h3>

<ul>
<li><a href="https://buildroot.org/">Buildroot Official Site</a></li>
<li><a href="https://github.com/buildroot/buildroot">Buildroot GitHub</a></li>
<li><a href="#">Lichee Nano Official Documentation</a></li>
</ul>