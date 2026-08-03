#!/usr/bin/env bash
# Entry point for Claude Desktop (Windows) → WSL bridge.
# wsl.exe -e runs a bare non-login shell: nvm is NOT on PATH, hence the absolute
# node path below. Update it after Node upgrades (see README).
export ARCHIVE_ROOT="/home/haman/nbb/theArchive"
exec /home/haman/.nvm/versions/node/v22.22.3/bin/node /home/haman/nbb/theArchive/dist/mcp/main.js
