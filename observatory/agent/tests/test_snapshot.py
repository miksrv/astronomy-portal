import copy
from pathlib import Path

from observatory_agent.config import DEFAULT_ROLES
from observatory_agent.host import parse_scheduler_reply
from observatory_agent.indi import PropertyTree, StreamParser
from observatory_agent.snapshot import SnapshotBuilder, diff_events

FIXTURE = (Path(__file__).parent / "fixtures" / "indi_session.xml").read_bytes()


def snapshot(extra: bytes = b"", online: bool = True) -> dict:
    tree = PropertyTree()
    parser = StreamParser(tree.apply)
    parser.feed(FIXTURE + extra)
    return SnapshotBuilder(DEFAULT_ROLES).build(tree, indi_online=online, profile="AstroLab", disk_free_gb=80.04)


def test_offline_snapshot_has_only_indi():
    snap = snapshot(online=False)
    assert snap["indi"] == {"online": False, "profile": "AstroLab"}
    assert "mount" not in snap and snap["disk"] == {"freeGb": 80.0}


def test_sections():
    snap = snapshot()
    mount = snap["mount"]
    assert {k: mount[k] for k in ("ra", "dec", "alt", "az", "parked", "tracking", "slewing", "pierSide", "trackMode", "lst")} == {
        "ra": round(0.73689 * 15, 4), "dec": 41.4155, "alt": 62.41, "az": 75.12, "parked": False,
        "tracking": True, "slewing": False, "pierSide": "west", "trackMode": "sidereal", "lst": 23.5512,
    }
    # M31 of the date (2026) → back to its J2000 catalog position, within the drift of "now"
    assert abs(mount["raJ2000"] - 10.6847) < 0.01 and abs(mount["decJ2000"] - 41.2687) < 0.01
    assert abs(mount["target"]["ra"] - 10.6847) < 0.05 and abs(mount["target"]["dec"] - 41.2687) < 0.05
    camera = snap["camera"]
    assert {k: camera[k] for k in ("temperature", "coolerOn", "coolerPower", "exposing", "exposureLeft", "frameType", "binning", "gain", "offset", "focalLength", "aperture")} == {
        "temperature": -10.1, "coolerOn": True, "coolerPower": 34, "exposing": True, "exposureLeft": 182.5,
        "frameType": "light", "binning": 1, "gain": 150, "offset": 50, "focalLength": 1000, "aperture": 200,
    }
    assert camera["sensor"] == {"width": 9576, "height": 6388, "pixelSize": 3.76}
    assert camera["fov"] == {"width": 2.063, "height": 1.376}
    assert snap["guider"] == {"exposing": True, "exposureLeft": 1.5, "binning": 1}
    assert snap["filter"] == {"slot": 1, "name": "L", "names": ["L", "R", "G", "B", "H", "O", "S"], "moving": False}
    assert snap["focuser"] is None  # EAF disconnected
    assert snap["roof"] == {"state": "open", "parked": False}
    assert snap["weather"]["state"] == "ok"
    assert snap["weather"]["parameters"]["clouds"] == 8
    assert snap["watchdog"] == {"armed": True, "heartbeat": 600, "triggers": ["client", "weather"], "shutdown": ["mount", "dome"]}
    roles = {d["name"]: (d["role"], d["connected"]) for d in snap["devices"]}
    assert roles["ZWO EAF"] == ("focuser", False)
    assert roles["Roll Roof"] == ("roof", True)
    alerts = {d["name"]: d["alerts"] for d in snap["devices"]}
    assert alerts["ZWO CCD ASI6200MM Pro"] == [] and alerts["Roll Roof"] == []
    drivers = {d["name"]: d["driver"] for d in snap["devices"]}
    assert drivers["ZWO CCD ASI6200MM Pro"] == {"name": "ZWO CCD", "version": "2.5"}
    assert drivers["Roll Roof"] is None


def test_roof_moving_and_closed():
    moving = snapshot(b'<setTextVector device="Roll Roof" name="ROOF" state="Busy"><oneText name="ROOF">MOVE: CLOSING...</oneText></setTextVector>')
    assert moving["roof"]["state"] == "moving"
    closed = snapshot(b'<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">CLOSED</oneText></setTextVector>'
                      b'<setTextVector device="Roll Roof" name="TELESCOPE" state="Ok"><oneText name="TELESCOPE">PARKED</oneText></setTextVector>')
    assert closed["roof"] == {"state": "closed", "parked": True}


def test_alerting_properties_are_listed():
    snap = snapshot(
        b'<setNumberVector device="ZWO CCD ASI6200MM Pro" name="CCD_TEMPERATURE" state="Alert"><oneNumber name="CCD_TEMPERATURE_VALUE">5</oneNumber></setNumberVector>'
        b'<setSwitchVector device="ZWO EAF" name="CONNECTION" state="Alert"><oneSwitch name="CONNECT">Off</oneSwitch><oneSwitch name="DISCONNECT">On</oneSwitch></setSwitchVector>'
    )
    devices = {d["name"]: d for d in snap["devices"]}
    assert devices["ZWO CCD ASI6200MM Pro"]["alerts"] == ["Temperature"]
    assert devices["ZWO EAF"]["connected"] is False and devices["ZWO EAF"]["alerts"] == ["Connection"]


def test_roof_closed_text_of_driver_2_0():
    closed = snapshot(b'<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">CLOSE</oneText></setTextVector>')
    assert closed["roof"]["state"] == "closed"


def test_roof_moved_outside_the_driver():
    # Driver 2.1.0 polls while idle: a roof opened by the power relay updates ROOF and DOME_PARK
    opened = snapshot(
        b'<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">CLOSED</oneText></setTextVector>'
        b'<setSwitchVector device="Roll Roof" name="DOME_PARK" state="Ok"><oneSwitch name="PARK">On</oneSwitch><oneSwitch name="UNPARK">Off</oneSwitch></setSwitchVector>'
    )
    reopened = snapshot(
        b'<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">OPEN</oneText></setTextVector>'
        b'<setSwitchVector device="Roll Roof" name="DOME_PARK" state="Ok"><oneSwitch name="PARK">Off</oneSwitch><oneSwitch name="UNPARK">On</oneSwitch></setSwitchVector>'
    )
    assert opened["roof"]["state"] == "closed" and reopened["roof"]["state"] == "open"
    assert [e["type"] for e in diff_events(opened, reopened)] == ["roof_opened"]


def test_events_between_snapshots():
    before = snapshot()
    after = snapshot(
        b'<setTextVector device="Roll Roof" name="ROOF" state="Ok"><oneText name="ROOF">CLOSED</oneText></setTextVector>'
        b'<setSwitchVector device="EQMod Mount" name="TELESCOPE_PARK" state="Ok"><oneSwitch name="PARK">On</oneSwitch><oneSwitch name="UNPARK">Off</oneSwitch></setSwitchVector>'
        b'<setLightVector device="Weather Watcher" name="WEATHER_STATUS" state="Alert"><oneLight name="WEATHER_CLOUDS">Alert</oneLight></setLightVector>'
    )
    after["scheduler"] = {"state": "idle", "job": None}
    before["scheduler"] = {"state": "running", "job": "M31"}
    events = diff_events(before, after)
    assert [e["type"] for e in events] == ["roof_closed", "mount_parked", "weather_alert", "job_finished"]
    assert events[0]["device"] == "Roll Roof" and events[1]["device"] == "EQMod Mount"


def test_indi_offline_event_and_first_snapshot():
    online = snapshot()
    offline = snapshot(online=False)
    assert diff_events(None, online) == []
    assert [e["type"] for e in diff_events(online, offline)] == ["indi_offline"]
    assert [e["type"] for e in diff_events(offline, copy.deepcopy(online))] == ["indi_online"]


def test_parse_scheduler_reply():
    reply = '''method return time=1 sender=:1.20 -> destination=:1.27 serial=32 reply_serial=2
   array [
      dict entry(
         string "currentJobName"
         variant             string "M31"
      )
      dict entry(
         string "status"
         variant             int32 2
      )
   ]'''
    assert parse_scheduler_reply(reply) == {"state": "running", "job": "M31"}
    assert parse_scheduler_reply(reply.replace('"M31"', '""').replace("int32 2", "int32 0")) == {"state": "idle", "job": None}
    assert parse_scheduler_reply("Error org.freedesktop.DBus.Error.ServiceUnknown") is None
