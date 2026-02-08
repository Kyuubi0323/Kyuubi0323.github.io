---
layout: post
title: "Linux User Management: usermod, Groups, and File Permissions"
date: 2025-09-15 10:30:00 +0700
categories: Linux
tags: [linux]
---

Managing users, groups, and file permissions is fundamental to Linux system administration. This guide covers the essential commands and concepts you need to effectively manage user accounts and access control.

## Table of Contents
- [Understanding Linux Users and Groups](#understanding-linux-users-and-groups)
- [The usermod Command](#the-usermod-command)
- [Managing Groups](#managing-groups)
- [Linux File Permissions](#linux-file-permissions)
- [Advanced Permission Concepts](#advanced-permission-concepts)

## Understanding Linux Users and Groups

In Linux, every file and process is associated with a user and a group. This forms the foundation of Linux security and access control.

### Key Concepts

- **User**: An account that can own files and run processes
- **Group**: A collection of users that can share access to files and directories
- **Primary Group**: The default group assigned to a user (stored in `/etc/passwd`)
- **Secondary Groups**: Additional groups a user belongs to (stored in `/etc/group`)

### Important Files

- `/etc/passwd` - User account information
- `/etc/shadow` - Encrypted user passwords
- `/etc/group` - Group information
- `/etc/gshadow` - Secure group information

## The usermod Command

The `usermod` command is used to modify existing user accounts. It's one of the most powerful user management tools in Linux.

### Basic Syntax

```bash
usermod [options] username
```

### Common Options and Examples

#### Change User's Home Directory

```bash
# Change home directory
sudo usermod -d /new/home/dir username

# Change and move contents
sudo usermod -d /new/home/dir -m username
```

#### Modify User's Login Shell

```bash
# Change to bash
sudo usermod -s /bin/bash username

# Change to zsh
sudo usermod -s /bin/zsh username

# Disable login (useful for service accounts)
sudo usermod -s /sbin/nologin username
```

#### Add User to Groups

```bash
# Add user to a supplementary group (preserves existing groups)
sudo usermod -aG sudo username

# Add user to multiple groups
sudo usermod -aG sudo,docker,www-data username

# Replace all groups (WARNING: removes from other groups)
sudo usermod -G newgroup username
```

**Important**: Always use `-aG` (append) instead of `-G` to avoid accidentally removing the user from other groups!

#### Change Username

```bash
# Rename a user
sudo usermod -l newusername oldusername
```

#### Lock and Unlock User Accounts

```bash
# Lock a user account (disable password)
sudo usermod -L username

# Unlock a user account
sudo usermod -U username
```

#### Set Account Expiration

```bash
# Set account to expire on a specific date (YYYY-MM-DD)
sudo usermod -e 2025-12-31 username

# Remove expiration date
sudo usermod -e "" username
```

#### Change User ID (UID)

```bash
# Change user's UID
sudo usermod -u 1500 username
```

#### Change Primary Group

```bash
# Change user's primary group
sudo usermod -g newgroup username
```

## Managing Groups

Groups allow multiple users to share access to files and resources efficiently.

### Creating Groups

```bash
# Create a new group
sudo groupadd developers

# Create a group with specific GID
sudo groupadd -g 1500 developers
```

### Modifying Groups

```bash
# Rename a group
sudo groupmod -n newname oldname

# Change group ID
sudo groupmod -g 1600 developers
```

### Deleting Groups

```bash
# Delete a group
sudo groupdel groupname
```

### Adding/Removing Users from Groups

```bash
# Add user to group (method 1: using usermod)
sudo usermod -aG groupname username

# Add user to group (method 2: using gpasswd)
sudo gpasswd -a username groupname

# Remove user from group
sudo gpasswd -d username groupname
```

### Viewing Group Information

```bash
# View groups for current user
groups

# View groups for specific user
groups username

# View all groups
cat /etc/group

# View group members
getent group groupname
```

### Practical Example: Embedded Development Team Setup

```bash
# Create embedded development group
sudo groupadd embedded

# Add multiple users to the group and grant serial port access
sudo usermod -aG embedded,dialout alice
sudo usermod -aG embedded,dialout bob
sudo usermod -aG embedded,dialout charlie

# Create shared firmware directory
sudo mkdir -p /opt/firmware
sudo chgrp embedded /opt/firmware
sudo chmod 2775 /opt/firmware

# Verify serial device permissions
ls -l /dev/ttyACM0
# crw-rw---- 1 root dialout 166, 0 Feb  8 10:30 /dev/ttyACM0

# Users can now access serial devices without sudo
# screen /dev/ttyACM0 115200
# or
# minicom -D /dev/ttyACM0
```

## Linux File Permissions

Linux uses a sophisticated permission system to control access to files and directories.

### Understanding Permission Notation

#### Symbolic Notation (rwx)

```
-rwxr-xr--
│││││││││└─ Others: read
││││││││└── Others: write (-)
│││││││└─── Others: execute (-)
││││││└──── Group: read
│││││└───── Group: write (-)
││││└────── Group: execute
│││└─────── Owner: read
││└──────── Owner: write
│└───────── Owner: execute
└────────── File type (- = file, d = directory, l = link)
```

#### Numeric Notation (Octal)

Each permission has a numeric value:
- `r` (read) = 4
- `w` (write) = 2
- `x` (execute) = 1

Permissions are calculated by adding these values:

| Octal | Binary | Symbolic | Permissions |
|-------|--------|----------|-------------|
| 0     | 000    | ---      | None        |
| 1     | 001    | --x      | Execute     |
| 2     | 010    | -w-      | Write       |
| 3     | 011    | -wx      | Write + Execute |
| 4     | 100    | r--      | Read        |
| 5     | 101    | r-x      | Read + Execute |
| 6     | 110    | rw-      | Read + Write |
| 7     | 111    | rwx      | All         |

### Common Permission Sets

```bash
# 644 - Standard file permissions
# Owner: read+write, Group: read, Others: read
chmod 644 file.txt

# 755 - Standard directory/executable permissions
# Owner: all, Group: read+execute, Others: read+execute
chmod 755 script.sh

# 600 - Private file (like SSH keys)
# Owner: read+write, Group: none, Others: none
chmod 600 ~/.ssh/id_rsa

# 700 - Private directory
# Owner: all, Group: none, Others: none
chmod 700 ~/private/

# 775 - Shared directory
# Owner: all, Group: all, Others: read+execute
chmod 775 /var/www/shared/
```

### Changing Permissions with chmod

#### Symbolic Mode

```bash
# Add execute permission for owner
chmod u+x script.sh

# Remove write permission for group
chmod g-w file.txt

# Set read permission for others
chmod o=r file.txt

# Add write permission for group and others
chmod go+w file.txt

# Remove all permissions for others
chmod o-rwx file.txt

# Set exact permissions
chmod u=rwx,g=rx,o=r file.txt
```

#### Numeric Mode

```bash
# Full access for owner, read for others
chmod 744 script.sh

# Read/write for owner and group
chmod 660 data.txt

# Full access for everyone (dangerous!)
chmod 777 file.txt
```

#### Recursive Changes

```bash
# Change permissions recursively
chmod -R 755 /var/www/html/

# Change only directories
find /path -type d -exec chmod 755 {} \;

# Change only files
find /path -type f -exec chmod 644 {} \;
```

### Changing Ownership with chown

```bash
# Change owner
sudo chown newowner file.txt

# Change owner and group
sudo chown newowner:newgroup file.txt

# Change only group (alternative to chgrp)
sudo chown :newgroup file.txt

# Recursive ownership change
sudo chown -R user:group /var/www/html/
```

### Changing Group with chgrp

```bash
# Change group ownership
sudo chgrp developers project.txt

# Recursive group change
sudo chgrp -R www-data /var/www/html/
```

### Viewing Permissions

```bash
# List files with permissions
ls -l

# List with human-readable sizes
ls -lh

# List all files including hidden
ls -la

# Show numeric UID/GID instead of names
ls -ln
```

## Advanced Permission Concepts

### Special Permissions

#### Sticky Bit - 1xxx

On directories: Only the file owner can delete their files (useful for /tmp)

```bash
# Set sticky bit
chmod +t /shared/temp
chmod 1777 /shared/temp

# Example: /tmp directory
ls -ld /tmp
# drwxrwxrwt (notice the 't' at the end)
```


## Conclusion

Understanding usermod, groups, and Linux permissions is essential for effective system administration. Key takeaways:

- Use `usermod` to modify user accounts safely, especially with `-aG` for group management
- Leverage groups to simplify permission management for multiple users
- Master both symbolic and numeric permission notation
- Implement least privilege principle for security
- Use special permissions (sticky bit) where appropriate

With these tools and concepts, you can build secure, well-organized multi-user Linux systems.

## References

- [Linux man pages](https://man7.org/linux/man-pages/)
- [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html)
- [POSIX File Permissions](https://pubs.opengroup.org/onlinepubs/9699919799/)
