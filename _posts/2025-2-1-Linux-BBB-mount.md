---
title: Mounting Remote Directory via sshfs
date: 2025-2-1 14:30:00 +0700;
categories: [Embedded Systems, BeagleBone]
tags: [linux, BBB]     
---

---
sshfs (SSH File System) is a powerful tool that allows you to mount and interact with remote directories over an SSH connection as if they were part of your local file system. It leverages the security and encryption of SSH, making it an ideal choice for securely accessing and managing files on remote servers without the need for complex configurations.

<h3 id="Installation" style="font-weight: bold;">Installation</h3>
```shell
host$ sudo apt update
host$ sudo apt install sshfs
```
<h3 id="Mounting" style="font-weight: bold;">Mounting</h3>
Make a directory to hold the BBB's files
```shell
host$ mkdir bone_dir
```
after that, mount them. The 192.168.7.2 is the default address of bone when connect with your host via usb cable.
```shell
host$ sshfs debian@192.168.7.2:. bone_dir
host$ ls bone_dir
```
Now, everything is okay. 
<h3 id="Unmounting" style="font-weight: bold;">Unmounting</h3>
when u're done. Run the below command to unmount
```shell
host$ sudo umount bone_dir
```