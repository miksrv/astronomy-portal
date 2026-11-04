#!/usr/bin/env bash
# Ekos Scheduler shutdown script (runs after the mount is parked and the roof is closed):
# 1. ask the host to move tonight's frames to the archive server (frames-upload.path
#    watches this file; the container itself has no access to the archive server),
# 2. power the equipment down — only if INDI reports the mount and the roof parked.
dir="$(dirname "$(readlink -f "$0")")"
date '+%F %T' >"$dir/.frames-upload.request"
exec "$dir/obs-power" off
