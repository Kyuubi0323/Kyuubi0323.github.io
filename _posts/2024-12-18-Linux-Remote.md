---
title: Remote to Linux Desktop 
date: 2024-12-18 8:30:00 +0700;
categories: [Linux]
tags: [linux]     
---

---
Description: Remote access Linux Desktop GUI

---
<h3 id="X Forwarding" style="font-weight: bold;">X Forwarding</h3>
We have to first enable X forwarding.
We SSH to the remote Linux computer with -XC where X is the X service and C allows data compression.
```shell
ssh -XC kyuubi@192.168.0.40
```
Install <span style="color:red">xauth</span> on the remote machine.
```shell
sudo apt update
sudo apt install -y xauth
```
Check if <span style="color:red">X11Forwarding</span> is yes in <span style="color:red">/etc/ssh/sshd_config</span>.
```shell
$ cat /etc/ssh/sshd_config | grep X11Forwarding
X11Forwarding yes
```
Restart OpenSSH service.
```
sudo systemctl restart sshd
```
Confirm X forwarding is enabled.
```shell
$ echo $DISPLAY
localhost:10.0
```

<h3 id="Linux Desktop Forwarding" style="font-weight: bold;">Linux Desktop Forwarding</h3>
let\'s install the following dependencies
```shell
sudo touch /dev/fuse
sudo apt install -y xfce4 xfce4-goodies gnome-icon-theme libcanberra-gtk-module
```
Run the following command on the remote Linux computer while we are still ssh -X in.
```
xfce4-session
```
The forwarded desktop will show up on our local computer.  
Opening X applications from the forwarded desktop is fine. But we were not able to open terminal to run commands.
<h3 id="Linux Desktop Forwading via VNC" style="font-weight: bold;">Linux Desktop Forwading via VNC</h3>
To install the VNC server, we will install <span style="color:red">tightvncserver</span> on the remote Linux computer.
```
sudo apt install -y tightvncserver
```
Then we could start a virtual desktop with an id of 1.
```
vncserver :1 -geometry 1920x1080 -depth 24
```
We could then connect to the remote Linux desktop using VNC client software on our local computer.

Remmina is installed by default on my local Ubuntu 20.04 LTS. Here we just have to input the remote Linux computer IP address with the VNC virtual desktop id, and press <span style="color:red">Enter</span>.
Next, disconnect VNC and kill the virtual desktop.
```
vncserver -kill :1
```
we will install <span style="color:red">lxde</span> on the remote Linux computer.
```
sudo apt install -y lxde
```
We will modify the <span style="color:red">~/.vnc/xstartup</span> by adding <span style="color:red">/usr/bin/startlxde</span> to it. The modified file will look like this.
```shell
$ cat ~/.vnc/xstartup
#!/bin/sh

xrdb $HOME/.Xresources
xsetroot -solid grey
#x-terminal-emulator -geometry 80x24+10+10 -ls -title "$VNCDESKTOP Desktop" &
#x-window-manager &
# Fix to make GNOME work
export XKL_XMODMAP_DISABLE=1
/etc/X11/Xsession
/usr/bin/startlxde
```
Finally, restart VNC server
```
vncserver :1 -geometry 1920x1080 -depth 24
```
There are some inconvenience that copy and paste text between the local computer and the remote desktop does not work. To fix this problem, again, we disconnect the VNC connection and kill the virtual desktop.
```
vncserver -kill :1
```
We will install <span style="color:red">autocutsel</span> on the remote Linux computer.
```
sudo apt install -y autocutsel
```
We will modify the <span style="color:red">~/.vnc/xstartup</span> by adding <span style="color:red">autocutsel -fork</span> to it. The modified file will look like this.
```shell
$ cat ~/.vnc/xstartup
#!/bin/sh

xrdb $HOME/.Xresources
xsetroot -solid grey
autocutsel -fork
#x-terminal-emulator -geometry 80x24+10+10 -ls -title "$VNCDESKTOP Desktop" &
#x-window-manager &
# Fix to make GNOME work
export XKL_XMODMAP_DISABLE=1
/etc/X11/Xsession
/usr/bin/startlxde
```
Finally, restart VNC server.
```
$ vncserver :1 -geometry 1920x1080 -depth 24
```