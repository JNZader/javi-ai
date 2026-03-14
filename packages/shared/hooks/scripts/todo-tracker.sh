#!/bin/bash
# Stop hook: Reminds the user to review pending tasks before ending.
# Advisory only — always exits 0.
# Trigger: Stop (session ending)

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "[hook:todo-tracker] You have uncommitted changes. Consider reviewing your todo list before ending."
fi

exit 0
