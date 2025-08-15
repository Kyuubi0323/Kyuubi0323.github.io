---
title: Licheepi Nano 1
date: 2025-5-23 14:30:00 +0700;
categories: [Hardware Projects]
tags: [linux,lichee]     
comments: false
---

---
Licheepi Nano is a small single board computer. It was developed and launched by licheepi and uses the ARM architect of Allwiner F1C100s (ARM9) processors with linux support OS, and can run a variety of applications. The Licheepi nano has a very compact design. Lichee Nano has integrated 32MB DDR memory in the SoC itself. Storage could be expanded through and 8-32MB SPI Flash memory or through a micro SDcard, it also supports high-speed WiFi and Bluetooth connectivity. Licheepi Nano also has a variety of peripheral interfaces, including USB 2.0, GPIO, SPI, I2C, UART, HDMI, etc., which can connect various sensors, displays, cameras, and other external devices. This makes the Licheepi Nano ideal for applications such as IoT and smart homes. Overall, the Licheepi Nano is a high-performance, low-cost small form factor computer that is ideal for DIY enthusiasts, educators, and beginners.

---
<h3 id="Specifications" style="font-weight: bold;">Specifications </h3>  

![Desktop View](/assets/img/2025-23-5-Linux-Lichee01/lichee.jpg){: .normal }  
🔌 Power Specifications
- **Input Power:** 5V DC via Micro USB
- **Power Consumption:**
  - ~54mA (idle) running Linux
  - ~250mA with display connected  
- **Note:** Power supply current should be ≥ 500mA  

🧠 CPU & Memory
- **CPU:** Allwinner F1C100s  
  - ARM926EJ-S core  
  - Up to 900MHz
- **Memory:**
  - 32MB DDR (integrated in SoC)
- **Storage:**
  - 16MB SPI Flash
  - Onboard TF (microSD) slot (supports booting from TF card)  



 🖥️ Display
- **40-pin RGB LCD FPC connector**
  - Supports resolutions: 272×480, 480×800, 1024×600
  - Supports resistive displays (capacitive via adapter board)
- **Video Output:**
  - 720p supported
  - Video decoding: H.264, MPEG, and more  


📡 Communication Interfaces
- **WiFi:** SDIO interface for external WiFi module
- **Interfaces:**
  - SPI ×2
  - TWI (I²C) ×3
  - UART ×3
  - OTG USB ×1
  - TV out  

The LicheePi Nano is compatible with three different operating systems: Linux, RT-Thread (RTT), and Xboot. However, due to the amount of RAM on the board, running a full desktop environment is not recommended.  

The Lichee Nano was released for a price of around €8, but it is currently difficult to obtain one. You can find them for €11-12 if you are lucky in your search.
On the other hand, the documentation available about the board is scarce and is exclusively in Chinese. Also, as is often the case with this type of product, it is not an easy device to use.

Beyond the interest of the board itself, which I tell you is more than relative, the most interesting thing is the fact that low-power development boards based on Linux are appearing. A trend that we have been observing for some time, and which is likely to become more and more frequent.
In these next posts, i will describe the process to combine U-boot, linux kernel and other bits together to create a useful SDcard from scratch.