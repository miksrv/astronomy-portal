"""The agent's local state for telescope jobs (SQLite, standard library).

- `jobs`    — the portal's desired state as last pulled, plus what the agent knows locally:
              its own view of the status (`local_status`, ahead of the portal while updates wait
              in the outbox), the highest `seq` it has used, and `base_progress` — the portal's
              counts when this database first saw the job, so a lost database never loses frames,
              and `base_frame_time` — the portal's last frame then: the frames up to it are in
              `base_progress` already and are not counted again (a job re-inserted, a rescan of
              the SSD after a lost database).
- `outbox`  — updates for the portal in the order they happened, each with its per-job `seq`.
- `frames`  — every frame the agent has seen (path, job or patrol target, filter, time). Frames are
              moved away to the archive in the morning; their rows stay, they are the counts.
- `visits`  — patrol visits built from the patrol frames, until the portal has them.
- `meta`    — small key/value facts (the last loaded plan, …).

One connection, used from one thread at a time (the agent's job loop).
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id              TEXT PRIMARY KEY,
    version         INTEGER NOT NULL,
    portal_status   TEXT NOT NULL,
    local_status    TEXT NOT NULL,
    cancel_requested INTEGER NOT NULL DEFAULT 0,
    data            TEXT NOT NULL,
    base_progress   TEXT NOT NULL DEFAULT '{}',
    base_frame_time TEXT,
    last_seq        INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS outbox (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id  TEXT NOT NULL,
    seq     INTEGER NOT NULL,
    type    TEXT NOT NULL,
    time    TEXT NOT NULL,
    payload TEXT,
    UNIQUE (job_id, seq)
);
CREATE TABLE IF NOT EXISTS frames (
    path      TEXT PRIMARY KEY,
    job_id    TEXT,
    target_id INTEGER,
    filter    TEXT NOT NULL,
    time      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS frames_job ON frames (job_id);
CREATE INDEX IF NOT EXISTS frames_target ON frames (target_id, time);
CREATE TABLE IF NOT EXISTS visits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id  INTEGER NOT NULL,
    time       TEXT NOT NULL,
    last_frame TEXT NOT NULL,
    frames     INTEGER NOT NULL,
    reported   INTEGER NOT NULL DEFAULT 0,
    sent       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (target_id, time)
);
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


class JobState:
    def __init__(self, path: str | Path) -> None:
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        # The agent calls it from worker threads, never two at a time (one job step in flight)
        self.db = sqlite3.connect(str(path), isolation_level=None, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript(SCHEMA)
        columns = {row["name"] for row in self.db.execute("PRAGMA table_info(jobs)")}
        if "base_frame_time" not in columns:  # a database of 0.2.0 before the column
            self.db.execute("ALTER TABLE jobs ADD COLUMN base_frame_time TEXT")

    def close(self) -> None:
        self.db.close()

    # --- transactions ----------------------------------------------------------------------

    def transaction(self) -> "_Transaction":
        return _Transaction(self.db)

    # --- jobs ------------------------------------------------------------------------------

    def jobs(self) -> list[dict]:
        return [self._job(row) for row in self.db.execute("SELECT * FROM jobs ORDER BY rowid")]

    def job(self, job_id: str) -> dict | None:
        row = self.db.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._job(row) if row else None

    @staticmethod
    def _job(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "version": row["version"],
            "portal_status": row["portal_status"],
            "local_status": row["local_status"],
            "cancel_requested": bool(row["cancel_requested"]),
            "data": json.loads(row["data"]),
            "base_progress": json.loads(row["base_progress"]),
            "base_frame_time": row["base_frame_time"],
            "last_seq": row["last_seq"],
        }

    def insert_job(self, job: dict, local_status: str) -> None:
        self.db.execute(
            "INSERT INTO jobs (id, version, portal_status, local_status, cancel_requested, data, base_progress,"
            " base_frame_time, last_seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                job["id"],
                int(job["version"]),
                job["status"],
                local_status,
                1 if job.get("cancelRequested") else 0,
                json.dumps(job, ensure_ascii=False),
                json.dumps(_counts(job.get("progress"))),
                job["lastFrameAt"] if isinstance(job.get("lastFrameAt"), str) else None,
                int(job.get("lastSeq") or 0),
            ),
        )

    def update_job(self, job: dict, local_status: str) -> None:
        """Takes the portal's fields; `last_seq` only grows (the portal may be behind the outbox)."""
        self.db.execute(
            "UPDATE jobs SET version = ?, portal_status = ?, local_status = ?, cancel_requested = ?, data = ?,"
            " last_seq = MAX(last_seq, ?) WHERE id = ?",
            (
                int(job["version"]),
                job["status"],
                local_status,
                1 if job.get("cancelRequested") else 0,
                json.dumps(job, ensure_ascii=False),
                int(job.get("lastSeq") or 0),
                job["id"],
            ),
        )

    def set_local_status(self, job_id: str, status: str) -> None:
        self.db.execute("UPDATE jobs SET local_status = ? WHERE id = ?", (status, job_id))

    def delete_job(self, job_id: str) -> None:
        """Forgets a job the portal no longer lists. Its frames stay (they are history)."""
        self.db.execute("DELETE FROM jobs WHERE id = ?", (job_id,))

    # --- outbox ----------------------------------------------------------------------------

    def enqueue(self, job_id: str, type_: str, time: str, payload: dict | None = None) -> int:
        """Adds an update with the job's next seq; returns the seq."""
        row = self.db.execute("SELECT last_seq FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        seq = row["last_seq"] + 1
        self.db.execute("UPDATE jobs SET last_seq = ? WHERE id = ?", (seq, job_id))
        self.db.execute(
            "INSERT INTO outbox (job_id, seq, type, time, payload) VALUES (?, ?, ?, ?, ?)",
            (job_id, seq, type_, time, json.dumps(payload, ensure_ascii=False) if payload else None),
        )
        return seq

    def outbox(self, limit: int) -> list[dict]:
        rows = self.db.execute("SELECT * FROM outbox ORDER BY id LIMIT ?", (limit,)).fetchall()
        return [
            {
                "id": row["id"],
                "jobId": row["job_id"],
                "seq": row["seq"],
                "type": row["type"],
                "time": row["time"],
                **({"payload": json.loads(row["payload"])} if row["payload"] else {}),
            }
            for row in rows
        ]

    def outbox_count(self, job_id: str | None = None) -> int:
        if job_id is None:
            return self.db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]
        return self.db.execute("SELECT COUNT(*) FROM outbox WHERE job_id = ?", (job_id,)).fetchone()[0]

    def drop_outbox(self, ids: list[int]) -> None:
        self.db.executemany("DELETE FROM outbox WHERE id = ?", [(i,) for i in ids])

    def renumber_outbox(self, job_id: str, after_seq: int) -> None:
        """The portal has the job only up to `after_seq` (a gap): our waiting updates of the job get
        seq after_seq + 1, + 2, … in their order. Safe because every update is a state, not a delta."""
        rows = self.db.execute("SELECT id FROM outbox WHERE job_id = ? ORDER BY id", (job_id,)).fetchall()
        # Two passes, so the UNIQUE (job_id, seq) never collides mid-way
        for row in rows:
            self.db.execute("UPDATE outbox SET seq = -id WHERE id = ?", (row["id"],))
        seq = after_seq
        for row in rows:
            seq += 1
            self.db.execute("UPDATE outbox SET seq = ? WHERE id = ?", (seq, row["id"]))
        self.db.execute("UPDATE jobs SET last_seq = ? WHERE id = ?", (seq, job_id))

    # --- frames ----------------------------------------------------------------------------

    def has_frame(self, path: str) -> bool:
        return self.db.execute("SELECT 1 FROM frames WHERE path = ?", (path,)).fetchone() is not None

    def add_frame(self, path: str, filter_: str, time: str, job_id: str | None = None, target_id: int | None = None) -> bool:
        cursor = self.db.execute(
            "INSERT OR IGNORE INTO frames (path, job_id, target_id, filter, time) VALUES (?, ?, ?, ?, ?)",
            (path, job_id, target_id, filter_, time),
        )
        return cursor.rowcount == 1

    def frame_counts(self, job_id: str, after: str | None = None) -> dict[str, int]:
        """Frames of the job per filter; with `after` (ISO UTC) only the ones taken later."""
        rows = self.db.execute(
            "SELECT filter, COUNT(*) AS n FROM frames WHERE job_id = ? AND (? IS NULL OR time > ?) GROUP BY filter",
            (job_id, after, after),
        )
        return {row["filter"]: row["n"] for row in rows}

    # --- patrol visits ---------------------------------------------------------------------

    def add_patrol_frame_to_visit(self, target_id: int, time: str, gap_seconds: int) -> None:
        """A patrol frame joins the target's latest visit if it came within `gap_seconds` of its last
        frame and the visit is not over yet; otherwise it starts a new visit. Once reported, a
        visit keeps its start time: with the target it is the visit's key on the site."""
        row = self.db.execute(
            "SELECT id, last_frame, reported, sent FROM visits WHERE target_id = ? ORDER BY last_frame DESC LIMIT 1", (target_id,)
        ).fetchone()
        if row and not row["sent"] and _seconds_between(row["last_frame"], time) <= gap_seconds:
            self.db.execute(
                "UPDATE visits SET frames = frames + 1, last_frame = MAX(last_frame, ?),"
                " time = CASE WHEN reported > 0 THEN time ELSE MIN(time, ?) END WHERE id = ?",
                (time, time, row["id"]),
            )
            return
        self.db.execute(
            "INSERT OR IGNORE INTO visits (target_id, time, last_frame, frames) VALUES (?, ?, ?, 1)", (target_id, time, time)
        )

    def visits_to_report(self, before: str) -> list[dict]:
        """Visits the site doesn't know as they are: new frames since the last report, or over
        (last frame older than `before`, ISO UTC) and not yet reported as over."""
        rows = self.db.execute(
            "SELECT id, target_id, time, last_frame, frames FROM visits"
            " WHERE sent = 0 AND (frames != reported OR last_frame < ?) ORDER BY id",
            (before,),
        )
        return [dict(row) for row in rows]

    def mark_visits_reported(self, visits: list[dict], before: str) -> None:
        """The site has these visits with these counts; the ones that are over are done."""
        self.db.executemany(
            "UPDATE visits SET reported = ?, sent = CASE WHEN last_frame < ? AND frames = ? THEN 1 ELSE 0 END WHERE id = ?",
            [(v["frames"], before, v["frames"], v["id"]) for v in visits],
        )

    # --- meta ------------------------------------------------------------------------------

    def get_meta(self, key: str) -> str | None:
        row = self.db.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None

    def set_meta(self, key: str, value: str) -> None:
        self.db.execute("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", (key, value))


class _Transaction:
    def __init__(self, db: sqlite3.Connection) -> None:
        self.db = db

    def __enter__(self) -> None:
        self.db.execute("BEGIN IMMEDIATE")

    def __exit__(self, exc_type, exc, tb) -> None:
        self.db.execute("ROLLBACK" if exc_type else "COMMIT")


def _counts(value) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    return {str(k): int(v) for k, v in value.items() if isinstance(v, int) and v >= 0}


def _seconds_between(a: str, b: str) -> float:
    from datetime import datetime

    def parse(text: str) -> datetime:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))

    return abs((parse(b) - parse(a)).total_seconds())
