"""The agent never starts/stops the Scheduler or moves anything: the only DBus write is
`loadScheduler`, and only into an idle Scheduler holding nothing but the agent's own jobs."""

import re
from pathlib import Path

import pytest

from observatory_agent import ekos
from observatory_agent.ekos import EkosClient, EkosError, SchedulerInfo, job_key_of, may_load

PACKAGE = Path(__file__).resolve().parent.parent / "observatory_agent"
AGENT_DIR = "/config/agent"


def test_only_load_scheduler_is_allowed():
    assert ekos.ALLOWED_METHODS == frozenset({"loadScheduler"})


@pytest.mark.parametrize("method", ["start", "stop", "removeAllJobs", "resetAllJobs", "setSequence", "startSlew", "execute", "disconnectINDI"])
def test_any_other_method_is_refused_before_anything_runs(method, monkeypatch):
    client = EkosClient("kstars-desktop", "abc")
    monkeypatch.setattr(client, "_busctl", lambda args: pytest.fail("busctl must not run"))
    with pytest.raises(EkosError):
        client._call(method, "")


def test_the_code_calls_no_other_dbus_method():
    """Every `_call(...)` in the package names an allowed method, and only ekos.py / host.py talk to DBus."""
    for path in PACKAGE.glob("*.py"):
        text = path.read_text()
        for method in re.findall(r"_call\(\s*\"(\w+)\"", text):
            assert method in ekos.ALLOWED_METHODS, f"{path.name} calls {method}"
        if path.name not in ("ekos.py", "host.py"):
            assert "busctl" not in text and "dbus-send" not in text, f"{path.name} talks to DBus"
    host = (PACKAGE / "host.py").read_text()
    # host.py only reads the Scheduler properties
    assert re.findall(r"org\.freedesktop\.DBus\.Properties\.(\w+)", host) == ["GetAll"]


def test_nothing_is_ever_written_to_indi():
    """The INDI client only asks for properties; no `new*Vector` (a command) is built anywhere,
    and nothing talks to the power relay."""
    writes = [line for line in (PACKAGE / "indi.py").read_text().splitlines() if "writer.write(" in line]
    assert writes == ["            writer.write(b'<getProperties version=\"1.7\"/>\\n')"]
    command = re.compile(r"<new(Switch|Number|Text|BLOB)Vector|enableBLOB")
    for path in PACKAGE.glob("*.py"):
        for line in path.read_text().splitlines():
            assert not command.search(line) or "never" in line.lower(), f"{path.name}: {line.strip()}"
    # HTTP goes only to the portal (portal.py) and the local indiweb status (host.py): no relay
    for path in PACKAGE.glob("*.py"):
        if path.name not in ("portal.py", "host.py"):
            assert "urllib" not in path.read_text() and "http.client" not in path.read_text(), path.name


def info(status=0, jobs=None, current=None):
    return SchedulerInfo(status, jobs or [], current)


def test_may_load_only_an_idle_scheduler():
    assert may_load(info(0), AGENT_DIR) == (True, None)
    assert may_load(info(5), AGENT_DIR)[0]  # aborted: nothing runs
    for busy in (1, 2, 3, 4, 6):
        allowed, why = may_load(info(busy), AGENT_DIR)
        assert not allowed and why == {"code": "scheduler-busy", "state": busy}


def test_may_load_never_replaces_a_schedule_a_person_built():
    ours = {"name": "M 51", "sequence": "file:///config/agent/2026-12-10/job-a1-bb.esq"}
    theirs = {"name": "NGC 7000", "sequence": "file:///config/Desktop/Sequence/Ha.esq"}
    assert may_load(info(0, [ours]), AGENT_DIR)[0]
    allowed, why = may_load(info(0, [ours, theirs]), AGENT_DIR)
    assert not allowed and why == {"code": "foreign-jobs", "names": ["NGC 7000"]}
    # A folder that only starts like ours is not ours
    assert not may_load(info(0, [{"name": "x", "sequence": "/config/agent-old/a.esq"}]), AGENT_DIR)[0]


def test_job_key_of():
    assert job_key_of({"sequence": "file:///config/agent/2026-12-10/job-a1b2-nb.esq"}, AGENT_DIR) == "job-a1b2-nb"
    assert job_key_of({"sequence": "/config/agent/2026-12-10/patrol-7.esq"}, AGENT_DIR) == "patrol-7"
    assert job_key_of({"sequence": "/config/Desktop/x.esq"}, AGENT_DIR) is None
    assert job_key_of(None, AGENT_DIR) is None


def test_info_parses_busctl_json(monkeypatch):
    client = EkosClient("kstars-desktop", "abc")
    out = (
        '{"type":"i","data":2}\n'
        '{"type":"s","data":"[{\\"name\\": \\"M 51\\", \\"sequence\\": \\"file:///config/agent/n/job-a-bb.esq\\"}]\\n"}\n'
        '{"type":"s","data":"{\\"name\\": \\"M 51\\"}"}\n'
    )
    monkeypatch.setattr(client, "_busctl", lambda args: out)
    result = client.info()
    assert result.status == 2
    assert result.jobs[0]["name"] == "M 51"
    assert result.current == {"name": "M 51"}


def test_info_with_no_jobs(monkeypatch):
    client = EkosClient("kstars-desktop", "abc")
    monkeypatch.setattr(client, "_busctl", lambda args: '{"type":"i","data":0}\n{"type":"s","data":"[\\n]\\n"}\n{"type":"s","data":""}\n')
    result = client.info()
    assert (result.status, result.jobs, result.current) == (0, [], None)


def test_load_schedule_quotes_the_path(monkeypatch):
    client = EkosClient("kstars-desktop", "abc")
    seen = []

    def busctl(args):
        seen.append(args)
        return '{"type":"b","data":[true]}'

    monkeypatch.setattr(client, "_busctl", busctl)
    assert client.load_schedule("/config/agent/2026-12-10/tonight.esl") is True
    assert seen == ["--timeout=20 call org.kde.kstars /KStars/Ekos/Scheduler org.kde.kstars.Ekos.Scheduler loadScheduler s /config/agent/2026-12-10/tonight.esl"]
