# INDI drivers and Ekos profile

Config files are in [`../config/indi/`](../config/indi/) and go to `~/.indi/` on the host. INDI
keeps one `<Device Name>_config.xml` per device; a driver loads it on connect. Saving from a
client (Ekos "Options → Save") overwrites the file — back it up first
(`cp "X_config.xml" "X_config.xml.bak-$(date +%Y%m%d)"`).

## Profiles

| Profile | Where | File in repo |
|---|---|---|
| indiweb "AstroLab" | `~/.indi/profiles.db` | [`config/profiles/indiweb-profile.sql`](../config/profiles/indiweb-profile.sql) |
| Ekos "AstroLab" | `…/kstars/userdb.sqlite` in the container | [`config/profiles/ekos-profile.sql`](../config/profiles/ekos-profile.sql) |

Both list the same drivers:

| Driver label | Ekos role | Device name |
|---|---|---|
| EQMod Mount | Mount | `EQMod Mount` |
| ZWO CCD | CCD | `ZWO CCD ASI6200MM Pro` |
| ZWO EFW | Filter | `ZWO EFW` |
| ZWO EAF | Focuser | `ZWO EAF` |
| QHY CCD | Guider | `QHY CCD QHY5II-M` |
| Roll Roof | Dome | `Roll Roof` |
| Weather Watcher | Weather | `Weather Watcher` |
| WatchDog | Aux | `WatchDog` |
| Astrometry | Aux | `Astrometry` |

The old `ASI EFW` / `ASI EAF` labels are obsolete in INDI 2 — use `ZWO EFW` / `ZWO EAF`.

## EQMod Mount

| Property | Value | Why |
|---|---|---|
| `DEVICE_PORT` | `/dev/serial/by-id/usb-Prolific…-if00-port0` | Stable path to the PL2303 cable |
| `DEVICE_AUTO_SEARCH` | Off | Auto search could grab the roof's Arduino port |
| `ACTIVE_DEVICES.ACTIVE_DOME` | `Roll Roof` | The mount watches the roof |
| `DOME_POLICY` | `DOME_LOCKS` | The mount cannot be unparked while the roof is closed |
| `GEOGRAPHIC_COORD` | site (placeholder `0.0` in the repo) | Must be set for correct pointing |
| `TELESCOPE_TRACK_MODE` | Sidereal | |
| `GUIDE_RATE` | 0.5× in both axes | |
| `SLEWSPEEDS` | 800× in RA and Dec | |
| `ALIGNMODE` | `ALIGNNEAREST` | Uses the nearest sync points of the pointing model |
| `HORIZONLIMITSONLIMIT` / `HORIZONLIMITSLIMITGOTO` | stop tracking at the limit, refuse GOTO below it | The park position is just below the horizon (alt ≈ −0.3°) — keep that in mind when editing the horizon |
| Backlash compensation | off (10 steps configured) | |

Park data (encoder positions of the park position) is in `ParkData.xml`. The copy in the repo
is a reference for this mount only; it is valid as long as the park position matches the
reed switches (see [operations.md](operations.md#lost-mount-position)).

## Roll Roof (`indi_rollroof`)

Source: [miksrv/indi-rollroof-controller](https://github.com/miksrv/indi-rollroof-controller), v2.1.0.

| Property | Value | Why |
|---|---|---|
| `DEVICE_PORT` | `/dev/serial/by-id/usb-Arduino…-if00` (serial number replaced by `SERIAL` in the repo) | Stable path |
| `DEVICE_AUTO_SEARCH` | Off | |
| `ACTIVE_DEVICES.ACTIVE_TELESCOPE` | `EQMod Mount` | The driver snoops the mount's `TELESCOPE_PARK` |
| `MOUNT_POLICY` | `MOUNT_LOCKS` | The roof refuses to move unless the mount is parked |
| `POLLING_PERIOD` | 5000 ms | How often the roof and the park reed switches are re-read while idle (≥ 1000; every 30 s while the controller doesn't answer) |

The driver allows motion only when EQMod reports a settled `PARK = On` (state Ok) **and** both
reed switches are closed. Unknown, disconnected, busy or alert all count as "not parked". It
refuses, it never waits — whoever wants the roof to move must park the mount first. Travel
timeout is 19 s (real travel ≈ 10–11 s).

Since 2.1.0 the driver also re-reads the switches every *Polling* period while idle, so a roof
moved without it (the gate controller's remote, the power relay, someone on site) is shown as
it is within ~5 s:

| Status | `ROOF` text | `DOME_PARK` | Meaning |
|---|---|---|---|
| Closed limit switch | `CLOSED` | PARK (Ok) | Roof closed |
| Open limit switch | `OPEN` | UNPARK (Ok) | Roof open — a shutdown will close it |
| Neither / both | `UNKNOWN` | neither (Idle) | Stopped part-way or travelling: a shutdown closes it; the mount stays locked (it only follows a settled PARK/UNPARK) |
| Moving by the driver | `MOVE: OPENING...` / `MOVE: CLOSING...` | Busy | Travel watched every 0.5 s |

A change without a driver command is logged as a warning (*"Roof position changed without a
command from this driver"*). `TELESCOPE` shows the reed switches: `PARKED`, `NO PARKED (DEC, RA)`,
`NO PARKED (DEC)`, `NO PARKED (RA)`. The observatory agent forwards both to the portal.

## Weather Watcher (`indi_watcher_weather`)

Reads a plain `key=value` feed (`…/current/text`) from the site weather API every 60 s.

| Slot | Feed key | Label | Critical | OK range |
|---|---|---|---|---|
| 1 | `precipitation` | Rain | yes | 0 (max OK 0) |
| 2 | `temperature` | Temperature | no | −24 … 30 °C |
| 3 | `wind_speed` | Wind | yes | 0 … 9 m/s |
| 4 | `wind_gust` | Gust | yes | 0 … 15 m/s |
| 5 | `clouds` | Clouds | yes | 0 … 50 % |
| 6 | `humidity` | Humidity | no | 0 … 100 % |
| 7 | `pressure` | Pressure | no | 960 … 1050 hPa |
| 8 | `forecast` | Forecast (rain expected in the next hours) | yes | 0 … 1 |

Notes:
- INDI 2 uses the `KEYWORDS` (`KEY_1…8`) and `CRITICALS` vectors. An old config with a single
  `KEYWORD` vector is silently ignored: nothing is read, nothing is critical and the
  observatory is **never** unsafe. Check the parameters actually update after any upgrade.
- `ALERT_TYPE` must be 0 for every parameter (1 inverts the range and raises false alerts).
- Gusts are allowed up to 15 m/s because model gusts run 2–2.5× the mean wind.
- The feed values are already "confirmed" on the weather server (several sources must agree;
  stale data yields safe values). False alarms were judged worse than fail-open.
- If the feed can't be fetched, the driver keeps the last values and `SAFETY_STATUS` doesn't
  change — a stale-feed watchdog is a known gap.
- The driver's parser swallows the line after an empty `key=`; the feed never sends empty values.

## WatchDog (`indi_watchdog`)

| Property | Value |
|---|---|
| `WATCHDOG_Trigger` | `TRIGGER_CLIENT` + `TRIGGER_WEATHER` |
| `WATCHDOG_HEARTBEAT` | 600 s — shutdown if no client (Ekos) heartbeat for 10 min |
| `WATCHDOG_WEATHER` | 120 s — shutdown if weather is in Alert for 2 min |
| `ACTIVE_DEVICES` | `EQMod Mount`, `Roll Roof`, `Weather Watcher` |
| `WATCHDOG_MOUNT_POLICY` | `MOUNT_LOCKS` |
| `WATCHDOG_SHUTDOWN` | `PARK_MOUNT`, then `PARK_DOME`; no script |

WatchDog only parks. It never cuts power.

## ZWO CCD ASI6200MM Pro

Gain 150, offset 50, USB bandwidth 80, RAW16, FITS, full frame 9576 × 6388, bin 1×1, cooler off
by default (Ekos turns it on per sequence; it needs the camera's 12 V). `SCOPE_INFO` 1000 mm /
200 mm. Upload mode `UPLOAD_CLIENT` — frames go to Ekos, which saves them under
`/home/mik/fits/<target>/<type>/<filter>/…`. Snooped devices: EQMod Mount, ZWO EAF, ZWO EFW.

## ZWO EFW

Slot names `L R G B H O S`. Per-filter focus offsets and exposure defaults live in Ekos
(`filter` table in `userdb.sqlite`), not in the INDI config.

## ZWO EAF

No config file in the repo yet: the focuser was not enumerating on USB during the last remote
check (hardware/cable issue, see [operations.md](operations.md#open-issues)). Ekos focus
settings (step size 250, max travel 15000, temperature source Weather Watcher) are in
`kstarsrc.example`.

## QHY CCD QHY5II-M

Guide camera. Its INDI config must be recreated (the old one belonged to a different device
name). Ekos guide settings: exposure 2.5 s, bin 1×1, auto star, proportional gain 0.75 in both
axes.

## Astrometry

Snoops the main camera; `solve-field` with `--no-verify --no-plots --resort --downsample 2 -O`.
Ekos normally solves with its own StellarSolver; both use the indexes in `/usr/share/astrometry`.
