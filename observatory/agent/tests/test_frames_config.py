"""Frame paths → job/filter, and the jobs part of the config."""

import pytest

from observatory_agent.config import load
from observatory_agent.frames import parse

ROOT = "/home/mik/fits"


@pytest.mark.parametrize(
    "path, expected",
    [
        (f"{ROOT}/jobs/a1b2/M_51/Light/L/M_51_Light_L_300_secs_2026-12-10T20-00-00.fits", ("job", "a1b2", "L")),
        (f"{ROOT}/jobs/a1b2/M_51/Light/H/x.fit", ("job", "a1b2", "H")),
        (f"{ROOT}/patrol/17/NGC_2903/Light/L/x.fits", ("patrol", "17", "L")),
        (f"{ROOT}/jobs/a1b2/M_51/Dark/L/x.fits", None),  # only Light frames
        (f"{ROOT}/jobs/a1b2/M_51/Light/L/x.jpg", None),
        (f"{ROOT}/patrol/abc/X/Light/L/x.fits", None),  # patrol ids are numbers
        (f"{ROOT}/M_51/Light/L/x.fits", None),  # a frame of a manual session
        ("/elsewhere/jobs/a1/M/Light/L/x.fits", None),
    ],
)
def test_parse(path, expected):
    assert parse(ROOT, path) == expected


def write(tmp_path, text):
    path = tmp_path / "config.toml"
    path.write_text('[portal]\nurl = "https://api.example.com"\n' + text)
    return path


def test_jobs_are_off_by_default(tmp_path, monkeypatch):
    monkeypatch.setenv("OBSERVATORY_AGENT_TOKEN", "t" * 32)
    config = load(write(tmp_path, ""))
    assert config.jobs.enabled is False and config.jobs.load_into_ekos is False
    assert config.jobs.steps == ["Track", "Focus", "Align", "Guide"]


def test_jobs_need_the_site(tmp_path, monkeypatch):
    monkeypatch.setenv("OBSERVATORY_AGENT_TOKEN", "t" * 32)
    with pytest.raises(ValueError, match="site"):
        load(write(tmp_path, "[jobs]\nenabled = true\n"))
    # 0.0 / 0.0 is the example's placeholder, not a site
    with pytest.raises(ValueError, match="site"):
        load(write(tmp_path, '[jobs]\nenabled = true\n[site]\nlatitude = 0.0\nlongitude = 0.0\n'))
    config = load(write(tmp_path, '[jobs]\nenabled = true\n[site]\nlatitude = 45.0\nlongitude = 10.0\ntimezone = "Europe/Rome"\n'))
    assert config.jobs.enabled and config.site.latitude == 45.0


def test_switches_must_be_real_booleans(tmp_path, monkeypatch):
    monkeypatch.setenv("OBSERVATORY_AGENT_TOKEN", "t" * 32)
    for text in ('[jobs]\nload_into_ekos = "false"\n', '[jobs]\nenabled = "no"\n', '[ekos]\nenabled = 0\n'):
        with pytest.raises(ValueError, match="true or false"):
            load(write(tmp_path, text))


def test_unknown_time_zone_is_refused(tmp_path, monkeypatch):
    monkeypatch.setenv("OBSERVATORY_AGENT_TOKEN", "t" * 32)
    with pytest.raises(ValueError, match="time zone"):
        load(write(tmp_path, '[site]\ntimezone = "Asia/Orenbrug"\n'))


def test_unknown_steps_are_refused(tmp_path, monkeypatch):
    monkeypatch.setenv("OBSERVATORY_AGENT_TOKEN", "t" * 32)
    with pytest.raises(ValueError, match="steps"):
        load(write(tmp_path, '[jobs]\nsteps = ["Track", "Park"]\n'))
