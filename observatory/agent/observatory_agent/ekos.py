"""The Ekos Scheduler over DBus (inside the KStars container): read its state, load a schedule.

Safety (features/observatory-agent.md §4.6): the only DBus method the agent may call is
`loadScheduler`. It never starts or stops the Scheduler (starting it runs the observatory startup
queue: roof unpark, mount unpark), never slews, parks, or touches the roof or relays.
`_call()` refuses any other method, and a test checks this module calls nothing else.

`loadScheduler` replaces every job in the Scheduler and does not check whether it is running, so
`may_load()` decides first: the Scheduler must be idle, and every job in it must be one the agent
loaded (its sequence lives in the agent's folder) — a schedule a person built is never replaced.
"""

from __future__ import annotations

import json
import logging
import shlex
import subprocess
from dataclasses import dataclass

log = logging.getLogger(__name__)

SERVICE = "org.kde.kstars"
OBJECT = "/KStars/Ekos/Scheduler"
INTERFACE = "org.kde.kstars.Ekos.Scheduler"

# The one write the agent is allowed. Never add start/stop/removeAllJobs/… here.
ALLOWED_METHODS = frozenset({"loadScheduler"})

# SchedulerState enum of KStars 3.8.5
STATE_IDLE = 0
STATE_STARTUP = 1
STATE_RUNNING = 2
STATE_PAUSED = 3
STATE_SHUTDOWN = 4
STATE_ABORTED = 5
STATE_LOADING = 6

# The session bus address changes with every container start: take it from the KStars process
_BUS = 'A="$(tr "\\0" "\\n" < /proc/$(pgrep -x kstars | head -1)/environ | grep ^DBUS_SESSION_BUS_ADDRESS= | cut -d= -f2-)"; '


class EkosError(Exception):
    pass


@dataclass
class SchedulerInfo:
    status: int
    jobs: list[dict]  # jsonJobs: name, state, sequence (file URL), …
    current: dict | None  # currentJobJson


class EkosClient:
    def __init__(self, container: str, user: str, timeout: float = 20.0) -> None:
        self.container = container
        self.user = user
        self.timeout = timeout

    def _busctl(self, args: str) -> str:
        command = _BUS + 'busctl --address="$A" --json=short ' + args
        try:
            result = subprocess.run(
                ["docker", "exec", "-u", self.user, self.container, "sh", "-c", command],
                capture_output=True,
                text=True,
                timeout=self.timeout + 5,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            raise EkosError(f"busctl failed: {error}") from None
        if result.returncode != 0:
            raise EkosError(f"busctl failed: {result.stderr.strip()[:300]}")
        return result.stdout

    def info(self) -> SchedulerInfo:
        """Reads status, jsonJobs and currentJobJson (read-only)."""
        out = self._busctl(f"get-property {SERVICE} {OBJECT} {INTERFACE} status jsonJobs currentJobJson")
        lines = [line for line in out.splitlines() if line.strip()]
        if len(lines) != 3:
            raise EkosError(f"unexpected busctl output: {out[:200]!r}")
        try:
            status = int(json.loads(lines[0])["data"])
            jobs = json.loads(json.loads(lines[1])["data"] or "[]")
            current_text = json.loads(lines[2])["data"]
            current = json.loads(current_text) if current_text.strip() else None
        except (ValueError, KeyError, TypeError) as error:
            raise EkosError(f"cannot parse Scheduler properties: {error}") from None
        if not isinstance(jobs, list):
            raise EkosError("jsonJobs is not a list")
        return SchedulerInfo(status, jobs, current if isinstance(current, dict) else None)

    def _call(self, method: str, signature: str, *args: str) -> object:
        if method not in ALLOWED_METHODS:
            raise EkosError(f"DBus method {method} is not allowed")
        quoted = " ".join(shlex.quote(a) for a in args)
        out = self._busctl(f"--timeout={int(self.timeout)} call {SERVICE} {OBJECT} {INTERFACE} {method} {signature} {quoted}")
        try:
            return json.loads(out)["data"]
        except (ValueError, KeyError) as error:
            raise EkosError(f"unexpected reply of {method}: {error}") from None

    def load_schedule(self, container_path: str) -> bool:
        """`loadScheduler(path)`: replaces the Scheduler's jobs with the file's. Does not start it."""
        data = self._call("loadScheduler", "s", container_path)
        return bool(data[0]) if isinstance(data, list) and data else False


def sequence_path(job: dict) -> str:
    """The local path of an Ekos job's sequence (jsonJobs gives a file URL)."""
    value = str(job.get("sequence") or "")
    return value[len("file://") :] if value.startswith("file://") else value


def may_load(info: SchedulerInfo, agent_dir: str) -> tuple[bool, dict | None]:
    """Whether replacing the Scheduler's jobs is safe now, and why not (a code for the site)."""
    if info.status not in (STATE_IDLE, STATE_ABORTED):
        return False, {"code": "scheduler-busy", "state": info.status}
    prefix = agent_dir.rstrip("/") + "/"
    foreign = [str(j.get("name")) for j in info.jobs if not sequence_path(j).startswith(prefix)]
    if foreign:
        return False, {"code": "foreign-jobs", "names": foreign[:5]}
    return True, None


def job_key_of(job: dict | None, agent_dir: str) -> str | None:
    """`job-<id>-bb` / `patrol-<id>` of an Ekos job loaded by the agent, else None."""
    if not job:
        return None
    path = sequence_path(job)
    prefix = agent_dir.rstrip("/") + "/"
    if not path.startswith(prefix) or not path.endswith(".esq"):
        return None
    return path.rsplit("/", 1)[1][: -len(".esq")]
