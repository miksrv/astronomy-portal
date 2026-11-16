"""Finds the frames Ekos has written for the agent's jobs.

Every sequence the agent writes saves its frames under its own folder with the placeholder
`/%t/%T/%F/%t_%T_%F_%e_%D`:

    <frames_dir>/jobs/<job id>/<target>/Light/<filter>/<file>.fits

so the folder names the job (the one right under jobs/, whatever Ekos made of the target name),
and the folder the file is in names the filter. Only Light frames count. A file is taken once it hasn't changed for `settle_seconds`
(Ekos may still be writing it). `frames-upload` moves the files away in the morning; the agent's
database keeps the record, which is what the counts are made of.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

JOBS_DIR = "jobs"
EXTENSIONS = (".fits", ".fit", ".fts")


@dataclass(frozen=True)
class Frame:
    path: str
    job_id: str
    filter: str
    time: str  # file modification time, ISO UTC


def job_dir(frames_dir: str, job_id: str) -> str:
    return str(Path(frames_dir) / JOBS_DIR / job_id)


def parse(frames_dir: str, path: str) -> tuple[str, str] | None:
    """(job id, filter) of a frame path, or None when it isn't one of ours."""
    try:
        relative = Path(path).relative_to(frames_dir)
    except ValueError:
        return None
    parts = relative.parts
    # jobs / <job id> / <target> / Light / <filter> / file — the <target> folder may be missing:
    # Ekos sanitizes %t and may leave nothing of a name it can't put in a path (Cyrillic)
    if len(parts) < 5 or parts[0] != JOBS_DIR:
        return None
    if not parts[-1].lower().endswith(EXTENSIONS) or parts[-3] != "Light":
        return None
    ref, filter_ = parts[1], parts[-2]
    if not ref or not filter_ or len(filter_) > 10:
        return None
    return (ref, filter_)


def scan(frames_dir: str, known, now: float, settle_seconds: float = 10.0) -> list[Frame]:
    """New frames (not `known(path)`) under the jobs/ folder, oldest first."""
    found: list[Frame] = []
    root = os.path.join(frames_dir, JOBS_DIR)
    if not os.path.isdir(root):
        return found
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
            found.append(Frame(path, parsed[0], parsed[1], time))
    found.sort(key=lambda f: (f.time, f.path))
    return found
