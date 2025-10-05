---
title: Fix Copy-Paste and Drag & Drop Not Working in VMware with Ubuntu
date: 2025-04-05 10:00:00 +0700;
categories: [XXX, fix]
tags: [linux, sharing]
comments: true
---

---
How to fix copy-paste and drag & drop not working between host and guest OS in VMware when running Ubuntu.

---

<h3 id="Problem" style="font-weight: bold;">Problem</h3>
When using **Ubuntu** as a guest operating system inside **VMware Workstation**, one common issue users face is that **copy-paste and drag & drop functionality stops working**. This can severely hamper productivity, especially if you're frequently transferring files or text between your host and guest systems.
This guide will walk you through the steps needed to re-enable this essential feature in your VMware virtual machine running Ubuntu.  
<h3 id="Step-by-Step-Fix" style="font-weight: bold;">Step-by-Step Fix</h3>
Even after trying the usual fixes—like reinstalling `open-vm-tools`, restarting the VM, and resetting the drag & drop settings through VMware’s UI. The problem still there.   
And somehow, i caught the things that, the UI drag and drop in VMware's settings didn't write into system script at all. So, to fix the issue permantly and bypass any UI-related bugs, follow these steps:
- shutdown your virtual machine (make sure its fully pwered off, not suspended)
- Navigate to the folder where your VM is stored
- Locate the '.vmx' file - this is the main configuration file for your VM (eg 'katana.vmx')
- Open the '.vmx' file with your fav text editor

Look for the following lines, add it manually.
```shell
isolation.tools.copy.disable = "FALSE"
isolation.tools.dnd.disable = "FALSE"
isolation.tools.paste.disable = "FALSE"
isolation.tools.hgfs.disable = "FALSE"  # Optional but recommended
```

Save the changes and turn your VM on ^^

