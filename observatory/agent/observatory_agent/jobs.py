"""Telescope jobs from the site, on the observatory side (features/observatory-agent.md §4.3–4.6).

`JobsRunner.step()` is called from the agent's loop (in a worker thread, one call at a time):

1. **Sync** (every `sync_interval`, 5 min): pull the full desired state, reconcile the local
   database (new approved job → `accepted`), push the outbox in order, fetch the patrol targets,
   report the patrol visits (also while they are shot: the night's first one makes the patrol
   job on the site).
2. **Frames** (every `frames_interval`, 30 s): new FITS files in the jobs' folders → absolute
   counts → `started` (first frame) + `progress`, and `completed` once every filter has its count.
3. **Ekos** (same cadence): the job Ekos is running → `started`; the Scheduler back to idle, or
   dawn → `night_ended` for the jobs that were running; a requested cancel is confirmed only once
   the job is no longer in the Scheduler (reloading the schedule without it while it is idle).
4. **Plan** (from `plan_hours_before_dusk` before dusk until dawn): build tonight's plan, write the
   .esq/.esl files, post the plan to the site, and — only with `load_into_ekos` — load it into the
   idle Scheduler when every job in it is the agent's own. **Never starts the Scheduler.**

Nothing is sent before the first successful pull: the per-job `seq` must continue from the
portal's `lastSeq`.
"""

from __future__ import annotations

import hashlib
import json
import logging
import shutil
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from . import ekos as ekos_mod
from . import ekosfiles, ephem, frames
from .config import Config
from .jobstate import JobState
from .planner import Planner, evening_date, evening_noon_utc, is_complete, notice
from .portal import PortalClient, PortalError

log = logging.getLogger(__name__)

AGENT_STATUSES = ("approved", "queued", "running")
MAX_UPDATES_PER_REQUEST = 500
# A patrol visit ends when no frame of the target came for this long
VISIT_GAP_SECONDS = 2 * 3600
VISIT_DONE_MINUTES = 20
# Replan at most this often while the inputs keep changing (frames during the night)
MIN_REPLAN_SECONDS = 600
# A load refused for a passing reason is tried again with the next plan (every MIN_REPLAN_SECONDS)
RETRY_LOAD_CODES = ("ekos-unreachable", "scheduler-busy", "foreign-jobs")
# With the Sun above this (and Ekos not shooting) jobs still running are put back to queued
DAY_SUN_ALTITUDE = -6.0
KEEP_NIGHTS = 7
# A cancel waits while Ekos can't be read; unreadable this long, KStars/Ekos is down (nothing shoots)
EKOS_DOWN_SECONDS = 15 * 60


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(when: datetime) -> str:
    return when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _valid_job(job) -> bool:
    return (
        isinstance(job, dict)
        and isinstance(job.get("id"), str)
        and 0 < len(job["id"]) <= 32
        and job["id"].isalnum()
        and isinstance(job.get("version"), int)
        and job.get("status") in AGENT_STATUSES
        and isinstance(job.get("plan"), list)
        and isinstance(job.get("ra"), (int, float))
        and isinstance(job.get("dec"), (int, float))
        and (job.get("lastSeq") is None or (isinstance(job["lastSeq"], int) and not isinstance(job["lastSeq"], bool)))
    )


class JobsRunner:
    def __init__(self, config: Config, portal: PortalClient, ekos: ekos_mod.EkosClient | None, state: JobState | None = None) -> None:
        self.config = config
        self.jobs_config = config.jobs
        self.portal = portal
        self.ekos = ekos
        self.state = state or JobState(config.jobs.state_db)
        self.tz = ZoneInfo(config.site.timezone)
        self.settings: dict = {}
        self.patrol_targets: list[dict] = []
        self.synced = False
        self._last_sync = -1e9
        self._last_frames = -1e9
        self._last_plan = -1e9
        self._plan_inputs: str | None = None
        self._load_failed_inputs: str | None = None
        self._ekos_info: ekos_mod.SchedulerInfo | None = None
        self._ekos_was_busy = False
        # When a job's night was ended (job id → ISO UTC): a frame shot before it, counted late (a
        # frame settles for a few seconds), must not start the job again
        self._night_ended: dict[str, str] = {}
        self._patrol_frames = False
        self._ekos_unreadable_since: datetime | None = None
        self._nights: dict[date, ephem.Night] = {}

    # --- the loop --------------------------------------------------------------------------

    def step(self, snapshot: dict | None, monotonic: float | None = None) -> None:
        now_m = time.monotonic() if monotonic is None else monotonic
        if now_m - self._last_sync >= self.jobs_config.sync_interval:
            self._last_sync = now_m
            self.sync()
        if not self.synced:
            return
        if now_m - self._last_frames >= self.jobs_config.frames_interval:
            self._last_frames = now_m
            changed = self.process_frames()
            changed |= self.observe_ekos()
            if changed:
                self.push_outbox()
            if self._patrol_frames:
                self._patrol_frames = False
                self.push_visits()
        self.maybe_plan(snapshot, now_m)

    # --- sync with the portal ----------------------------------------------------------------

    def sync(self) -> None:
        try:
            answer = self.portal.get_jobs()
        except PortalError as error:
            log.warning("jobs pull failed: %s", error)
            return
        jobs = answer.get("jobs")
        settings = answer.get("settings")
        if not isinstance(jobs, list) or not isinstance(settings, dict):
            log.error("jobs pull: unexpected answer")
            return
        self.settings = settings
        self.reconcile(jobs)
        self.synced = True
        if (settings.get("patrol") or {}).get("enabled"):
            try:
                self.patrol_targets = self.portal.get_patrol()
            except PortalError as error:
                log.warning("patrol targets pull failed: %s", error)
        self.push_outbox()
        self.push_visits()

    def reconcile(self, desired: list) -> None:
        """Takes the portal's desired state; a new approved job is accepted."""
        now = iso(utc_now())
        seen: set[str] = set()
        with self.state.transaction():
            for job in desired:
                if not _valid_job(job):
                    log.error("jobs pull: skipping a malformed job %r", (job or {}).get("id") if isinstance(job, dict) else job)
                    if isinstance(job, dict) and isinstance(job.get("id"), str):
                        seen.add(job["id"])  # still on the site: keep what we know of it untouched
                    continue
                seen.add(job["id"])
                local = self.state.job(job["id"])
                if local is None:
                    self.state.insert_job(job, job["status"])
                    local_status = job["status"]
                    log.info("job %s (%s) is new, %s", job["id"], job.get("targetName"), job["status"])
                else:
                    # While our updates wait in the outbox, our status is ahead of the portal's
                    pending = self.state.outbox_count(job["id"]) > 0
                    local_status = local["local_status"] if pending else job["status"]
                    self.state.update_job(job, local_status)
                    if local["version"] != job["version"]:
                        log.info("job %s changed on the site (version %s → %s)", job["id"], local["version"], job["version"])
                if job["status"] == "approved" and local_status == "approved":
                    self.state.enqueue(job["id"], "accepted", now)
                    self.state.set_local_status(job["id"], "queued")
                    local_status = "queued"
                    log.info("job %s accepted", job["id"])
                # Every frame is there and no new one will come to say so (completion is otherwise
                # noticed with a new frame): the plan was cut on the site below what is shot, or
                # this database is new and the site's counts are already the whole plan
                if local_status in ("queued", "running") and is_complete(job["plan"], self.progress_of(self.state.job(job["id"]))):
                    self.state.enqueue(job["id"], "completed", now)
                    self.state.set_local_status(job["id"], "completed")
                    log.info("job %s completed (nothing left to shoot)", job["id"])
            for local in self.state.jobs():
                if local["id"] not in seen and self.state.outbox_count(local["id"]) == 0:
                    # Final on the site (completed, cancelled, expired, …): forget it, keep its frames
                    self.state.delete_job(local["id"])
                    log.info("job %s is no longer on the site's list", local["id"])

    def push_outbox(self) -> None:
        for _ in range(5):
            items = self.state.outbox(MAX_UPDATES_PER_REQUEST)
            if not items:
                return
            try:
                answer = self.portal.post_updates([{k: v for k, v in item.items() if k != "id"} for item in items])
            except PortalError as error:
                log.warning("updates push failed (%d waiting): %s", self.state.outbox_count(), error)
                return
            results = answer.get("results")
            if not isinstance(results, list):
                log.error("updates push: unexpected answer")
                return
            done: list[int] = []
            gap = None
            for item, result in zip(items, results):
                outcome = result.get("result") if isinstance(result, dict) else None
                if outcome in ("applied", "ignored", "duplicate"):
                    done.append(item["id"])
                    if outcome == "ignored":
                        log.info("update %s #%s (%s) ignored by the site", item["jobId"], item["seq"], item["type"])
                elif outcome in ("invalid", "unknown_job"):
                    done.append(item["id"])
                    log.error("update %s #%s (%s) rejected: %s", item["jobId"], item["seq"], item["type"], outcome)
                elif outcome == "gap" and isinstance(result.get("lastSeq"), int):
                    gap = (item["jobId"], result["lastSeq"])
                    break
                else:
                    log.error("update %s #%s: unexpected result %r", item["jobId"], item["seq"], result)
                    break
            with self.state.transaction():
                self.state.drop_outbox(done)
                if gap:
                    log.warning("job %s: the site has seq up to %s, renumbering the waiting updates", *gap)
                    self.state.renumber_outbox(*gap)
            if not gap and len(done) < len(items) and not answer.get("stopped"):
                return  # something unexpected: try again on the next cycle

    def push_visits(self) -> None:
        """Patrol visits go to the site while they are shot too: the night's first one makes the
        patrol job there (the site counts a visit once per target + start time, the larger
        count wins). A visit is done once it is over and reported as such."""
        before = iso(utc_now() - timedelta(minutes=VISIT_DONE_MINUTES))
        visits = self.state.visits_to_report(before)[:500]
        if not visits:
            return
        try:
            answer = self.portal.post_visits(
                [{"target": v["target_id"], "time": v["time"], "lastFrame": v["last_frame"], "frames": v["frames"]} for v in visits]
            )
        except PortalError as error:
            log.warning("patrol visits push failed: %s", error)
            return
        with self.state.transaction():
            self.state.mark_visits_reported(visits, before)
        log.info("patrol visits reported: %s", answer)

    # --- frames ------------------------------------------------------------------------------

    def progress_of(self, job: dict) -> dict[str, int]:
        counts = dict(job["base_progress"])
        for filter_, n in self.state.frame_counts(job["id"], job["base_frame_time"]).items():
            counts[filter_] = counts.get(filter_, 0) + n
        return counts

    def process_frames(self) -> bool:
        found = frames.scan(self.config.frames_dir, self.state.has_frame, time.time())
        if not found:
            return False
        touched: dict[str, str] = {}
        with self.state.transaction():
            for frame in found:
                if frame.kind == "job":
                    self.state.add_frame(frame.path, frame.filter, frame.time, job_id=frame.ref)
                    touched[frame.ref] = max(touched.get(frame.ref, ""), frame.time)
                else:
                    if self.state.add_frame(frame.path, frame.filter, frame.time, target_id=int(frame.ref)):
                        self.state.add_patrol_frame_to_visit(int(frame.ref), frame.time, VISIT_GAP_SECONDS)
                        self._patrol_frames = True
            for job_id, frame_time in touched.items():
                job = self.state.job(job_id)
                if job is None:
                    log.warning("frames of job %s, which the agent doesn't know (any more)", job_id)
                    continue
                counts = self.progress_of(job)
                if job["local_status"] == "queued" and frame_time > self._night_ended.get(job_id, ""):
                    self.state.enqueue(job_id, "started", frame_time)
                    self.state.set_local_status(job_id, "running")
                self.state.enqueue(job_id, "progress", frame_time, {"progress": counts, "frameTime": frame_time})
                log.info("job %s progress %s", job_id, counts)
                if job["local_status"] in ("queued", "running") and is_complete(job["data"].get("plan") or [], counts):
                    self.state.enqueue(job_id, "completed", frame_time)
                    self.state.set_local_status(job_id, "completed")
                    log.info("job %s completed", job_id)
        return bool(touched)

    # --- Ekos --------------------------------------------------------------------------------

    def _read_ekos(self) -> ekos_mod.SchedulerInfo | None:
        if self.ekos is None:
            return None
        try:
            return self.ekos.info()
        except ekos_mod.EkosError as error:
            log.debug("Ekos not readable: %s", error)
            return None

    def observe_ekos(self) -> bool:
        info = self._read_ekos()
        self._ekos_info = info
        now = utc_now()
        if info is not None or self.ekos is None:
            self._ekos_unreadable_since = None
        elif self._ekos_unreadable_since is None:
            self._ekos_unreadable_since = now
        changed = False
        busy = info is not None and info.status in (ekos_mod.STATE_STARTUP, ekos_mod.STATE_RUNNING, ekos_mod.STATE_SHUTDOWN, ekos_mod.STATE_PAUSED)
        key = ekos_mod.job_key_of(info.current, self.jobs_config.ekos_dir_container) if busy and info else None
        # Daytime with Ekos not shooting: whatever was running is over — also after the PC was off
        # for days (the night it was running in is long gone)
        daytime = not busy and ephem.sun_altitude(now, self.config.site.latitude, self.config.site.longitude) > DAY_SUN_ALTITUDE

        with self.state.transaction():
            if key and key.startswith("job-"):
                job_id = key[len("job-") :].rsplit("-", 1)[0]
                job = self.state.job(job_id)
                if job and job["local_status"] == "queued":
                    self.state.enqueue(job_id, "started", iso(now))
                    self.state.set_local_status(job_id, "running")
                    log.info("job %s started by Ekos", job_id)
                    changed = True

            stopped = self._ekos_was_busy and info is not None and not busy
            if stopped or daytime:
                reason = "scheduler-stopped" if stopped else "day"
                for job in self.state.jobs():
                    if job["local_status"] == "running":
                        self.state.enqueue(job["id"], "night_ended", iso(now), {"reason": reason})
                        self.state.set_local_status(job["id"], "queued")
                        self._night_ended[job["id"]] = iso(now)
                        log.info("job %s: night ended (%s)", job["id"], reason)
                        changed = True

            changed |= self._confirm_cancels(info, busy, now)
        if info is not None:
            self._ekos_was_busy = busy
        return changed

    def _in_ekos(self, info: ekos_mod.SchedulerInfo | None, job_id: str) -> bool | None:
        if info is None:
            return None
        prefix = f"job-{job_id}-"
        return any((ekos_mod.job_key_of(j, self.jobs_config.ekos_dir_container) or "").startswith(prefix) for j in info.jobs)

    def _confirm_cancels(self, info: ekos_mod.SchedulerInfo | None, busy: bool, now: datetime) -> bool:
        """A cancel is confirmed once the job can no longer be shot: it is not in the Scheduler.
        Otherwise the next plan, loaded while the Scheduler is idle, leaves it out — and the job
        is confirmed on the following check. While Ekos can't be read the cancel waits (a
        schedule a person loaded by hand may be running), unless Ekos stays unreadable for
        EKOS_DOWN_SECONDS (KStars/Ekos is down: nothing shoots) or the agent has no Ekos access
        at all (`ekos.enabled` off: it can never check)."""
        ekos_down = self._ekos_unreadable_since is not None and (now - self._ekos_unreadable_since).total_seconds() >= EKOS_DOWN_SECONDS
        changed = False
        for job in self.state.jobs():
            if not job["cancel_requested"] or job["local_status"] not in ("queued", "running", "approved"):
                continue
            in_ekos = self._in_ekos(info, job["id"])
            if in_ekos is None and self.ekos is not None and not ekos_down:
                continue  # can't see Ekos right now: wait
            if in_ekos:
                # Still in the schedule — loaded by us or by a person by hand: Start would shoot
                # it. Wait for the next reload (or the person) to take it out
                continue
            if job["local_status"] == "running" and busy:
                continue
            self.state.enqueue(job["id"], "cancelled", iso(now))
            self.state.set_local_status(job["id"], "cancelled")
            log.info("job %s cancelled as requested", job["id"])
            changed = True
        return changed

    # --- the night's plan ---------------------------------------------------------------------

    def _night(self, evening: date) -> ephem.Night:
        if evening not in self._nights:
            self._nights = {evening: ephem.night_of(evening_noon_utc(evening, self.tz), self.config.site.latitude, self.config.site.longitude)}
        return self._nights[evening]

    @staticmethod
    def _wheel(snapshot: dict | None) -> list[str] | None:
        names = ((snapshot or {}).get("filter") or {}).get("names")
        return [str(n) for n in names] if isinstance(names, list) and names else None

    def _warnings(self, snapshot: dict | None, wheel: list[str] | None) -> list[dict]:
        warnings = []
        if not (snapshot or {}).get("indi", {}).get("online"):
            warnings.append(notice("indi-offline"))
            return warnings
        if wheel is None:
            warnings.append(notice("no-filter-wheel"))
        if "Focus" in self.jobs_config.steps and not (snapshot or {}).get("focuser"):
            warnings.append(notice("no-focuser"))
        if not (snapshot or {}).get("guider") and "Guide" in self.jobs_config.steps:
            warnings.append(notice("no-guider"))
        return warnings

    def maybe_plan(self, snapshot: dict | None, now_m: float) -> None:
        now = utc_now()
        evening = evening_date(now, self.tz)
        night = self._night(evening)
        if not night.has_darkness:
            return
        opens = night.nautical_start - timedelta(hours=self.jobs_config.plan_hours_before_dusk)
        if not (opens <= now < night.nautical_end):
            return

        # Called with every tick of the agent: the inputs are only read once a replan may be due
        if now_m - self._last_plan < MIN_REPLAN_SECONDS:
            return

        wheel = self._wheel(snapshot)
        jobs = self.state.jobs()
        progress = {job["id"]: self.progress_of(job) for job in jobs}
        inputs = hashlib.sha256(
            json.dumps(
                [
                    evening.isoformat(),
                    [(j["id"], j["version"], j["local_status"], j["cancel_requested"]) for j in jobs],
                    progress,
                    [(t.get("id"), t.get("lastVisitAt"), t.get("enabled", True)) for t in self.patrol_targets],
                    self.settings,
                    wheel,
                ],
                sort_keys=True,
                default=str,
            ).encode()
        ).hexdigest()
        if inputs == self._plan_inputs:
            return
        self._last_plan = now_m
        self._plan_inputs = inputs

        planner = Planner(self.config.site.latitude, self.config.site.longitude, float(self.settings.get("altitudeFloor") or 15), self.jobs_config.steps)
        plan = planner.build(evening, night, jobs, progress, self.settings, self.patrol_targets, now, wheel)
        report = plan.report
        report["warnings"] = self._warnings(snapshot, wheel)
        report["autonomousMode"] = bool(self.settings.get("autonomousMode"))

        try:
            esl_host, esl_container = self._write_files(plan, wheel, inputs[:12])
        except (OSError, ekosfiles.EkosFileError, ValueError) as error:
            log.error("plan files not written: %s", error)
            report["ekos"] = {"loaded": False, "reason": notice("files-not-written", error=str(error)[:200])}
            self._post_plan(evening, report)
            return

        report["ekos"] = self._load(plan, esl_container, wheel, inputs)
        if report["ekos"].get("loaded"):
            self._prune_plans(esl_host.parent)
        elif (report["ekos"].get("reason") or {}).get("code") in RETRY_LOAD_CODES:
            self._plan_inputs = None  # Ekos may be free / reachable later: plan and try again
        self._post_plan(evening, report)
        log.info("plan for %s: %d Ekos jobs; ekos %s", evening, len(plan.groups), report["ekos"])

    def _post_plan(self, evening: date, report: dict) -> None:
        try:
            self.portal.post_plan(evening.isoformat(), report)
        except PortalError as error:
            log.warning("plan push failed: %s", error)

    def _write_files(self, plan, wheel: list[str] | None, version: str) -> tuple[Path, str]:
        """Each plan goes to a folder of its own, `<night>/<version>/`: the schedule Ekos has
        loaded keeps its sequence files while a newer plan is written (or fails half-way).
        `<night>/tonight.esl` is a copy of the newest one, for loading by hand."""
        cfg = self.jobs_config
        night_dir = Path(cfg.ekos_dir) / plan.night.isoformat()
        plan_dir = night_dir / version
        container_dir = f"{cfg.ekos_dir_container.rstrip('/')}/{plan.night.isoformat()}/{version}"
        ekos_jobs = []
        for group in plan.groups:
            fits_dir = frames.job_dir(self.config.frames_dir, str(group.ref)) if group.kind == "job" else frames.patrol_dir(self.config.frames_dir, int(group.ref))
            rows = [ekosfiles.SequenceRow(f, exp, n) for f, exp, n in group.rows]
            text = ekosfiles.sequence_xml(rows, self.config.camera, fits_dir, group.binning)
            ekosfiles.check_sequence(text, wheel, fits_dir)
            ekosfiles.write_atomic(plan_dir / f"{group.key}.esq", text)
            ekos_jobs.append(
                ekosfiles.EkosJob(
                    name=group.name,
                    ra_deg=group.ra,
                    dec_deg=group.dec,
                    sequence_path=f"{container_dir}/{group.key}.esq",
                    min_altitude=group.min_altitude,
                    min_moon_separation=group.min_moon_separation,
                    steps=list(cfg.steps),
                )
            )
        text = ekosfiles.schedule_xml(ekos_jobs, cfg.ekos_profile, cfg.optical_train)
        floor = max(15.0, float(self.settings.get("altitudeFloor") or 15))
        ekosfiles.check_schedule(text, cfg.optical_train, floor, cfg.ekos_dir_container)
        esl = plan_dir / "tonight.esl"
        ekosfiles.write_atomic(esl, text)
        ekosfiles.write_atomic(night_dir / "tonight.esl", text)
        self._prune_nights(Path(cfg.ekos_dir))
        return esl, f"{container_dir}/tonight.esl"

    @staticmethod
    def _prune_plans(loaded_dir: Path) -> None:
        """After a load Ekos only refers to `loaded_dir`: the night's other plans can go."""
        for other in loaded_dir.parent.iterdir():
            if other.is_dir() and other != loaded_dir:
                shutil.rmtree(other, ignore_errors=True)

    @staticmethod
    def _prune_nights(root: Path) -> None:
        nights = sorted(p for p in root.iterdir() if p.is_dir() and len(p.name) == 10 and p.name[4] == "-")
        for old in nights[:-KEEP_NIGHTS]:
            shutil.rmtree(old, ignore_errors=True)

    def _load(self, plan, esl_container: str, wheel: list[str] | None, inputs: str) -> dict:
        cfg = self.jobs_config
        if not cfg.load_into_ekos:
            return {"loaded": False, "reason": notice("load-off")}
        if self.ekos is None:
            return {"loaded": False, "reason": notice("ekos-off")}
        if wheel is None:
            return {"loaded": False, "reason": notice("wheel-unknown")}
        if inputs == self._load_failed_inputs:
            return {"loaded": False, "reason": notice("load-failed-before")}
        info = self._read_ekos()
        if info is None:
            return {"loaded": False, "reason": notice("ekos-unreachable")}
        if not plan.groups and not info.jobs:
            return {"loaded": False, "reason": notice("nothing-to-load")}
        allowed, why = ekos_mod.may_load(info, cfg.ekos_dir_container)
        if not allowed:
            return {"loaded": False, "reason": why}
        try:
            ok = self.ekos.load_schedule(esl_container)
            after = self.ekos.info()
        except ekos_mod.EkosError as error:
            # A hung call may mean a dialog opened in KStars: never retry the same plan by itself
            self._load_failed_inputs = inputs
            log.error("loading the schedule failed: %s", error)
            return {"loaded": False, "reason": notice("load-failed", error=str(error)[:200])}
        if not ok or len(after.jobs) != len(plan.groups):
            self._load_failed_inputs = inputs
            log.error("loading the schedule failed: reply %s, %d jobs in Ekos, %d planned", ok, len(after.jobs), len(plan.groups))
            return {"loaded": False, "reason": notice("load-mismatch", loaded=len(after.jobs), planned=len(plan.groups))}
        self._ekos_info = after
        log.info("schedule loaded into Ekos (%d jobs); the Scheduler is NOT started", len(plan.groups))
        return {"loaded": True, "jobs": len(plan.groups), "started": False}
