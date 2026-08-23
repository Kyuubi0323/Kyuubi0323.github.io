---
title: Building Linux-Kernel for Lichee Pi Nano
date: 2025-05-26 14:30:00 +0700
categories: [Embedded Systems, LicheePi]
tags: [lichee, linux]     
comments: false
---

## Prerequisites

### Hardware Requirements
- Lichee Pi Nano board (Allwinner F1C100s, ARM926EJ-S / ARMv5TE core, **no hardware FPU**)
- MicroSD card (8GB or larger)
- USB-to-Serial adapter (for debugging)
- Linux development machine

### Software Requirements
- Cross-compilation toolchain (see the **hard-float vs soft-float** section below — picking the wrong one silently breaks the build on older kernels)
- Git
- U-Boot (previously built, see `three_uboot.rst` in the [official Lichee-Pi docs](https://github.com/Lichee-Pi/Lichee-Nano-Doc-us-english))
- Make and build essentials

## Kernel Source Acquisition

There is **no dedicated F1C100s/suniv `defconfig` shipped in mainline Linux** — `arch/arm/configs/` only has the generic `sunxi_defconfig`, which targets the ARMv7 sun4i–sun9i family (multi-core, VFP/NEON, HIGHMEM) and is the **wrong architecture level** for the Nano's single ARMv5 core. Two source options actually work for this board:

```bash
# the community/vendor fork used by the official Lichee-Pi guide,
# pinned to an old-but-known-working config for this exact board.
git clone https://github.com/Lichee-Pi/linux.git --depth=1 -b nano-4.14-exp
```

This matches the `lichee_nano_linux.config` floating around the docs, but is a **kernel 4.14 tree** — see the toolchain section, it needs different compiler flags than a modern kernel.

## Kernel Configuration

### Load the nano defconfig

```bash
cp lichee_nano_linux.config .config
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- oldconfig   # answers prompts for symbols new to your tree
```

`oldconfig` re-derives your config against the Kconfig of the tree you actually have — a raw `cp` of a years-old config over a modern source tree leaves it inconsistent (missing symbols that didn't exist yet, stale ones that were removed).

### Manual Configuration

```bash
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- menuconfig
```

### Essential Configuration Options

```
# System V IPC (required for fakeroot/packages)
General setup --->
    [*] System V IPC
```

#### Early console / low-level debug for seeing any boot output

**1. Console is actually configured, not left to the bootloader**

By default the kernel's command line comes entirely from what U-Boot passes in (`ARM_ATAG_DTB_COMPAT_CMDLINE_FROM_BOOTLOADER`). If your `boot.cmd`/`boot.scr` never sets a `console=` in `bootargs`, the kernel has nowhere to print regardless of anything else below. Force a sane default that still lets the bootloader add its own args on top:

```
Boot options --->
    Kernel command line type (Extend bootloader kernel arguments)  --->
    Default kernel command string (CMDLINE): "console=ttyS0,115200n8 earlyprintk"
```

**2. Low-level debug (`DEBUG_LL`) + early printk, with the *correct* UART driver for this specific chip**


```
Kernel hacking --->
    [*] Kernel debugging (DEBUG_KERNEL)
    [*] Kernel low-level debugging functions (DEBUG_LL)
        Kernel low-level debugging port (X) Kernel low-level debugging via 8250 UART (DEBUG_LL_UART_8250)
        Physical base address of debug UART (DEBUG_UART_PHYS): 0x01c25000
        Virtual base address of debug UART (DEBUG_UART_VIRT): 0xf1c25000
        Register offset shift for the 8250 debug UART (DEBUG_UART_8250_SHIFT): 2
        [*] Use 32-bit accesses for 8250 UART (DEBUG_UART_8250_WORD)   <-- critical, see below
    [*] Early printk (EARLY_PRINTK)
```

## Toolchain: hard-float vs soft-float

The F1C100s core (ARM926EJ-S, ARMv5TE) has **no hardware FPU**. `arm-linux-gnueabihf-gcc` defaults to `-mfloat-abi=hard`, which is incompatible with that architecture level:

```bash
$ arm-linux-gnueabihf-gcc -march=armv5te -c test.c -o test.o
cc1: error: '-mfloat-abi=hard': selected architecture lacks an FPU
```

Modern kernel trees (mainline, 6.x/7.x) explicitly force `-msoft-float` in `KBUILD_CFLAGS`, so `arm-linux-gnueabihf-` still works fine there — build with `hf` for a current tree without issue.

**Older kernels (e.g. the 4.14 Lichee-Pi fork) are a different story.** `arch/arm/Makefile` decides the `-march` flag with a compiler probe

**Fix: use the soft-float toolchain for this era of kernel**, matching what the original Lichee-Pi guide specifies:

```bash
sudo apt-get install gcc-arm-linux-gnueabi   # note: no "hf" suffix
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- HOSTCFLAGS="-fcommon" zImage -j$(nproc)
```

## Kernel Compilation

### Build Kernel Image

```bash
# Old 4.14-era tree:
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabi- HOSTCFLAGS="-fcommon" -j$(nproc) zImage
```

The compiled kernel will be located at `arch/arm/boot/zImage`.

### Build Device Tree Blobs

```bash
scripts/config --enable MACH_SUNIV
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) dtbs
```

:) If it fails building the dtb on a modern tree, apply this:

```bash
diff --git a/Makefile b/Makefile
index 3d58dfa97..568dba38e 100644
--- a/Makefile
+++ b/Makefile
@@ -301,7 +301,7 @@ no-dot-config-targets := $(clean-targets) \
                         run-command
 no-sync-config-targets := $(no-dot-config-targets) %install modules_sign kernelrelease \
                          image_name
-single-targets := %.a %.i %.ko %.lds %.ll %.lst %.mod %.o %.rsi %.s %/
+single-targets := %.a %.dtb %.dtbo %.i %.ko %.lds %.ll %.lst %.mod %.o %.rsi %.s %/
 
 config-build   :=
 mixed-build    :=
```

For Lichee Pi Nano, the relevant DTB is:
- 4.14 tree: `arch/arm/boot/dts/suniv-f1c100s-licheepi-nano.dtb` 

### Build Modules (Optional)

```bash
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- -j$(nproc) modules
make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- INSTALL_MOD_PATH=./modules_install modules_install
```

### Build Headers (Optional)

```bash
make ARCH=arm INSTALL_HDR_PATH=./headers_install headers_install
```

## Flashing and Boot Command

Match the kernel/dtb load addresses U-Boot uses in `boot.cmd` to what your build actually produces;

```bash
setenv bootargs console=tty0 console=ttyS0,115200 panic=5 rootwait root=/dev/mmcblk0p2 rw
load mmc 0:1 0x80C00000 suniv-f1c100s-licheepi-nano.dtb
load mmc 0:1 0x80008000 zImage
bootz 0x80008000 - 0x80C00000
```

**After copying `zImage`/`*.dtb` onto the SD card's FAT partition, always `sync` before unmounting.** A `cp` without a following `sync`/`umount` can leave the old file's data still on the card even though the directory entry looks updated — the single most common reason a "rebuilt" image boots identically to the previous one.

## Result

```text
[    0.000000]     lowmem  : 0xc0000000 - 0xc2000000   (  32 MB)
[    0.000000]     pkmap   : 0xbfe00000 - 0xc0000000   (   2 MB)
[    0.000000]     modules : 0xbf000000 - 0xbfe00000   (  14 MB)
[    0.000000]       .text : 0xc0008000 - 0xc0700000   (7136 kB)
[    0.000000]       .init : 0xc0900000 - 0xc0a00000   (1024 kB)
[    0.000000]       .data : 0xc0a00000 - 0xc0a34fe0   ( 212 kB)
[    0.000000]        .bss : 0xc0a3a548 - 0xc0a785d4   ( 249 kB)
[    0.000000] SLUB: HWalign=32, Order=0-3, MinObjects=0, CPUs=1, Nodes=1
[    0.000000] NR_IRQS: 16, nr_irqs: 16, preallocated irqs: 16
[    0.000045] sched_clock: 32 bits at 24MHz, resolution 41ns, wraps every 89478484971ns
[    0.000109] clocksource: timer: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 79635851949 ns
[    0.000601] Console: colour dummy device 80x30
[    0.000682] Calibrating delay loop... 203.16 BogoMIPS (lpj=1015808)
[    0.070223] pid_max: default: 32768 minimum: 301
[    0.070544] Mount-cache hash table entries: 1024 (order: 0, 4096 bytes)
[    0.070587] Mountpoint-cache hash table entries: 1024 (order: 0, 4096 bytes)
[    0.071950] CPU: Testing write buffer coherency: ok
[    0.073513] Setting up static identity map for 0x80100000 - 0x80100058
[    0.075923] devtmpfs: initialized
[    0.081470] clocksource: jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 19112604462750000 ns
[    0.081530] futex hash table entries: 256 (order: -1, 3072 bytes)
[    0.081784] pinctrl core: initialized pinctrl subsystem
[    0.083545] random: get_random_u32 called from bucket_table_alloc+0x80/0x1a4 with crng_init=0
[    0.083780] NET: Registered protocol family 16
[    0.084948] DMA: preallocated 256 KiB pool for atomic coherent allocations
[    0.086651] cpuidle: using governor menu
[    0.108814] SCSI subsystem initialized
[    0.109148] usbcore: registered new interface driver usbfs
[    0.109290] usbcore: registered new interface driver hub
[    0.109478] usbcore: registered new device driver usb
[    0.109876] pps_core: LinuxPPS API ver. 1 registered
[    0.109901] pps_core: Software ver. 5.3.6 - Copyright 2005-2007 Rodolfo Giometti <giometti@linux.it>
[    0.109958] PTP clock support registered
[    0.110556] Advanced Linux Sound Architecture Driver Initialized.
[    0.111393] random: fast init done
[    0.113207] clocksource: Switched to clocksource timer
[    0.138375] NET: Registered protocol family 2
[    0.139654] TCP established hash table entries: 1024 (order: 0, 4096 bytes)
[    0.139722] TCP bind hash table entries: 1024 (order: 0, 4096 bytes)
[    0.139770] TCP: Hash tables configured (established 1024 bind 1024)
[    0.140027] UDP hash table entries: 256 (order: 0, 4096 bytes)
[    0.140081] UDP-Lite hash table entries: 256 (order: 0, 4096 bytes)
[    0.140494] NET: Registered protocol family 1
[    0.141439] RPC: Registered named UNIX socket transport module.
[    0.141478] RPC: Registered udp transport module.
[    0.141494] RPC: Registered tcp transport module.
[    0.141510] RPC: Registered tcp NFSv4.1 backchannel transport module.
[    0.142342] NetWinder Floating Point Emulator V0.97 (double precision)
[    0.144201] Initialise system trusted keyrings
[    0.144745] workingset: timestamp_bits=30 max_order=13 bucket_order=0
[    0.160615] NFS: Registering the id_resolver key type
[    0.160710] Key type id_resolver registered
[    0.160731] Key type id_legacy registered
[    0.173144] Key type asymmetric registered
[    0.173271] Asymmetric key parser 'x509' registered
[    0.173506] Block layer SCSI generic (bsg) driver version 0.4 loaded (major 251)
[    0.173537] io scheduler noop registered
[    0.173554] io scheduler deadline registered
[    0.174254] io scheduler cfq registered (default)
[    0.174285] io scheduler mq-deadline registered
[    0.174303] io scheduler kyber registered
[    0.175280] sun4i-usb-phy 1c13400.phy: Couldn't request ID GPIO
[    0.184614] suniv-pinctrl 1c20800.pinctrl: initialized sunXi PIO driver
[    0.346147] Serial: 8250/16550 driver, 8 ports, IRQ sharing disabled
[    0.352372] console [ttyS0] disabled
[    0.372610] 1c25000.serial: ttyS0 at MMIO 0x1c25000 (irq = 22, base_baud = 6250000) is a 16550A
[    0.852757] console [ttyS0] enabled
[    0.861578] SCSI Media Changer driver v0.25
[    0.867151] ehci_hcd: USB 2.0 'Enhanced' Host Controller (EHCI) Driver
[    0.873779] ehci-platform: EHCI generic platform driver
[    0.879236] ohci_hcd: USB 1.1 'Open' Host Controller (OHCI) Driver
[    0.885518] ohci-platform: OHCI generic platform driver
[    0.891091] usbcore: registered new interface driver usb-storage
[    0.898014] udc-core: couldn't find an available UDC - added [g_cdc] to list of pending drivers
[    0.907029] i2c /dev entries driver
[    0.973328] sunxi-mmc 1c0f000.mmc: base:0xc2853000 irq:18
[    0.980660] usbcore: registered new interface driver usbhid
[    0.986347] usbhid: USB HID core driver
[    1.007693] NET: Registered protocol family 17
[    1.012377] Key type dns_resolver registered
[    1.018785] Loading compiled-in X.509 certificates
[    1.033143] usb_phy_generic usb_phy_generic.0.auto: usb_phy_generic.0.auto supply vcc not found, using dummy regulator
[    1.044803] ------------[ cut here ]------------
[    1.049497] WARNING: CPU: 0 PID: 3 at drivers/usb/musb/sunxi.c:410 sunxi_musb_ep_offset+0x3c/0x54
[    1.058454] sunxi_musb_ep_offset called with non 0 offset
[    1.063891] Modules linked in:
[    1.066969] CPU: 0 PID: 3 Comm: kworker/0:0 Not tainted 4.14.0-licheepi-nano+ #1
[    1.074380] Hardware name: Allwinner suniv Family
[    1.079112] Workqueue: events deferred_probe_work_func
[    1.084363] [<c010df30>] (unwind_backtrace) from [<c010ae50>] (show_stack+0x10/0x14)
[    1.092117] [<c010ae50>] (show_stack) from [<c01161a4>] (__warn+0xcc/0xfc)
[    1.099054] [<c01161a4>] (__warn) from [<c0115e2c>] (warn_slowpath_fmt+0x38/0x48)
[    1.106597] [<c0115e2c>] (warn_slowpath_fmt) from [<c047b988>] (sunxi_musb_ep_offset+0x3c/0x54)
[    1.115345] [<c047b988>] (sunxi_musb_ep_offset) from [<c046efd0>] (ep_config_from_hw+0x70/0x144)
[    1.124168] [<c046efd0>] (ep_config_from_hw) from [<c04707f8>] (musb_probe+0x51c/0xc08)
[    1.132188] [<c04707f8>] (musb_probe) from [<c03f55a0>] (platform_drv_probe+0x50/0xb4)
[    1.140163] [<c03f55a0>] (platform_drv_probe) from [<c03f3de8>] (driver_probe_device+0x27c/0x394)
[    1.149083] [<c03f3de8>] (driver_probe_device) from [<c03f1ec0>] (bus_for_each_drv+0x70/0xa0)
[    1.157647] [<c03f1ec0>] (bus_for_each_drv) from [<c03f3824>] (__device_attach+0xd4/0x14c)
[    1.165950] [<c03f3824>] (__device_attach) from [<c03f2ed4>] (bus_probe_device+0x84/0x8c)
[    1.174161] [<c03f2ed4>] (bus_probe_device) from [<c03f0748>] (device_add+0x3c4/0x5e4)
[    1.182086] [<c03f0748>] (device_add) from [<c03f53a8>] (platform_device_add+0xe4/0x20c)
[    1.190218] [<c03f53a8>] (platform_device_add) from [<c03f5de4>] (platform_device_register_full+0xc4/0x144)
[    1.200015] [<c03f5de4>] (platform_device_register_full) from [<c047b5cc>] (sunxi_musb_probe+0x228/0x408)
[    1.209640] [<c047b5cc>] (sunxi_musb_probe) from [<c03f55a0>] (platform_drv_probe+0x50/0xb4)
[    1.218129] [<c03f55a0>] (platform_drv_probe) from [<c03f3de8>] (driver_probe_device+0x27c/0x394)
[    1.227040] [<c03f3de8>] (driver_probe_device) from [<c03f1ec0>] (bus_for_each_drv+0x70/0xa0)
[    1.235602] [<c03f1ec0>] (bus_for_each_drv) from [<c03f3824>] (__device_attach+0xd4/0x14c)
[    1.243907] [<c03f3824>] (__device_attach) from [<c03f2ed4>] (bus_probe_device+0x84/0x8c)
[    1.252086] [<c03f2ed4>] (bus_probe_device) from [<c03f32f4>] (deferred_probe_work_func+0x84/0x12c)
[    1.261183] [<c03f32f4>] (deferred_probe_work_func) from [<c012a330>] (process_one_work+0x1b8/0x3f8)
[    1.270362] [<c012a330>] (process_one_work) from [<c012ac44>] (worker_thread+0x254/0x598)
[    1.278586] [<c012ac44>] (worker_thread) from [<c012f514>] (kthread+0xf8/0x138)
[    1.285949] [<c012f514>] (kthread) from [<c0107768>] (ret_from_fork+0x14/0x2c)
[    1.293158] ---[ end trace 4936c8cbef917524 ]---
[    1.297826] musb-sunxi 1c13000.usb: Error unknown readb offset 128
[    1.304134] musb-hdrc musb-hdrc.1.auto: musb_init_controller failed with status -22
[    1.311914] musb-hdrc: probe of musb-hdrc.1.auto failed with error -22
[    1.321413] ALSA device list:
[    1.324505]   #0: Loopback 1
[    1.328697] Waiting for root device /dev/mmcblk0p2...
[    1.370506] mmc0: host does not support reading read-only switch, assuming write-enable
[    1.380634] mmc0: new high speed SDHC card at address 59b4
[    1.387174] mmcblk0: mmc0:59b4 LX32G 29.5 GiB
[    1.393736]  mmcblk0: p1 p2
[    1.425341] EXT4-fs (mmcblk0p2): couldn't mount as ext3 due to feature incompatibilities
[    1.452017] EXT4-fs (mmcblk0p2): mounted filesystem with ordered data mode. Opts: (null)
[    1.460305] VFS: Mounted root (ext4 filesystem) readonly on device 179:2.
[    1.468730] devtmpfs: error mounting -2
[    1.477079] Freeing unused kernel memory: 1024K
[    1.481823] Kernel panic - not syncing: No working init found.  Try passing init= option to kernel. See Linux Documentation/admin-guide/init.rst for guidance.
[    1.495965] CPU: 0 PID: 1 Comm: swapper Tainted: G        W       4.14.0-licheepi-nano+ #1
[    1.504203] Hardware name: Allwinner suniv Family
[    1.508979] [<c010df30>] (unwind_backtrace) from [<c010ae50>] (show_stack+0x10/0x14)
[    1.516729] [<c010ae50>] (show_stack) from [<c0115f60>] (panic+0xb4/0x22c)
[    1.523613] [<c0115f60>] (panic) from [<c0662934>] (kernel_init+0xd0/0x104)
[    1.530579] [<c0662934>] (kernel_init) from [<c0107768>] (ret_from_fork+0x14/0x2c)
[    1.538141] Rebooting in 10 seconds..
[   12.497211] Reboot failed -- System halted

```

## Reference
[Kernel guideline](https://github.com/Lichee-Pi/Lichee-Nano-Doc-us-english/tree/master)
[Sunxi guideline](https://linux-sunxi.org/Mainline_Kernel_Howto)
[How-to](https://linux-sunxi.org/Manual_build_howto)