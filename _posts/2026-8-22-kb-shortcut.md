---
title: Add cursor shortcut in VSCode
date: 2026-8-22 08:00:00 +0700
categories: [TIL, tools]
tags: [sharing, linux]
description: "Add a shortcut to move the cursor to the end of the line in the VSCode terminal"
comments: false
---

In the VSCode terminal, whenever we want to go to the start of a long command, we only need to press `Ctrl+A`. However, there is no default shortcut to jump to the end of the line, so we have to add one.

Here's how to add the shortcut:

1. Open the keyboard shortcuts JSON file in VSCode:
   - Press `Ctrl+Shift+P`, then run `Preferences: Open Keyboard Shortcuts (JSON)`.
   - (`Ctrl+K` then `Ctrl+S` opens the graphical editor instead.)

2. Add this entry (I'm using `Ctrl+E`, but you can use any key you want):
```json
{
    "key": "ctrl+e",
    "command": "workbench.action.terminal.sendSequence",
    "when": "terminalFocus",
    "args": {
        "text": "\u0005"
    }
}
```

`\u0005` is the `Ctrl+E` control character, which the shell interprets as "move to end of line".
