"""Agent configuration (TOML). See config.example.toml for every key."""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

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


@dataclass
class Config:
    portal_url: str
    token: str
    push_interval: float = 60.0
    extra_push_min_gap: float = 60.0
    indi_host: str = "localhost"
    indi_port: int = 7624
    indiweb_url: str = "http://localhost:8624"
    ekos_enabled: bool = True
    ekos_container: str = "kstars-desktop"
    ekos_user: str = "abc"
    ekos_interval: float = 30.0
    frames_dir: str = "/home/mik/fits"
    roles: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_ROLES))


def load(path: str | Path) -> Config:
    with open(path, "rb") as file:
        data = tomllib.load(file)

    portal = data.get("portal", {})
    indi = data.get("indi", {})
    ekos = data.get("ekos", {})
    frames = data.get("frames", {})

    token = os.environ.get("OBSERVATORY_AGENT_TOKEN", "")
    token_file = portal.get("token_file")
    if not token and token_file:
        token = Path(token_file).read_text().strip()
    if len(token) < 32:
        raise ValueError("agent token missing or shorter than 32 characters (portal.token_file or OBSERVATORY_AGENT_TOKEN)")
    if not portal.get("url"):
        raise ValueError("portal.url is required")

    return Config(
        portal_url=portal["url"],
        token=token,
        push_interval=float(portal.get("push_interval", 60)),
        extra_push_min_gap=float(portal.get("extra_push_min_gap", 60)),
        indi_host=indi.get("host", "localhost"),
        indi_port=int(indi.get("port", 7624)),
        indiweb_url=indi.get("indiweb_url", "http://localhost:8624"),
        ekos_enabled=bool(ekos.get("enabled", True)),
        ekos_container=ekos.get("container", "kstars-desktop"),
        ekos_user=ekos.get("user", "abc"),
        ekos_interval=float(ekos.get("interval", 30)),
        frames_dir=frames.get("dir", "/home/mik/fits"),
        roles={**DEFAULT_ROLES, **data.get("devices", {})},
    )
