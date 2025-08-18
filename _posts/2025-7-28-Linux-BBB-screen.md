---
title: Black BeagleBone Connecting without serial probe
date: 2025-7-28 14:30:00 +0700;
categories: [Hardware Projects, BeagleBone]
tags: [linux,BBB]     
comments: false
---

In the previous post, I explained how to set up a connection between the BeagleBone Black (BBB) and your PC using a serial probe (UART-TTL CP2102). But what if you don't have a serial probe and need the IP address of your BBB board to SSH into it?

<h3 id="Connect with virtual serial port" style="font-weight: bold;">Connect with a virtual serial port</h3>

Several things need to happen for the network to boot up and accept an SSH connection. Before the network is ready, all you need for this setup is the power cable and a Linux virtual machine (for example, using VMware).

Connect your BeagleBone to the Linux host (VMware) via the USB cable and wait for it to boot up. After that, check for the port device (usually /dev/ttyACM0):

```shell
host$ ls /dev/tty* | grep ttyACM0
/dev/ttyACM0
```
Once the system recognizes your board, you can connect to your BeagleBone.

Install the screen package and add your user to the dialout group to have read/write permissions on the /dev/ttyACM0 port:

```shell
host$ sudo apt install screen
host$ sudo usermod -aG dialout $USER  
host$ sudo screen /dev/ttyACM0 115200
bone login: debian
```

