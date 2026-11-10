"""Agent configuration (TOML). See config.example.toml for every key."""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_ROLES = {
    "mount": "EQMod Mount",
    "camera": "ZWO CCD ASI6200MM Pro",
    "guider": "QHY CCD QHY5II-M",
    "filter": "ZWO EFW",
    "focuser": "ZWO EAF",
    "roof": "Roll Roof",
    "weather": "Weather Watcher",
    "watchdog": "WatchDog",
}


DEFAULT_STEPS = ["Track", "Focus", "Align", "Guide"]


@dataclass
class JobsConfig:
    """Telescope jobs from the site (FEAT-30 phase 2). Off unless `[jobs] enabled = true`."""

    enabled: bool = False
    # Load tonight's schedule into the Ekos Scheduler (never starts it). Off: the agent only builds
    # the plan, writes the files and shows the plan on the site
    load_into_ekos: bool = False
    state_db: str = "/var/lib/observatory-agent/state.db"
    # Where the agent writes .esq/.esl: on the host, and the same folder inside the KStars container
    ekos_dir: str = "/home/mik/kstars-desktop/config/agent"
    ekos_dir_container: str = "/config/agent"
    ekos_profile: str = "AstroLab"
    optical_train: str = "Primary"
    steps: list[str] = field(default_factory=lambda: list(DEFAULT_STEPS))
    sync_interval: float = 300.0
    frames_interval: float = 30.0
    # The plan for the night is built this many hours before nautical dusk
    plan_hours_before_dusk: float = 2.0


@dataclass
class SiteConfig:
    """The observatory's position — only in the host's config, never in the repository."""

    latitude: float | None = None
    longitude: float | None = None  # east-positive
    timezone: str = "UTC"


@dataclass
class CameraConfig:
    """What every generated sequence uses (fixed by the observatory, not by a job)."""

    width: int = 9576
    height: int = 6388
    gain: int = 150
    offset: int = 50
    temperature: float | None = -10.0
    format: str = ""  # CCD_CAPTURE_FORMAT label; empty = the camera's current format
    binning: int = 1


@dataclass
class Config:
    portal_url: str
    token: str
    push_interval: float = 60.0
    min_push_gap: float = 60.0
    indi_host: str = "localhost"
    indi_port: int = 7624
    indiweb_url: str = "http://localhost:8624"
    ekos_enabled: bool = True
    ekos_container: str = "kstars-desktop"
    ekos_user: str = "abc"
    ekos_interval: float = 30.0
    frames_dir: str = "/home/mik/fits"
    roles: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_ROLES))
    # The main telescope, mm: used when INDI reports none (the camera driver gets it from the Ekos
    # optical train only while Ekos is connected)
    focal_length: float | None = None
    aperture: float | None = None
    jobs: JobsConfig = field(default_factory=JobsConfig)
    site: SiteConfig = field(default_factory=SiteConfig)
    camera: CameraConfig = field(default_factory=CameraConfig)


def _flag(data: dict, key: str, default: bool, section: str) -> bool:
    """A TOML boolean, strictly: a quoted "false" must not switch a safety option on."""
    value = data.get(key, default)
    if not isinstance(value, bool):
        raise ValueError(f"{section}.{key} must be true or false (unquoted), not {value!r}")
    return value


def _jobs(data: dict) -> JobsConfig:
    defaults = JobsConfig()
    steps = data.get("steps", defaults.steps)
    allowed = set(DEFAULT_STEPS)
    if not isinstance(steps, list) or any(step not in allowed for step in steps):
        raise ValueError(f"jobs.steps must be a list of {sorted(allowed)}")
    return JobsConfig(
        enabled=_flag(data, "enabled", defaults.enabled, "jobs"),
        load_into_ekos=_flag(data, "load_into_ekos", defaults.load_into_ekos, "jobs"),
        state_db=str(data.get("state_db", defaults.state_db)),
        ekos_dir=str(data.get("ekos_dir", defaults.ekos_dir)),
        ekos_dir_container=str(data.get("ekos_dir_container", defaults.ekos_dir_container)),
        ekos_profile=str(data.get("ekos_profile", defaults.ekos_profile)),
        optical_train=str(data.get("optical_train", defaults.optical_train)),
        steps=list(steps),
        sync_interval=float(data.get("sync_interval", defaults.sync_interval)),
        frames_interval=float(data.get("frames_interval", defaults.frames_interval)),
        plan_hours_before_dusk=float(data.get("plan_hours_before_dusk", defaults.plan_hours_before_dusk)),
    )


def _site(data: dict) -> SiteConfig:
    lat, lon = data.get("latitude"), data.get("longitude")
    # 0.0 / 0.0 is the placeholder of config.example.toml, never a real site: treat it as unset
    if lat is not None and lon is not None and float(lat) == 0 and float(lon) == 0:
        lat = lon = None
    zone = str(data.get("timezone", "UTC"))
    try:
        ZoneInfo(zone)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise ValueError(f"site.timezone {zone!r} is not a known time zone") from error
    return SiteConfig(
        latitude=float(lat) if lat is not None else None,
        longitude=float(lon) if lon is not None else None,
        timezone=zone,
    )


def _camera(data: dict) -> CameraConfig:
    defaults = CameraConfig()
    temperature = data.get("temperature", defaults.temperature)
    return CameraConfig(
        width=int(data.get("width", defaults.width)),
        height=int(data.get("height", defaults.height)),
        gain=int(data.get("gain", defaults.gain)),
        offset=int(data.get("offset", defaults.offset)),
        temperature=float(temperature) if temperature is not None else None,
        format=str(data.get("format", defaults.format)),
        binning=int(data.get("binning", defaults.binning)),
    )


def load(path: str | Path) -> Config:
    with open(path, "rb") as file:
        data = tomllib.load(file)

    portal = data.get("portal", {})
    indi = data.get("indi", {})
    ekos = data.get("ekos", {})
    frames = data.get("frames", {})
    optics = data.get("optics", {})

    token = os.environ.get("OBSERVATORY_AGENT_TOKEN", "")
    token_file = portal.get("token_file")
    if not token and token_file:
        token = Path(token_file).read_text().strip()
    if len(token) < 32:
        raise ValueError("agent token missing or shorter than 32 characters (portal.token_file or OBSERVATORY_AGENT_TOKEN)")
    if not portal.get("url"):
        raise ValueError("portal.url is required")

    jobs = _jobs(data.get("jobs", {}))
    site = _site(data.get("site", {}))
    if jobs.enabled and (site.latitude is None or site.longitude is None):
        raise ValueError("jobs.enabled needs [site] latitude and longitude")

    return Config(
        portal_url=portal["url"],
        token=token,
        push_interval=float(portal.get("push_interval", 60)),
        # `extra_push_min_gap` is the name before 0.2.0: still read, so an old config keeps its value
        min_push_gap=float(portal.get("min_push_gap", portal.get("extra_push_min_gap", 60))),
        indi_host=indi.get("host", "localhost"),
        indi_port=int(indi.get("port", 7624)),
        indiweb_url=indi.get("indiweb_url", "http://localhost:8624"),
        ekos_enabled=_flag(ekos, "enabled", True, "ekos"),
        ekos_container=ekos.get("container", "kstars-desktop"),
        ekos_user=ekos.get("user", "abc"),
        ekos_interval=float(ekos.get("interval", 30)),
        frames_dir=frames.get("dir", "/home/mik/fits"),
        roles={**DEFAULT_ROLES, **data.get("devices", {})},
        focal_length=float(optics["focal_length"]) if optics.get("focal_length") else None,
        aperture=float(optics["aperture"]) if optics.get("aperture") else None,
        jobs=jobs,
        site=site,
        camera=_camera(data.get("camera", {})),
    )
