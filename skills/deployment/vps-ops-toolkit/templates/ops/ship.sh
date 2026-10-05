#!/usr/bin/env bash
# Copies ops/ to the server and runs install.sh there. Requires an SSH alias
# (SSH_HOST) and passwordless sudo for that user.
set -euo pipefail

OPS_DIR="$(dirname "$(readlink -f "$0")")"
SSH_HOST="${SSH_HOST:-vps}"
# COPYFILE_DISABLE and --no-xattrs keep macOS metadata out of the archive.
COPYFILE_DISABLE=1 tar --no-xattrs -C "$OPS_DIR" -cf - . | ssh "$SSH_HOST" 'set -e
    STAGE="$(mktemp -d)"
    trap "rm -rf \"$STAGE\"" EXIT
    tar -C "$STAGE" -xf -
    sudo "$STAGE/install.sh"'
