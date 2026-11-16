"""Builds the status snapshot the portal shows, and the events between two snapshots.

The snapshot shape is the contract with the portal API (`POST /observatory/agent/status`,
see features/observatory-agent.md §3). Every section is optional: when INDI is down only
`time` and `indi` are sent.
"""

from __future__ import annotations

from datetime import datetime, timezone

TRACK_MODES = {"TRACK_SIDEREAL": "sidereal", "TRACK_SOLAR": "solar", "TRACK_LUNAR": "lunar", "TRACK_CUSTOM": "custom"}
FRAME_TYPES = {"FRAME_LIGHT": "light", "FRAME_BIAS": "bias", "FRAME_DARK": "dark", "FRAME_FLAT": "flat"}
from typing import Any

from .astro import date_to_j2000, field_of_view
from .indi import Property, PropertyTree

# Weather Watcher element → snapshot key
WEATHER_PARAMETERS = {
    "WEATHER_RAIN_HOUR": "rain",
    "WEATHER_TEMPERATURE": "temperature",
    "WEATHER_WIND_SPEED": "wind",
    "WEATHER_WIND_GUST": "gust",
    "WEATHER_CLOUDS": "clouds",
    "WEATHER_HUMIDITY": "humidity",
    "WEATHER_PRESSURE": "pressure",
    "WEATHER_FORECAST": "forecast",
}

# At most this many alerting properties are listed per device
MAX_ALERTS = 5

LIGHT_STATES = {"Ok": "ok", "Busy": "warning", "Alert": "alert"}
LIGHT_ORDER = ["unknown", "ok", "warning", "alert"]


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _round(value: float | None, digits: int) -> float | None:
    return None if value is None else round(value, digits)


class SnapshotBuilder:
    """Turns the INDI property tree (+ Ekos and host facts) into the portal snapshot."""

    def __init__(self, roles: dict[str, str], optics: tuple[float | None, float | None] = (None, None)) -> None:
        # role → INDI device name, e.g. {"mount": "EQMod Mount", "roof": "Roll Roof"}
        self.roles = roles
        # (focal length, aperture) of the main telescope from the agent's config, for when INDI
        # reports none
        self.optics = optics
        self._role_of = {device: role for role, device in roles.items()}

    def build(
        self,
        tree: PropertyTree,
        indi_online: bool,
        profile: str | None = None,
        scheduler: dict | None = None,
        disk_free_gb: float | None = None,
        agent_version: str = "",
    ) -> dict[str, Any]:
        snapshot: dict[str, Any] = {
            "time": utc_now(),
            "agent": {"version": agent_version},
            "indi": {"online": indi_online, "profile": profile},
        }
        if disk_free_gb is not None:
            snapshot["disk"] = {"freeGb": round(disk_free_gb, 1)}
        if scheduler is not None:
            snapshot["scheduler"] = scheduler
        if not indi_online:
            return snapshot

        snapshot["devices"] = [
            {
                "name": device,
                "role": self._role_of.get(device, "other"),
                "connected": self._connected(tree, device),
                "driver": self._driver(tree, device),
                "alerts": self._alerts(tree, device),
            }
            for device in tree.devices()
        ]
        snapshot["mount"] = self._mount(tree)
        snapshot["camera"] = self._camera(tree)
        snapshot["guider"] = self._guider(tree)
        snapshot["filter"] = self._filter(tree)
        snapshot["focuser"] = self._focuser(tree)
        snapshot["roof"] = self._roof(tree)
        snapshot["weather"] = self._weather(tree)
        snapshot["watchdog"] = self._watchdog(tree)
        return snapshot

    # --- helpers ---------------------------------------------------------------------------

    def _prop(self, tree: PropertyTree, role: str, name: str) -> Property | None:
        device = self.roles.get(role)
        return tree.get(device, name) if device else None

    def _connected(self, tree: PropertyTree, device: str) -> bool:
        prop = tree.get(device, "CONNECTION")
        return bool(prop and prop.switch("CONNECT"))

    def _role_connected(self, tree: PropertyTree, role: str) -> bool:
        device = self.roles.get(role)
        return bool(device) and self._connected(tree, device)

    @staticmethod
    def _alerts(tree: PropertyTree, device: str) -> list[str]:
        """Labels of the device's properties in Alert — INDI's way of saying something went wrong
        (a failed connection, a cooler or a move that failed, a weather limit crossed)"""
        alerts = sorted(
            (prop.label or prop.name)
            for (dev, _), prop in tree.properties.items()
            if dev == device and prop.state == "Alert"
        )
        return alerts[:MAX_ALERTS]

    @staticmethod
    def _driver(tree: PropertyTree, device: str) -> dict | None:
        info = tree.get(device, "DRIVER_INFO")
        if not info:
            return None
        return {"name": info.text("DRIVER_NAME") or None, "version": info.text("DRIVER_VERSION") or None}

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def _j2000(self, ra_hours: float | None, dec: float | None) -> tuple[float | None, float | None]:
        if ra_hours is None or dec is None:
            return None, None
        ra, de = date_to_j2000(ra_hours * 15, dec, self._now())
        return round(ra, 4), round(de, 4)

    def _exposure(self, tree: PropertyTree, role: str) -> tuple[bool, float | None]:
        exposure = self._prop(tree, role, "CCD_EXPOSURE")
        exposing = bool(exposure and exposure.state == "Busy")
        left = _round(exposure.number("CCD_EXPOSURE_VALUE"), 1) if exposing and exposure else None
        return exposing, left

    def _number(self, tree: PropertyTree, role: str, prop: str, element: str, digits: int = 1) -> float | None:
        p = self._prop(tree, role, prop)
        return _round(p.number(element), digits) if p else None

    # --- sections --------------------------------------------------------------------------

    def _mount(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "mount"):
            return None
        eod = self._prop(tree, "mount", "EQUATORIAL_EOD_COORD")
        target = self._prop(tree, "mount", "TARGET_EOD_COORD")
        park = self._prop(tree, "mount", "TELESCOPE_PARK")
        track = self._prop(tree, "mount", "TELESCOPE_TRACK_STATE")
        track_mode = self._prop(tree, "mount", "TELESCOPE_TRACK_MODE")
        pier = self._prop(tree, "mount", "TELESCOPE_PIER_SIDE")
        ra_hours = eod.number("RA") if eod else None
        dec = eod.number("DEC") if eod else None
        ra_j2000, dec_j2000 = self._j2000(ra_hours, dec)
        # TARGET_EOD_COORD reads 0/0 until the first GOTO since the driver connected: no target
        has_target = bool(target) and (target.number("RA") or target.number("DEC"))
        target_ra, target_dec = self._j2000(target.number("RA"), target.number("DEC")) if has_target else (None, None)
        pier_side = None
        if pier and pier.switch("PIER_EAST"):
            pier_side = "east"
        elif pier and pier.switch("PIER_WEST"):
            pier_side = "west"
        mode = next((TRACK_MODES.get(name) for name in track_mode.on_switches() if name in TRACK_MODES), None) if track_mode else None
        return {
            # Epoch of date (JNow), as the mount reports it; degrees
            "ra": _round(ra_hours * 15 if ra_hours is not None else None, 4),
            "dec": _round(dec, 4),
            # The same position in J2000, for star maps and catalogs
            "raJ2000": ra_j2000,
            "decJ2000": dec_j2000,
            "alt": self._number(tree, "mount", "HORIZONTAL_COORD", "ALT", 2),
            "az": self._number(tree, "mount", "HORIZONTAL_COORD", "AZ", 2),
            "parked": bool(park and park.switch("PARK")),
            "tracking": bool(track and track.switch("TRACK_ON")),
            "trackMode": mode,
            "slewing": bool(eod and eod.state == "Busy"),
            "pierSide": pier_side,
            # Local sidereal time, hours
            "lst": self._number(tree, "mount", "TIME_LST", "LST", 4),
            # Last GOTO target, J2000
            "target": {"ra": target_ra, "dec": target_dec} if target_ra is not None else None,
        }

    def _camera(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "camera"):
            return None
        cooler = self._prop(tree, "camera", "CCD_COOLER")
        controls = self._prop(tree, "camera", "CCD_CONTROLS")  # ZWO: Gain, Offset, …
        frame_type = self._prop(tree, "camera", "CCD_FRAME_TYPE")
        info = self._prop(tree, "camera", "CCD_INFO")
        scope = self._prop(tree, "camera", "SCOPE_INFO")
        exposing, left = self._exposure(tree, "camera")
        gain = controls.number("Gain") if controls else None
        offset = controls.number("Offset") if controls else None
        if gain is None:
            gain = self._number(tree, "camera", "CCD_GAIN", "GAIN", 0)
        if offset is None:
            offset = self._number(tree, "camera", "CCD_OFFSET", "OFFSET", 0)
        width = info.number("CCD_MAX_X") if info else None
        height = info.number("CCD_MAX_Y") if info else None
        pixel = info.number("CCD_PIXEL_SIZE") if info else None
        focal = scope.number("FOCAL_LENGTH") if scope else None
        if not focal:
            focal = self._number(tree, "mount", "TELESCOPE_INFO", "TELESCOPE_FOCAL_LENGTH", 1)
        if not focal:
            focal = self.optics[0]
        aperture = self._number(tree, "camera", "SCOPE_INFO", "APERTURE", 0) or self.optics[1]
        fov = field_of_view(width or 0, height or 0, pixel or 0, focal or 0)
        frame = next((FRAME_TYPES.get(name) for name in frame_type.on_switches() if name in FRAME_TYPES), None) if frame_type else None
        return {
            "temperature": self._number(tree, "camera", "CCD_TEMPERATURE", "CCD_TEMPERATURE_VALUE", 1),
            "coolerOn": cooler.switch("COOLER_ON") if cooler else None,
            "coolerPower": self._number(tree, "camera", "CCD_COOLER_POWER", "CCD_COOLER_VALUE", 0),
            "exposing": exposing,
            "exposureLeft": left,
            "frameType": frame,
            "binning": int(self._number(tree, "camera", "CCD_BINNING", "HOR_BIN", 0) or 1),
            "gain": _round(gain, 0),
            "offset": _round(offset, 0),
            "sensor": {"width": int(width), "height": int(height), "pixelSize": round(pixel, 2)} if width and height and pixel else None,
            "focalLength": _round(focal, 0),
            "aperture": _round(aperture, 0),
            # Field of view, degrees
            "fov": {"width": round(fov[0], 3), "height": round(fov[1], 3)} if fov else None,
        }

    def _guider(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "guider"):
            return None
        exposing, left = self._exposure(tree, "guider")
        return {
            "exposing": exposing,
            "exposureLeft": left,
            "binning": int(self._number(tree, "guider", "CCD_BINNING", "HOR_BIN", 0) or 1),
        }

    def _filter(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "filter"):
            return None
        slot_prop = self._prop(tree, "filter", "FILTER_SLOT")
        names_prop = self._prop(tree, "filter", "FILTER_NAME")
        slot = slot_prop.number("FILTER_SLOT_VALUE") if slot_prop else None
        if slot is None:
            return None
        names = []
        if names_prop:
            numbered = sorted(
                (int(key.rsplit("_", 1)[1]), value.strip())
                for key, value in names_prop.elements.items()
                if key.startswith("FILTER_SLOT_NAME_") and key.rsplit("_", 1)[1].isdigit()
            )
            names = [name for _, name in numbered]
        return {
            "slot": int(slot),
            "name": names[int(slot) - 1] if 0 < int(slot) <= len(names) else None,
            "names": names,
            "moving": bool(slot_prop and slot_prop.state == "Busy"),
        }

    def _focuser(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "focuser"):
            return None
        position = self._prop(tree, "focuser", "ABS_FOCUS_POSITION")
        temperature = self._prop(tree, "focuser", "FOCUS_TEMPERATURE")
        return {
            "position": int(position.number("FOCUS_ABSOLUTE_POSITION") or 0) if position else None,
            "temperature": _round(temperature.number("TEMPERATURE") if temperature else None, 1),
            "max": int(self._number(tree, "focuser", "FOCUS_MAX", "FOCUS_MAX_VALUE", 0) or 0) or None,
            "moving": bool(position and position.state == "Busy"),
        }

    def _roof(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "roof"):
            return None
        # The roll-roof driver's own status texts (ROOF: OPEN / CLOSED — CLOSE before 2.1.0 —
        # / MOVE: … / ABORTED / UNKNOWN; TELESCOPE: PARKED / NO PARKED (…) / UNKNOWN), with the
        # standard DOME_PARK as a fallback. Since 2.1.0 the driver re-reads the switches every few
        # seconds while idle, so a roof moved by other means (power relay, gate remote) shows up here.
        text = self._prop(tree, "roof", "ROOF")
        mount = self._prop(tree, "roof", "TELESCOPE")
        park = self._prop(tree, "roof", "DOME_PARK")
        roof_text = (text.text("ROOF") or "").upper() if text else ""
        if roof_text.startswith("MOVE") or (park and park.state == "Busy"):
            state = "moving"
        elif roof_text.startswith("OPEN"):
            state = "open"
        elif roof_text.startswith("CLOSE"):
            state = "closed"
        elif roof_text.startswith("ABORT"):
            # Stopped part-way: DOME_PARK may still hold the state from before the move
            state = "unknown"
        elif park and park.switch("PARK"):
            state = "closed"
        elif park and park.switch("UNPARK"):
            state = "open"
        else:
            state = "unknown"
        mount_text = (mount.text("TELESCOPE") or "").upper() if mount else ""
        return {
            "state": state,
            "parked": None if not mount_text or mount_text == "UNKNOWN" else mount_text == "PARKED",
        }

    def _weather(self, tree: PropertyTree) -> dict | None:
        if not self._role_connected(tree, "weather"):
            return None
        status = self._prop(tree, "weather", "WEATHER_STATUS")
        parameters = self._prop(tree, "weather", "WEATHER_PARAMETERS")
        state = "unknown"
        if status:
            lights = [LIGHT_STATES.get(value.strip(), "unknown") for value in status.elements.values()]
            lights.append(LIGHT_STATES.get(status.state, "unknown"))
            state = max(lights, key=LIGHT_ORDER.index) if lights else "unknown"
        values = {}
        if parameters:
            for element, key in WEATHER_PARAMETERS.items():
                value = parameters.number(element)
                if value is not None:
                    values[key] = round(value, 1)
        return {"state": state, "parameters": values}

    def _watchdog(self, tree: PropertyTree) -> dict | None:
        device = self.roles.get("watchdog")
        if not device or tree.get(device, "CONNECTION") is None:
            return None
        triggers = tree.get(device, "WATCHDOG_Trigger") or tree.get(device, "WATCHDOG_TRIGGER")
        shutdown = tree.get(device, "WATCHDOG_SHUTDOWN")
        heartbeat = tree.get(device, "WATCHDOG_HEARTBEAT")
        return {
            "armed": self._connected(tree, device),
            # Seconds without a client heartbeat before the shutdown
            "heartbeat": _round(heartbeat.number("WATCHDOG_HEARTBEAT_VALUE"), 0) if heartbeat else None,
            # TRIGGER_CLIENT → client, TRIGGER_WEATHER → weather
            "triggers": [name.replace("TRIGGER_", "").lower() for name in triggers.on_switches()] if triggers else [],
            # PARK_MOUNT → mount, PARK_DOME → dome, EXECUTE_SCRIPT → script
            "shutdown": [name.replace("PARK_", "").replace("EXECUTE_", "").lower() for name in shutdown.on_switches()] if shutdown else [],
        }


IMPORTANT_EVENTS = {"indi_online", "indi_offline", "roof_opened", "roof_closed", "weather_alert", "job_started", "job_finished"}


def diff_events(previous: dict | None, current: dict) -> list[dict]:
    """State transitions between two snapshots, as portal events."""
    if previous is None:
        return []
    events: list[dict] = []
    time = current["time"]

    def add(kind: str, device: str | None = None, payload: dict | None = None) -> None:
        event: dict[str, Any] = {"type": kind, "time": time}
        if device:
            event["device"] = device
        if payload:
            event["payload"] = payload
        events.append(event)

    names = {d["role"]: d["name"] for d in current.get("devices") or previous.get("devices") or []}

    was_online = previous.get("indi", {}).get("online")
    is_online = current.get("indi", {}).get("online")
    if was_online != is_online:
        add("indi_online" if is_online else "indi_offline")

    old_roof = (previous.get("roof") or {}).get("state")
    new_roof = (current.get("roof") or {}).get("state")
    if new_roof != old_roof and new_roof in ("open", "closed") and old_roof is not None:
        add("roof_opened" if new_roof == "open" else "roof_closed", names.get("roof", "roof"))

    old_parked = (previous.get("mount") or {}).get("parked")
    new_parked = (current.get("mount") or {}).get("parked")
    if old_parked is not None and new_parked is not None and old_parked != new_parked:
        add("mount_parked" if new_parked else "mount_unparked", names.get("mount", "mount"))

    old_weather = (previous.get("weather") or {}).get("state")
    new_weather = (current.get("weather") or {}).get("state")
    if new_weather != old_weather and old_weather is not None:
        if new_weather == "alert":
            add("weather_alert", names.get("weather", "weather"), {"parameters": (current.get("weather") or {}).get("parameters")})
        elif old_weather == "alert" and new_weather == "ok":
            add("weather_ok", names.get("weather", "weather"))

    old_devices = {d["name"]: d["connected"] for d in previous.get("devices") or []}
    for device in current.get("devices") or []:
        before = old_devices.get(device["name"])
        if before is True and not device["connected"]:
            add("device_disconnected", device["name"])
        elif before is False and device["connected"]:
            add("device_connected", device["name"])

    old_job = (previous.get("scheduler") or {}).get("job")
    new_job = (current.get("scheduler") or {}).get("job")
    if old_job != new_job:
        if old_job:
            add("job_finished", None, {"job": old_job})
        if new_job:
            add("job_started", None, {"job": new_job})

    return events
