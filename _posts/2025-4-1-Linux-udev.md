---
title: Write basic udev rules in linux
date: 2025-4-1 14:30:00 +0700;
#categories: [Abt-me, introduce]
tags: [linux]     
comments: true
---

---
Description: Understanding the base concepts behind udev, and learn how to write simple rules

---

<h3 id="Introduction" style="font-weight: bold;">Introduction</h3>
In a GNU/Linux system, while devices low level support is handled at the kernel level, the management of events related to them is managed in userspace by udev, and more precisely by the udevd daemon. Learning how to write rules to be applied on the occurring of those events can be really useful to modify the behavior of the system and adapt it to our needs.

<h3 id="How rules are organized" style="font-weight: bold;">How rules are organized</h3>
Udev rules are defined into files with the .rules extension. There are two main locations in which those files can be placed: /usr/lib/udev/rules.d is the directory used for system-installed rules, /etc/udev/rules.d/ is reserved for custom made rules.

The files in which the rules are defined are conventionally named with a number as prefix (e.g. 50-udev-default.rules) and are processed in lexical order independently of the directory they are in. Files installed in /etc/udev/rules.d, however, override those with the same name installed in the system default path.

<h3 id="The rules syntax" style="font-weight: bold;">The rules syntax</h3>
A udev rule consists of one or more key-value pairs, separated by commas, and written as a single line in the `.rules` file. Each rule has two main sections:
- **Match section:** Contains keys and values that must match device properties or attributes (such as `KERNEL`, `SUBSYSTEM`, `ATTR{}`).
- **Action/Assignment section:** Specifies what udev should do when the match conditions are met (such as `SYMLINK`, `RUN`, `OWNER`, `GROUP`, `MODE`).

The basic syntax is:
```
KEY1=="value1", KEY2=="value2", ... ACTION_KEY+="action_value"
```
- Keys and values in the match section use `==` (equals) or `!=` (not equals) for comparison.
- Assignment keys use `=`, `+=`, `:=`, or `-=` depending on the desired effect.

Example:
```
KERNEL=="ttyUSB*", SUBSYSTEM=="tty", SYMLINK+="myserial"
```
This rule matches all devices with kernel names starting with `ttyUSB` and belonging to the `tty` subsystem, and creates a symlink called `myserial`.

<h3 id="Operators" style="font-weight: bold;">Operators</h3>
== and != operators  
The `==` is the equality operator and the `!=` is the inequality operator. By using them we establish that for the rule to be applied the defined keys must match, or not match the defined value respectively.  

The assignment operators: = and :=  
The `=` assignment operator is used to assign a value to keys that accept one. The `:=` operator is used when you want to assign a value and ensure it is not overridden by later rules; values assigned with this operator cannot be altered by other rules.  

The += and -= operators  
The `+=` and `-=` operators are used respectively to add or to remove a value from the list of values defined for a specific key.

<h3 id="Common-match-keys" style="font-weight: bold;">Common match keys</h3>
Some commonly used match keys in udev rules are:

- **ACTION**: The type of event (e.g., "add", "remove", "change").
- **KERNEL**: The kernel device name or pattern (e.g., "sda*", "ttyUSB*").
- **SUBSYSTEM**: The subsystem the device belongs to (e.g., "usb", "block").
- **ATTR{key}**: Match on device attributes (e.g., `ATTR{idVendor}=="1234"`).
- **ENV{key}**: Match on environment variables.

Example match clause:
```
KERNEL=="ttyUSB*", SUBSYSTEM=="tty"
```

<h3 id="Actions-and-assignments" style="font-weight: bold;">Actions and assignments</h3>
After matching, you can specify actions or assignments such as:

- **NAME**: Assign a name to the device node.
- **SYMLINK**: Create a symbolic link to the device node.
- **RUN**: Execute an external program or script.
- **OWNER, GROUP, MODE**: Set permissions and ownership.

Example assignment:
```
SYMLINK+="myserial"
```

<h3 id="Example-rule" style="font-weight: bold;">Example rule</h3>
Here’s a simple example rule that creates a symlink for a USB-to-serial device:

```
KERNEL=="ttyUSB[0-9]*", ATTR{idVendor}=="0403", ATTR{idProduct}=="6001", SYMLINK+="ftdi_serial"
```

This rule matches any USB serial device with a specific vendor and product ID, and creates a symlink `/dev/ftdi_serial` when the device is added.

<h3 id="Testing-and-applying-rules" style="font-weight: bold;">Testing and applying rules</h3>
1. Place your rule file in `/etc/udev/rules.d/`, for example:  
   `/etc/udev/rules.d/99-usb-serial.rules`
2. Reload udev rules:
   ```
   sudo udevadm control --reload-rules
   ```
3. Trigger the rules manually (optional):
   ```
   sudo udevadm trigger
   ```
4. Unplug and replug your device to test.

<h3 id="Debugging-rules" style="font-weight: bold;">Debugging rules</h3>
If your rules aren’t working as expected, increase udev logging:

- Check the system log (`journalctl -u systemd-udevd` or `dmesg`).
- Use `udevadm test` to simulate rule application:
  ```
  sudo udevadm test /sys/class/tty/ttyUSB0
  ```

<h3 id="Conclusion" style="font-weight: bold;">Conclusion</h3>
Writing udev rules gives you fine-grained control over how your Linux system recognizes and interacts with hardware devices. By understanding the matching keys, operators, and action assignments, you can automate device management and customize your environment to meet specific needs.

---

**References:**
- [man udev](https://man7.org/linux/man-pages/man7/udev.7.html)
- [Writing udev rules](https://wiki.archlinux.org/title/Udev#Writing_udev_rules)
- [Linux udev examples](https://www.kernel.org/doc/html/v5.5/admin-guide/aoe/examples.html)