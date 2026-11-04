"""Facts about the observatory PC that don't come from INDI: the indiweb profile, the Ekos
Scheduler state (read over DBus inside the KStars container) and free space for frames.
All read-only; every failure returns None instead of raising."""

from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
import urllib.request

log = logging.getLogger(__name__)

# Ekos Scheduler status (SchedulerState enum in KStars)
SCHEDULER_STATES = {
    0: "idle",  # SCHEDULER_IDLE
    1: "running",  # SCHEDULER_STARTUP
    2: "running",  # SCHEDULER_RUNNING
    3: "paused",  # SCHEDULER_PAUSED
    4: "running",  # SCHEDULER_SHUTDOWN
    5: "idle",  # SCHEDULER_ABORTED
    6: "idle",  # SCHEDULER_LOADING
}

# Reads the scheduler properties over the session bus of the running KStars process
# (its address changes with every container start, so it is taken from the process env)
_DBUS_SCRIPT = (
    'export "$(tr "\\0" "\\n" < /proc/$(pgrep -x kstars | head -1)/environ | grep ^DBUS_SESSION_BUS_ADDRESS=)"; '
    "dbus-send --session --print-reply --reply-timeout=3000 --dest=org.kde.kstars /KStars/Ekos/Scheduler "
    "org.freedesktop.DBus.Properties.GetAll string:org.kde.kstars.Ekos.Scheduler"
)


def indiweb_profile(url: str) -> str | None:
    """Active indiweb profile, or None when the INDI server isn't running."""
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/api/server/status", timeout=3) as response:
            data = json.load(response)
        status = data[0] if isinstance(data, list) and data else {}
        if str(status.get("status")).lower() == "true":
            return status.get("active_profile") or None
    except (OSError, ValueError) as error:
        log.debug("indiweb not reachable: %s", error)
    return None


def ekos_scheduler(container: str, user: str) -> dict | None:
    """{state, job} of the Ekos Scheduler, or None when KStars/Ekos isn't reachable."""
    try:
        result = subprocess.run(
            ["docker", "exec", "-u", user, container, "sh", "-c", _DBUS_SCRIPT],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        log.debug("Ekos DBus query failed: %s", error)
        return None
    if result.returncode != 0:
        log.debug("Ekos DBus query failed: %s", result.stderr.strip()[:200])
        return None
    return parse_scheduler_reply(result.stdout)


def parse_scheduler_reply(text: str) -> dict | None:
    """Parses `dbus-send --print-reply` output of Properties.GetAll on the Scheduler."""
    status = re.search(r'string "status"\s+variant\s+int32 (\d+)', text)
    job = re.search(r'string "currentJobName"\s+variant\s+string "([^"]*)"', text)
    if not status:
        return None
    return {
        "state": SCHEDULER_STATES.get(int(status.group(1)), "unknown"),
        "job": (job.group(1) if job else "") or None,
    }


def disk_free_gb(path: str) -> float | None:
    try:
        return shutil.disk_usage(path).free / 1024**3
    except OSError:
        return None
