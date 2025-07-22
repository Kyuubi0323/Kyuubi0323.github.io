---
title: Black BeagleBone Serial connection
date: 2025-5-22 14:30:00 +0700;
#categories: [Abt-me, introduce]
tags: [linux,BBB]     
comments: false
---

Serial console is basically a remote terminal for the BeagleBone board. This way we can execute shell commands on BeagleBone board from our PC or laptop, and see its output. It is also useful when there are problems with the Linux installation on our board. 

![Desktop View](/assets/img/2025-22-5-Linux-BBB-serial/bbb-serial02.jpg){: .nomal }


To do so, we will need two things:

- Special cable for serial console, to connect our board to the PC (USB to Serial UART TTL 3.3v serial cable).
- Special software, to be able to manipulate the board shell via the cable. (MobaXterm, minicom, kermit, gtkterm, PuTTY, etc)  
The pinout of the serial-port is like that figure below. Connect the USB-to-TTL to the J1 headers on your BeagleBone Black as shown:  
  
Function|	USB-to-TTL Cable	| BeagleBone  
Ground	|  GND wire |	Pin 1 J1 Header GND  
TX→RX	| TX wire|	Pin 4 J1 Header RXD  
RX←TX	|RX  wire	|Pin 5 J1 Header TXD  

![Desktop View](/assets/img/2025-22-5-Linux-BBB-serial/bbb-serial01.jpg){: .normal }   

With MobaXterm installed, you can establish a serial communication with your BeagleBone Black.
1. open session
2. choose serial
3. click to the port that plug into your pc (on windows, you can check the Device manager to see COMport)
4. set the Speed is 115200 baudrate. Bits=8, Parity=N, stopbits=1,handshake=none
After the setup, you would be able to log in bbb serial console.
![Desktop View](/assets/img/2025-22-5-Linux-BBB-serial/bbb-serial03.png){: .normal }  