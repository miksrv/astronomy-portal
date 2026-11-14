"""The job loop end to end against a fake portal (with the site's seq rules) and a fake Ekos."""

import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from observatory_agent import jobs as jobs_mod
from observatory_agent.config import Config, JobsConfig, SiteConfig
from observatory_agent.ekos import SchedulerInfo
from observatory_agent.jobs import JobsRunner
from observatory_agent.jobstate import JobState
from observatory_agent.portal import PortalError

UTC = timezone.utc
NOON = datetime(2026, 12, 10, 12, 0, tzinfo=UTC)
EVENING = datetime(2026, 12, 10, 15, 0, tzinfo=UTC)  # plan window open (dusk ≈ 16:38 at 50°N 10°E)
NIGHT = datetime(2026, 12, 10, 21, 0, tzinfo=UTC)  # dark: frames come in
M31 = (10.6847, 41.2690)
SNAPSHOT = {"indi": {"online": True}, "filter": {"names": ["L", "R", "G", "B", "H", "O", "S"]}, "focuser": {"position": 1}, "guider": {}}


class FakePortal:
    """Applies updates like TelescopeAgentSync: duplicate / applied / gap per job seq."""

    def __init__(self):
        self.jobs: list[dict] = []
        self.settings = {"autonomousMode": False, "altitudeFloor": 15, "filters": ["L", "R", "G", "B", "H", "O", "S"], "patrol": {"enabled": False}}
        self.last_seq: dict[str, int] = {}
        self.received: list[dict] = []
        self.plans: list[tuple[str, dict]] = []
        self.visits: list[dict] = []
        self.patrol: list[dict] = []
        self.down = False

    def get_jobs(self):
        if self.down:
            raise PortalError("down")
        for job in self.jobs:
            job["lastSeq"] = self.last_seq.get(job["id"], job.get("lastSeq", 0))
        return {"serverTime": "x", "settings": self.settings, "jobs": [dict(j) for j in self.jobs]}

    def post_updates(self, updates):
        if self.down:
            raise PortalError("down")
        results = []
        for update in updates:
            last = self.last_seq.get(update["jobId"], 0)
            if update["seq"] <= last:
                results.append({"jobId": update["jobId"], "seq": update["seq"], "result": "duplicate", "lastSeq": last})
            elif update["seq"] > last + 1:
                results.append({"jobId": update["jobId"], "seq": update["seq"], "result": "gap", "lastSeq": last})
                return {"results": results, "stopped": True}
            else:
                self.last_seq[update["jobId"]] = update["seq"]
                self.received.append(update)
                results.append({"jobId": update["jobId"], "seq": update["seq"], "result": "applied"})
        return {"results": results, "stopped": False}

    def get_patrol(self):
        return self.patrol

    def post_visits(self, visits):
        self.visits.extend(visits)
        return {"recorded": len(visits), "duplicates": 0, "invalid": 0}

    def post_plan(self, night, plan):
        self.plans.append((night, plan))

    def types(self, job_id=None):
        return [(u["seq"], u["type"]) for u in self.received if job_id is None or u["jobId"] == job_id]


class FakeEkos:
    def __init__(self, host_dir: Path, container_dir: str):
        self.status = 0
        self.jobs: list[dict] = []
        self.current = None
        self.loaded: list[str] = []
        self.host_dir = host_dir
        self.container_dir = container_dir

    def info(self):
        return SchedulerInfo(self.status, list(self.jobs), self.current)

    def load_schedule(self, path):
        self.loaded.append(path)
        host = Path(str(self.host_dir) + path[len(self.container_dir) :])
        root = ET.fromstring(host.read_text())
        self.jobs = [{"name": j.findtext("Name"), "sequence": "file://" + j.findtext("Sequence")} for j in root.iter("Job")]
        return True


def portal_job(id_="a1", status="approved", plan=None, **kw):
    job = {
        "id": id_,
        "version": 1,
        "status": status,
        "cancelRequested": False,
        "held": False,
        "pinned": False,
        "priority": 0,
        "targetName": "M 31",
        "ra": M31[0],
        "dec": M31[1],
        "plan": plan or [{"filter": "L", "exposure": 300, "count": 2}, {"filter": "H", "exposure": 600, "count": 1}],
        "minAltitude": 30,
        "minMoonSeparation": None,
        "validUntil": None,
        "progress": {},
        "lastSeq": 0,
    }
    job.update(kw)
    return job


@pytest.fixture
def env(tmp_path, monkeypatch):
    frames_dir = tmp_path / "fits"
    frames_dir.mkdir()
    config = Config(
        portal_url="http://portal.test",
        token="t" * 32,
        frames_dir=str(frames_dir),
        jobs=JobsConfig(enabled=True, state_db=":memory:", ekos_dir=str(tmp_path / "agent"), ekos_dir_container="/config/agent"),
        site=SiteConfig(latitude=50.0, longitude=10.0, timezone="UTC"),
    )
    portal = FakePortal()
    ekos = FakeEkos(tmp_path / "agent", "/config/agent")
    runner = JobsRunner(config, portal, ekos, JobState(":memory:"))
    clock = {"now": NOON, "mono": 1000.0}
    monkeypatch.setattr(jobs_mod, "utc_now", lambda: clock["now"])
    monkeypatch.setattr(jobs_mod.time, "time", lambda: clock["now"].timestamp())

    class Env:
        pass

    e = Env()
    e.config, e.portal, e.ekos, e.runner, e.clock, e.frames_dir = config, portal, ekos, runner, clock, frames_dir

    def step(minutes=6):
        clock["mono"] += max(minutes * 60, 31)  # every step is a frames check
        clock["now"] += timedelta(minutes=minutes)
        runner.step(SNAPSHOT, clock["mono"])

    def frame(job_id, filter_, kind="jobs", name=None, age_minutes=1):
        path = frames_dir / kind / job_id / "M_31" / "Light" / filter_ / (name or f"M_31_Light_{filter_}_{len(list(frames_dir.rglob('*.fits')))}.fits")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"SIMPLE")
        t = (clock["now"] - timedelta(minutes=age_minutes)).timestamp()
        os.utime(path, (t, t))
        return path

    e.step, e.frame = step, frame
    return e


def test_nothing_happens_before_the_first_pull(env):
    env.portal.down = True
    env.frame("a1", "L")
    env.step()
    assert env.runner.synced is False
    assert env.runner.state.outbox_count() == 0
    assert not env.runner.state.has_frame(str(next(env.frames_dir.rglob("*.fits"))))


def test_an_approved_job_is_accepted_once(env):
    env.portal.jobs = [portal_job()]
    env.step()
    assert env.portal.types("a1") == [(1, "accepted")]
    assert env.runner.state.job("a1")["local_status"] == "queued"
    env.portal.jobs[0]["status"] = "queued"
    env.step()
    assert env.portal.types("a1") == [(1, "accepted")]
    assert env.runner.state.outbox_count() == 0


def test_seq_continues_from_the_portal(env):
    env.portal.jobs = [portal_job(lastSeq=4)]
    env.portal.last_seq["a1"] = 4
    env.step()
    assert env.portal.types("a1") == [(5, "accepted")]


def test_a_gap_renumbers_the_waiting_updates(env):
    env.portal.jobs = [portal_job()]
    env.runner.sync()  # accepted #1 applied
    env.runner.state.enqueue("a1", "progress", "2026-12-10T12:00:00Z", {"progress": {"L": 1}})
    # The site lost its last updates (its database restored from a backup): it knows seq 0 only
    env.portal.last_seq["a1"] = 0
    env.runner.push_outbox()
    assert env.portal.types("a1")[-1] == (1, "progress")
    assert env.runner.state.job("a1")["last_seq"] == 1
    assert env.runner.state.outbox_count() == 0


def test_a_pull_lifts_the_local_seq_to_the_sites(env):
    env.clock["now"] = NIGHT
    env.portal.jobs = [portal_job(status="queued")]
    env.runner.sync()
    env.portal.last_seq["a1"] = 9  # e.g. a second database of the agent wrote meanwhile
    env.runner.sync()
    env.frame("a1", "L")
    env.step(minutes=1)
    assert env.portal.types("a1") == [(10, "started"), (11, "progress")]


def test_updates_wait_while_the_portal_is_down(env):
    env.clock["now"] = NIGHT
    env.portal.jobs = [portal_job()]
    env.runner.sync()
    env.portal.down = True
    env.frame("a1", "L")
    env.step(minutes=1)
    assert env.runner.state.outbox_count() == 2  # started + progress kept
    env.portal.down = False
    env.runner.push_outbox()
    assert env.portal.types("a1") == [(1, "accepted"), (2, "started"), (3, "progress")]


def test_frames_become_absolute_progress_and_completion(env):
    env.clock["now"] = NIGHT
    plan = [{"filter": "L", "exposure": 300, "count": 3}, {"filter": "H", "exposure": 600, "count": 1}]
    env.portal.jobs = [portal_job(status="queued", plan=plan, progress={"L": 1}, lastSeq=3)]
    env.portal.last_seq["a1"] = 3
    env.step()
    env.frame("a1", "L")
    env.frame("a1", "H")
    env.step(minutes=1)
    sent = [u for u in env.portal.received if u["jobId"] == "a1"]
    assert [u["type"] for u in sent] == ["started", "progress"]
    assert sent[1]["payload"]["progress"] == {"L": 2, "H": 1}  # 1 from the portal + 1 new
    assert sent[1]["payload"]["frameTime"] == sent[0]["time"]
    env.frame("a1", "L", age_minutes=0)  # still being written: not yet
    env.step(minutes=0)
    assert [u["type"] for u in env.portal.received if u["jobId"] == "a1"] == ["started", "progress"]
    env.step(minutes=1)  # the frame has settled → L 3 ≥ 3, H 1 ≥ 1
    assert [u["type"] for u in env.portal.received if u["jobId"] == "a1"][-2:] == ["progress", "completed"]
    assert env.runner.state.job("a1")["local_status"] == "completed"


def test_frames_are_counted_once(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    env.frame("a1", "L")
    env.step(minutes=1)
    env.step(minutes=1)
    progress = [u for u in env.portal.received if u["type"] == "progress"]
    assert len(progress) == 1 and progress[0]["payload"]["progress"] == {"L": 1}


def test_frames_already_on_the_site_are_not_counted_again(env):
    # A lost database: the portal has 2 L frames up to 20:55; two of them are still on the SSD
    env.clock["now"] = NIGHT
    env.frame("a1", "L", age_minutes=10)
    env.frame("a1", "L", age_minutes=6)
    plan = [{"filter": "L", "exposure": 300, "count": 5}]
    env.portal.jobs = [portal_job(status="running", plan=plan, progress={"L": 2}, lastFrameAt="2026-12-10T20:55:00Z", lastSeq=4)]
    env.portal.last_seq["a1"] = 4
    env.step(minutes=0)
    assert env.runner.progress_of(env.runner.state.job("a1")) == {"L": 2}
    env.frame("a1", "L")  # a new one
    env.step(minutes=1)
    assert [u for u in env.portal.received if u["type"] == "progress"][-1]["payload"]["progress"] == {"L": 3}


def test_a_malformed_job_on_the_site_is_kept_untouched(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    env.portal.jobs = [{**portal_job(status="queued"), "plan": "broken"}]
    env.step(minutes=1)
    assert env.runner.state.job("a1") is not None


def test_a_replan_keeps_the_files_of_the_loaded_schedule(env):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued"), portal_job("b2", status="queued", targetName="M 33")]
    env.clock["now"] = EVENING
    env.step()
    (loaded,) = env.ekos.loaded
    loaded_dir = Path(str(env.ekos.host_dir) + loaded[len("/config/agent") :]).parent
    # Ekos starts shooting; b2 is cancelled on the site → replan while busy
    env.ekos.status = 2
    env.portal.jobs = [portal_job(status="queued"), portal_job("b2", status="queued", targetName="M 33", cancelRequested=True, version=2)]
    env.step(minutes=15)
    assert len(env.portal.plans) == 2 and env.portal.plans[-1][1]["ekos"]["reason"]["code"] == "scheduler-busy"
    # Every sequence the loaded schedule refers to is still there
    for job in env.ekos.jobs:
        assert Path(str(env.ekos.host_dir) + job["sequence"][len("file:///config/agent") :]).is_file()
    assert loaded_dir.is_dir()


def test_a_busy_scheduler_is_tried_again_later(env):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued")]
    env.ekos.status = 2
    env.clock["now"] = EVENING
    env.step()
    assert env.ekos.loaded == []
    env.ekos.status = 0  # nothing else changed
    env.step(minutes=15)
    assert len(env.ekos.loaded) == 1
    assert env.portal.plans[-1][1]["ekos"]["loaded"] is True
    # The older plan folders of the night are gone after the load
    night_dir = Path(env.config.jobs.ekos_dir) / "2026-12-10"
    assert len([p for p in night_dir.iterdir() if p.is_dir()]) == 1


def test_frames_of_an_unknown_job_are_recorded_but_not_reported(env):
    env.portal.jobs = []
    env.step()
    path = env.frame("zz9", "L")
    env.step(minutes=1)
    assert env.runner.state.has_frame(str(path))
    assert env.portal.received == []


def test_ekos_running_our_job_starts_it_and_idle_ends_the_night(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    env.ekos.status = 2
    env.ekos.current = {"name": "M 31", "sequence": "file:///config/agent/2026-12-10/job-a1-nb.esq"}
    env.step(minutes=1)
    assert env.portal.types("a1")[-1][1] == "started"
    env.ekos.status = 0
    env.ekos.current = None
    env.step(minutes=1)
    last = env.portal.received[-1]
    assert last["type"] == "night_ended" and last["payload"] == {"reason": "scheduler-stopped"}
    assert env.runner.state.job("a1")["local_status"] == "queued"


def test_a_late_counted_last_frame_does_not_start_an_ended_night_again(env):
    # Ekos idles right after the last frame, which is counted only on the next scan (it settles)
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    env.ekos.status = 2
    env.ekos.current = {"name": "M 31", "sequence": "file:///config/agent/2026-12-10/job-a1-nb.esq"}
    env.step(minutes=1)
    env.ekos.status = 0
    env.ekos.current = None
    env.step(minutes=1)
    assert env.runner.state.job("a1")["local_status"] == "queued"
    env.frame("a1", "L", age_minutes=2)  # shot before the night was ended
    env.step(minutes=1)
    assert [t for _, t in env.portal.types("a1")][-2:] == ["night_ended", "progress"]
    assert env.runner.state.job("a1")["local_status"] == "queued"


def test_a_job_with_a_bad_last_seq_is_skipped_not_the_whole_pull(env):
    env.portal.jobs = [portal_job(status="queued", lastSeq="x"), portal_job(id="b2", status="queued")]
    env.step()
    assert env.runner.synced
    assert env.runner.state.job("a1") is None
    assert env.runner.state.job("b2") is not None


def test_daylight_ends_the_night(env):
    env.portal.jobs = [portal_job(status="running")]
    env.clock["now"] = datetime(2026, 12, 11, 7, 30, tzinfo=UTC)  # sunrise ≈ 07:10 at 50°N 10°E
    env.runner.ekos = None
    env.step()
    assert env.portal.received[-1]["type"] == "night_ended"
    assert env.portal.received[-1]["payload"] == {"reason": "day"}


def test_a_job_left_running_by_a_power_cut_is_requeued_days_later(env):
    """The PC went off mid-night and came back three days later, in the afternoon."""
    env.portal.jobs = [portal_job(status="running")]
    env.clock["now"] = datetime(2026, 12, 14, 13, 0, tzinfo=UTC)
    env.step()
    assert [t for _, t in env.portal.types("a1")] == ["night_ended"]
    assert env.runner.state.job("a1")["local_status"] == "queued"


def test_nothing_ends_while_it_is_dark(env):
    env.portal.jobs = [portal_job(status="running")]
    env.clock["now"] = datetime(2026, 12, 10, 22, 0, tzinfo=UTC)
    env.runner.ekos = None
    env.step()
    assert env.portal.types("a1") == []


def test_nothing_ends_while_ekos_is_shooting_at_dawn(env):
    env.portal.jobs = [portal_job(status="running")]
    env.clock["now"] = datetime(2026, 12, 11, 7, 30, tzinfo=UTC)
    env.ekos.status = 2
    env.step()
    assert env.portal.types("a1") == []


def test_cancel_confirmed_when_the_job_is_not_in_ekos(env):
    env.portal.jobs = [portal_job(status="queued", cancelRequested=True)]
    env.step()
    env.step(minutes=1)
    assert env.portal.types("a1")[-1][1] == "cancelled"
    assert env.runner.state.job("a1")["local_status"] == "cancelled"


def test_cancel_waits_while_the_job_is_in_a_running_schedule(env):
    env.portal.jobs = [portal_job(status="running", cancelRequested=True)]
    env.ekos.status = 2
    env.ekos.jobs = [{"name": "M 31", "sequence": "file:///config/agent/2026-12-10/job-a1-bb.esq"}]
    env.ekos.current = env.ekos.jobs[0]
    env.step()
    env.step(minutes=1)
    assert "cancelled" not in [t for _, t in env.portal.types("a1")]
    # The night ends: the job is still in Ekos' (idle) list — Start would shoot it: still waiting
    env.ekos.status = 0
    env.ekos.current = None
    env.step(minutes=1)
    assert [t for _, t in env.portal.types("a1")][-1] == "night_ended"
    # A person clears (or reloads) the Scheduler: now nothing can run it
    env.ekos.jobs = []
    env.step(minutes=1)
    assert env.portal.types("a1")[-1][1] == "cancelled"


def test_with_loading_on_a_cancel_waits_for_the_reload(env):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued", cancelRequested=True)]
    env.ekos.jobs = [{"name": "M 31", "sequence": "file:///config/agent/2026-12-10/job-a1-bb.esq"}]
    env.step()
    env.step(minutes=1)
    assert "cancelled" not in [t for _, t in env.portal.types("a1")]
    # Plan window: the new schedule leaves the job out; the next check confirms the cancel
    env.clock["now"] = EVENING
    env.step(minutes=1)
    assert env.ekos.loaded and env.ekos.jobs == []
    env.step(minutes=1)
    assert env.portal.types("a1")[-1][1] == "cancelled"


def test_an_approved_job_cancelled_before_its_acceptance(env):
    # The site asks the agent to confirm: it may have the job in a schedule already
    env.portal.jobs = [portal_job(status="approved", cancelRequested=True)]
    env.step()
    env.step(minutes=1)
    assert [t for _, t in env.portal.types("a1")] == ["accepted", "cancelled"]


def test_a_cancel_waits_while_ekos_is_unreadable(env, monkeypatch):
    env.portal.jobs = [portal_job(status="queued", cancelRequested=True)]

    def unreadable():
        raise jobs_mod.ekos_mod.EkosError("busctl failed")

    monkeypatch.setattr(env.ekos, "info", unreadable)
    env.step()
    env.step(minutes=1)
    assert "cancelled" not in [t for _, t in env.portal.types("a1")]
    # Unreadable for a quarter of an hour: KStars/Ekos is down, nothing can shoot the job
    env.step(minutes=16)
    assert env.portal.types("a1")[-1][1] == "cancelled"


def test_a_job_with_nothing_left_to_shoot_is_completed_without_a_new_frame(env):
    # The plan was cut on the site below what is already shot: no frame will come to complete it
    plan = [{"filter": "L", "exposure": 300, "count": 3}]
    env.portal.jobs = [portal_job(status="queued", plan=plan, progress={"L": 2}, lastSeq=3)]
    env.portal.last_seq["a1"] = 3
    env.step()
    assert env.portal.types("a1") == []
    env.portal.jobs[0].update(version=2, plan=[{"filter": "L", "exposure": 300, "count": 2}])
    env.step()
    assert env.portal.types("a1") == [(4, "completed")]
    assert env.runner.state.job("a1")["local_status"] == "completed"
    env.portal.jobs = []  # final on the site now
    env.step()
    assert env.portal.types("a1") == [(4, "completed")]
    assert env.runner.state.job("a1") is None


def test_a_job_gone_from_the_site_is_forgotten(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    env.portal.jobs = []
    env.step()
    assert env.runner.state.job("a1") is None


def test_plan_only_inside_the_window(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.step()
    assert env.portal.plans == []
    env.clock["now"] = EVENING
    env.step()
    night, plan = env.portal.plans[-1]
    assert night == "2026-12-10"
    assert [g["key"] for g in plan["ekosJobs"]] == ["job-a1-bb", "job-a1-nb"]
    assert plan["ekos"] == {"loaded": False, "reason": {"code": "load-off"}}
    assert env.ekos.loaded == []
    night_dir = Path(env.config.jobs.ekos_dir) / "2026-12-10"
    (plan_dir,) = [p for p in night_dir.iterdir() if p.is_dir()]
    assert sorted(p.name for p in plan_dir.iterdir()) == ["job-a1-bb.esq", "job-a1-nb.esq", "tonight.esl"]
    # The copy for loading by hand points at the plan's own folder
    assert (night_dir / "tonight.esl").read_text() == (plan_dir / "tonight.esl").read_text()
    assert f"/config/agent/2026-12-10/{plan_dir.name}/job-a1-bb.esq" in (night_dir / "tonight.esl").read_text()
    esq = (plan_dir / "job-a1-bb.esq").read_text()
    assert f"<FITSDirectory>{env.frames_dir}/jobs/a1</FITSDirectory>" in esq


def test_plan_is_not_rebuilt_without_a_change(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.clock["now"] = EVENING
    env.step()
    env.step(minutes=15)
    assert len(env.portal.plans) == 1


def test_loading_into_an_idle_empty_scheduler(env):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued")]
    env.clock["now"] = EVENING
    env.step()
    (loaded,) = env.ekos.loaded
    assert loaded.startswith("/config/agent/2026-12-10/") and loaded.endswith("/tonight.esl")
    assert env.portal.plans[-1][1]["ekos"] == {"loaded": True, "jobs": 2, "started": False}
    assert env.ekos.status == 0  # never started


@pytest.mark.parametrize(
    "status, jobs, reason",
    [
        (2, [], {"code": "scheduler-busy", "state": 2}),
        (0, [{"name": "NGC 7000", "sequence": "file:///config/Desktop/Ha.esq"}], {"code": "foreign-jobs", "names": ["NGC 7000"]}),
    ],
)
def test_no_load_into_a_busy_or_foreign_scheduler(env, status, jobs, reason):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued")]
    env.ekos.status, env.ekos.jobs = status, jobs
    env.clock["now"] = EVENING
    env.step()
    assert env.ekos.loaded == []
    assert env.portal.plans[-1][1]["ekos"]["reason"] == reason


def test_no_load_without_the_filter_wheel(env, monkeypatch):
    env.config.jobs.load_into_ekos = True
    env.portal.jobs = [portal_job(status="queued")]
    env.clock["now"] = EVENING
    env.clock["mono"] += 600
    env.runner.step({"indi": {"online": True}}, env.clock["mono"])
    assert env.ekos.loaded == []
    plan = env.portal.plans[-1][1]
    assert plan["ekos"]["reason"] == {"code": "wheel-unknown"}
    assert {"code": "no-filter-wheel"} in plan["warnings"]


def test_warnings_for_missing_focuser(env):
    env.portal.jobs = [portal_job(status="queued")]
    env.clock["now"] = EVENING
    env.clock["mono"] += 600
    env.runner.step({**SNAPSHOT, "focuser": None}, env.clock["mono"])
    assert {"code": "no-focuser"} in env.portal.plans[-1][1]["warnings"]
    # The Focus step stays in the jobs (the focuser is being repaired, not dropped)
    esl = (Path(env.config.jobs.ekos_dir) / "2026-12-10" / "tonight.esl").read_text()
    assert "<Step>Focus</Step>" in esl


def test_patrol_frames_become_visits(env):
    env.portal.settings["patrol"] = {"enabled": True}
    env.portal.jobs = []
    env.step()
    for _ in range(3):
        env.frame("7", "L", kind="patrol")
    env.step(minutes=1)
    # Reported while it goes on: the night's first visit makes the patrol job on the site
    assert len(env.portal.visits) == 1
    first = env.portal.visits[0]
    assert first["target"] == 7 and first["frames"] == 3 and first["lastFrame"] >= first["time"]

    env.step(minutes=1)
    assert len(env.portal.visits) == 1  # nothing new: not sent again

    env.frame("7", "L", kind="patrol")
    env.step(minutes=1)
    assert len(env.portal.visits) == 2
    assert env.portal.visits[1]["time"] == first["time"] and env.portal.visits[1]["frames"] == 4

    env.step(minutes=25)  # over: reported once more as such, then never again
    assert len(env.portal.visits) == 3 and env.portal.visits[2]["frames"] == 4
    env.step(minutes=10)
    assert len(env.portal.visits) == 3


def test_patrol_visits_wait_while_the_portal_is_down(env):
    env.portal.settings["patrol"] = {"enabled": True}
    env.portal.jobs = []
    env.step()
    sent = []

    def down(visits):
        raise PortalError("down")

    env.portal.post_visits = down
    env.frame("7", "L", kind="patrol")
    env.step(minutes=1)

    env.portal.post_visits = lambda visits: sent.extend(visits) or {}
    env.step(minutes=6)
    assert [(v["target"], v["frames"]) for v in sent] == [(7, 1)]
