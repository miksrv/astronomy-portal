#!/usr/bin/env bash
# Ekos Scheduler shutdown script: power down, only if mount and roof are parked.
exec "$(dirname "$(readlink -f "$0")")/obs-power" off
