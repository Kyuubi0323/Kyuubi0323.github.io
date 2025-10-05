---
title: BeagleBone Black WiFi Setup with TP-Link RTL8812 USB Dongle
date: 2025-7-29 14:30:00 +0700
categories: [Embedded Systems, BeagleBone]
tags: [linux, BBB]     
comments: false
---

Setting up WiFi connectivity on your BeagleBone Black using a TP-Link USB WiFi dongle with the RTL8812AU chipset requires proper driver installation and configuration. This guide walks you through the complete process of installing the RTL8812 driver and configuring WiFi access.

## Prerequisites

### Hardware Requirements
- BeagleBone Black (BBB) board
- TP-Link USB WiFi dongle with RTL8812AU/RTL8821AU chipset
- MicroSD card with Debian/Ubuntu Linux
- Serial console connection or SSH access

### Software Requirements
- Linux kernel headers
- Build tools (gcc, make, git)
- WiFi configuration utilities

### Initial Setup

Connect to your BeagleBone Black via serial console or SSH:

```bash
# Via serial console
sudo screen /dev/ttyUSB0 115200

# Or via SSH (if network is already configured)
ssh debian@192.168.7.2
```

## Step 1: System Preparation

### Update System Packages

```bash
# Update package repositories
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential git dkms linux-headers-$(uname -r)

# Install network utilities
sudo apt install -y wireless-tools wpasupplicant hostapd
```

### Check Current Kernel Version

```bash
# Display kernel version
uname -r

# Verify kernel headers are installed
ls /lib/modules/$(uname -r)/build
```

Expected output should show kernel build directory exists.

## Step 2: Identify USB WiFi

### Connect USB WiFi
```bash
# Check the interface
lsusb
```

Look for entries like:

```
Bus 001 Device 003: ID 0bda:8812 Realtek RTL8812AU
```

### Check Device Recognition

```bash
# Check if device is recognized
dmesg | grep -i rtl
dmesg | grep -i usb

# Check wireless interfaces
iwconfig
```

## Step 3: Download and Compile RTL8812AU Driver

### Clone Driver Repository

```bash
# Navigate to home directory
cd ~

# Primary driver repository (recommended)
git clone https://github.com/aircrack-ng/rtl8812au.git

# Alternative repositories for different kernel versions:
# For older kernels (< 5.4):
# git clone https://github.com/gordboy/rtl8812au-5.6.4.2.git

# For newer kernels (> 5.15):
# git clone https://github.com/morrownr/8812au-20210820.git

cd rtl8812au
```

### Kernel Compatibility Check

```bash
# Check kernel version compatibility
uname -r

# For kernel versions 5.4 and above, verify driver compatibility
echo "Kernel version: $(uname -r)"
if [[ $(uname -r | cut -d. -f1-2) > "5.3" ]]; then
    echo "Using modern kernel - latest driver recommended"
else
    echo "Using older kernel - consider legacy driver version"
fi
```

### Configure Build Options

```bash
# Check available build configurations
cat Makefile | grep -i config

# Edit Makefile for BeagleBone optimization (optional)
nano Makefile
```

Key configurations to verify:
```makefile
CONFIG_PLATFORM_I386_PC = n
CONFIG_PLATFORM_ARM_RPI = y
CONFIG_IOCTL_CFG80211 = y
CONFIG_CFG80211_WEXT = y
```

### Compile the Driver

```bash
# Clean previous builds
make clean

# Compile the driver
make -j$(nproc)

# Install the driver
sudo make install

# Load the driver into DKMS (Dynamic Kernel Module Support)
sudo make dkms_install
```

### Manual Driver Loading

```bash
# Load the compiled module
sudo modprobe rtl8812au

# Check if module is loaded
lsmod | grep rtl

# Check kernel messages
dmesg | tail -20
```

## Step 4: Verify Driver Installation

### Check Wireless Interface

```bash
# List wireless interfaces
iwconfig

# Check network interfaces
ip link show

# Look for wireless interface (usually wlan0 or wlan1)
```

Expected output:
```
wlan0     IEEE 802.11  ESSID:off/any  
          Mode:Managed  Access Point: Not-Associated   
          Tx-Power=20 dBm   
          Retry short limit:7   RTS thr:off   Fragment thr:off
          Encryption key:off
          Power Management:off
```


