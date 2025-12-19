---
title: Fixing Early Serial Console Issues with Raspberry Pi Imager
date: 2025-9-1 10:30:00 +0700
categories: [XXX]
tags: [linux, sharing]     
comments: false
---


When using **Raspberry Pi Imager** to flash operating systems, you might encounter issues where the **early serial console** doesn't work as expected. When you want to know its IP address but do not have any monitor, you need to connect 1 serial USB TTL into this RasPi Device, but it's not work. The screen show nothing?
This is particularly frustrating when you need to debug boot issues or access the system without a display. The solution involves properly configuring the UART in the `/boot/firmware/config.txt` file.

## The Problem

After flashing an OS using Raspberry Pi Imager, you may experience:

- **No output on serial console** during early boot
- **Missing boot messages** that are crucial for debugging
- **UART0 not properly enabled** by default

This happens because modern Raspberry Pi OS images don't always enable the hardware UART by default, especially for early boot stages.


## Hardware Setup

Before fixing software configuration, ensure proper hardware connections:

### Required Components

- **USB-to-TTL serial adapter** (3.3V logic level)
- **Jumper wires**
- **Raspberry Pi** with SD card

### Wiring Connections

```
USB-TTL Adapter    Raspberry Pi GPIO
GND           →    Pin 6 (GND)
RX            →    Pin 8 (GPIO 14, TXD)
TX            →    Pin 10 (GPIO 15, RXD)
```


### Serial Terminal Settings

Configure your terminal emulator with:
- **Baud rate**: 115200
- **Data bits**: 8
- **Parity**: None
- **Stop bits**: 1
- **Flow control**: None

## Solution: Configuring config.txt

### Step 1: Access the Boot Partition

After flashing with Raspberry Pi Imager, the SD card will have a boot partition accessible from any computer.

#### On Linux:
```bash
# Mount the SD card
sudo mount /dev/sdX1 /mnt

# Navigate to firmware directory
cd /mnt/firmware
```

#### On Windows:
The boot partition should appear as a drive letter (e.g., D:)

#### On macOS:
The boot partition will mount automatically in `/Volumes/`

### Step 2: Edit config.txt

Open `/boot/firmware/config.txt` (or `/boot/config.txt` on older images) and add the following configurations:

```ini
# Enable UART0 for early console
enable_uart=1

# Use UART0 as primary UART (more stable)
dtoverlay=disable-bt

```


## Detailed Configuration Explanation

### enable_uart=1
- **Enables the UART interface** on GPIO pins 14/15
- **Essential** for any serial communication
- **Must be set** for early console to work

### dtoverlay=disable-bt
- **Disables Bluetooth** to free up UART0
- **Makes UART0 available** for console use
- **More stable** than mini-UART for console


## Testing the Configuration

### Step 1: Connect Serial Adapter

Connect your USB-to-TTL adapter as described in the hardware setup.

### Step 2: Open Terminal

```bash
# On Linux using screen
screen /dev/ttyUSB0 115200

# On Linux using minicom
minicom -D /dev/ttyUSB0 -b 115200

# On Windows using PuTTY
# Set COM port and 115200 baud rate
```

### Step 3: Boot Raspberry Pi

Insert the SD card and power on the Raspberry Pi. You should see:

```
Starting start.elf on BCM2835/6/7/2711
Read command line from file 'cmdline.txt'
DTOVERLAY[0]: 'disable-bt'
Using UART console on GPIO 14/15
[    0.000000] Booting Linux on physical CPU 0x0
[    0.000000] Linux version 5.15.61+ (dom@buildbot)
```



## Automation Script

Create a script to automatically configure serial console:

```bash
#!/bin/bash
# configure_serial.sh

BOOT_MOUNT="/mnt/boot"
CONFIG_FILE="$BOOT_MOUNT/firmware/config.txt"

# Check if boot partition is mounted
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Boot partition not found at $BOOT_MOUNT"
    exit 1
fi

# Backup original config
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"

# Add serial console configuration
cat >> "$CONFIG_FILE" << EOF

# Serial Console Configuration
enable_uart=1
dtoverlay=disable-bt
uart_2ndstage=1
core_freq=250
EOF

echo "Serial console configuration added to $CONFIG_FILE"
echo "Backup saved as $CONFIG_FILE.backup"
```


## Conclusion

Enabling early serial console on Raspberry Pi after using Raspberry Pi Imager requires proper UART configuration in `config.txt`. The key steps are:

### Remember:
- Always backup configuration files
- Test changes incrementally
- Verify hardware connections first
- Use proper 3.3V TTL adapters
