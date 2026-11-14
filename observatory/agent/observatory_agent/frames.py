"""Finds the frames Ekos has written for the agent's jobs and patrol visits.

Every sequence the agent writes saves its frames under its own folder with the placeholder
`/%t/%T/%F/%t_%T_%F_%e_%D`:

    <frames_dir>/jobs/<job id>/<target>/Light/<filter>/<file>.fits
    <frames_dir>/patrol/<target id>/<target>/Light/L/<file>.fits

so the folder names the job (or patrol target), and the folder two levels up from the file names
the filter. Only Light frames count. A file is taken once it hasn't changed for `settle_seconds`
(Ekos may still be writing it). `frames-upload` moves the files away in the morning; the agent's
database keeps the record, which is what the counts are made of.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

JOBS_DIR = "jobs"
PATROL_DIR = "patrol"
EXTENSIONS = (".fits", ".fit", ".fts")


@dataclass(frozen=True)
class Frame:
    path: str
    kind: str  # "job" | "patrol"
    ref: str  # job id or patrol target id (as text)
    filter: str
    time: str  # file modification time, ISO UTC


def job_dir(frames_dir: str, job_id: str) -> str:
    return str(Path(frames_dir) / JOBS_DIR / job_id)


def patrol_dir(frames_dir: str, target_id: int) -> str:
    return str(Path(frames_dir) / PATROL_DIR / str(target_id))


def parse(frames_dir: str, path: str) -> tuple[str, str, str] | None:
    """(kind, ref, filter) of a frame path, or None when it isn't one of ours."""
    try:
        relative = Path(path).relative_to(frames_dir)
    except ValueError:
        return None
    parts = relative.parts
    # kind / ref / <target> / Light / <filter> / file
    if len(parts) < 6 or parts[0] not in (JOBS_DIR, PATROL_DIR):
        return None
    if not parts[-1].lower().endswith(EXTENSIONS) or parts[-3] != "Light":
        return None
    ref, filter_ = parts[1], parts[-2]
    if not ref or not filter_ or len(filter_) > 10:
        return None
    if parts[0] == PATROL_DIR and not ref.isdigit():
        return None
    return ("job" if parts[0] == JOBS_DIR else "patrol", ref, filter_)


def scan(frames_dir: str, known, now: float, settle_seconds: float = 10.0) -> list[Frame]:
    """New frames (not `known(path)`) under the jobs/ and patrol/ folders, oldest first."""
    found: list[Frame] = []
    for sub in (JOBS_DIR, PATROL_DIR):
        root = os.path.join(frames_dir, sub)
        if not os.path.isdir(root):
            continue
        for directory, _, files in os.walk(root):
            for name in files:
                path = os.path.join(directory, name)
                parsed = parse(frames_dir, path)
                if parsed is None or known(path):
                    continue
                try:
                    mtime = os.stat(path).st_mtime
                except OSError:
                    continue  # moved away meanwhile
                if now - mtime < settle_seconds:
                    continue
                time = datetime.fromtimestamp(mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                found.append(Frame(path, parsed[0], parsed[1], parsed[2], time))
    found.sort(key=lambda f: (f.time, f.path))
    return found
