#!/usr/bin/env bash
# Auto-commit and push after every Claude Code session
# Configured via .claude/settings.json Stop hook

set -e

REPO="C:/Users/Obama/Desktop/Tsaidam camp/Tsaidam camp/tsaidam-camp"

cd "$REPO"

# Check if there are any changes to commit
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[auto-push] No changes to commit."
  exit 0
fi

# Stage all tracked + untracked changes (respects .gitignore)
git add -A

# Commit with a timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
git commit -m "chore: session update ${TIMESTAMP}" --no-verify 2>/dev/null || {
  echo "[auto-push] Commit failed or nothing new to commit."
  exit 0
}

# Push to GitHub
git push origin master 2>&1 && echo "[auto-push] Pushed to GitHub successfully." || echo "[auto-push] Push failed — check credentials."
