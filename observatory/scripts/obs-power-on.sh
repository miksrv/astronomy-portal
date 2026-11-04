#!/usr/bin/env bash
# Ekos Scheduler startup script: power the observatory up.
exec "$(dirname "$(readlink -f "$0")")/obs-power" on
