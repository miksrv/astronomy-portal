# Operations

## Access

| What | How |
|---|---|
| Shell | `ssh astrolab` (key-based, an alias in `~/.ssh/config`) |
| KStars / Ekos | Browser desktop served by the `kstars-desktop` container (login from `~/kstars-desktop/.env`) |
| indiweb | `http://localhost:8624` on the host (`ssh -L 8624:localhost:8624 astrolab`) |
| Power relay UI | `ssh -L 8081:<relay-ip>:80 astrolab` → `http://localhost:8081` |
| Webcam | Indoor camera; the portal shows its snapshots on `/observatory` |

## Starting and stopping

```bash
obs-power on                                         # power up the equipment
curl -X POST localhost:8624/api/server/start/AstroLab   # start the INDI profile (or let Ekos do it)
curl -s localhost:8624/api/server/status             # running? which profile?
curl -s localhost:8624/api/server/drivers            # running drivers
curl -X POST localhost:8624/api/server/stop          # stop INDI (do this before anyone works on site)
obs-power off                                        # only after the mount and roof are parked
```

Start a single driver into a running server (e.g. if the filter wheel didn't start):

```bash
echo "start indi_asi_wheel" > /tmp/indiFIFO
```

Read a property without touching anything:

```bash
indi_getprop -h localhost -p 7624 "EQMod Mount.TELESCOPE_PARK.*" "Roll Roof.DOME_PARK.*"
indi_getprop "Weather Watcher.WEATHER_STATUS.*" "Weather Watcher.WEATHER_PARAMETERS.*"
```

Never use `pkill -f <pattern>` over SSH — the pattern matches the SSH session's own command
line and kills it. Stop processes by PID or exact name (`pkill -x indiserver`).

## Frames

```
Ekos (container) ──► /home/mik/fits on the host SSD ──(end of night)──► archive server
                     <target>/<type>/<filter>/*.fits     frames-upload      /data/fits/upload  (staging)
                                                                              │ mv (atomic)
                                                                              ▼
                                                            /data/fits/incoming ──► observatory pipeline
                                                                                    ──► observatory-api ──► portal
```

- Ekos saves frames to `CaptureDirectory` = `/home/mik/fits` as
  `<target>/<type>/<filter>/<target>_<type>_<filter>_<exposure>_<datetime>.fits`. The same path
  is bind-mounted from the host SSD into the container (`compose.yaml`), so frames survive a
  container rebuild. A full ASI6200 frame is ≈ 122 MB; a long night is ~10–20 GB.
- At the end of a night the Ekos Scheduler runs [`ekos-shutdown.sh`](../scripts/ekos-shutdown.sh),
  which drops a request file; the host's `frames-upload.path` unit sees it and starts
  [`frames-upload`](../scripts/frames-upload). `frames-upload.timer` runs it once a day as a
  fallback, and it can be run by hand (`frames-upload --dry-run` lists what it would move).
- **Frames are moved, not copied:** rsync deletes each local file only after it has been fully
  transferred and verified. They land in a staging directory on the archive server and are then
  renamed into the pipeline's `incoming` directory — the pipeline's watcher reacts only to
  "file created" events and never sees a half-written file this way. The folder structure is
  flattened (the pipeline sorts by FITS headers). A name that already exists in `incoming`
  stays in staging and is logged.
- Files younger than 2 minutes are skipped (may still be written). Log:
  `~/kstars-desktop/config/scripts/frames-upload.log`, `journalctl -u frames-upload`.
- If the archive server is unreachable the frames simply stay on the SSD; the service retries
  every 15 minutes (4 times), then the daily timer tries again. Watch free space on the SSD.

## Lost mount position

EQ6 encoders are relative: a motor-board power loss resets them to the default "home" (counter-
weight down, pointing at the pole). If the mount was **parked**, EQMod restores the park
encoder values from `~/.indi/ParkData.xml` on connect and nothing is lost. If it was **not**
parked (e.g. a 12 V dropout while tracking), the position is wrong and the mount can't park
onto the reed switches — so the roof can't close.

Recovery:
1. **Reeds closed** (mount still physically at park): mark EQMod as parked from `ParkData.xml`
   and reconnect — no motion needed. Keep a reference copy of `ParkData.xml` once the park
   position is verified to coincide with the reeds.
2. **Reeds open, roof open, sky visible:** capture → plate solve (`solve-field`) → EQMod
   `SYNC` → `PARK` → confirm both reeds close.
3. **Otherwise:** supervised slow homing, one axis at a time, watched through the webcam, until
   the axis' reed switch closes. Never do this unattended.

Do not use "Write data / Current" in the EQMod park settings unless EQMod's idea of the
position is known to be correct — that's how park data got lost before.

## Motion tests

Ordered checklist for when someone is on site (all motion announced first, webcam watched,
remote relay ready as emergency stop):

1. **Hardware (INDI stopped):** limit switches D4/D5 change only at the end positions; reed
   switches D6/D7 close exactly at park; stable 12 V (no dropouts when wiggling connectors);
   EAF visible in `lsusb`.
2. **Devices without motion:** camera cools to −10 °C and holds ±0.2 °C; EFW cycles all 7 slots;
   EAF moves ±1000 steps and reports temperature; guider exposes; Weather Watcher shows all
   8 parameters and Ok.
3. **Mount (roof open):** unpark refused while the roof is closed (`DOME_LOCKS`); small slews,
   2–3 GOTOs away from the sun, abort, horizon limits; park ×3 — each time the roof driver must
   show the mount parked (both reeds) **and** EQMod `PARK = On`.
4. **Roof via the driver (mount parked):** refusals with EQMod disconnected / unparked / one
   reed open / already open; normal open and close ×3 with timings.
5. **Safety chain:** force a weather alert (lower a critical threshold) → after 120 s WatchDog
   parks the mount, then closes the roof; close Ekos with a short heartbeat → same sequence;
   block the weather URL → alert → same. Restore every setting afterwards.
6. **End-to-end Scheduler run** (dark and clear): startup script → unpark → slew → solve →
   autofocus → guide → a few LRGB frames → park mount → close roof → shutdown script.

## Open issues

As of the last check (2026-10-30):

- [ ] Add "Roll Roof" to the live indiweb and Ekos profiles (the repo SQL already has it);
      replace the obsolete `ASI EFW` / `ASI EAF` labels in the live indiweb profile.
      Until then WatchDog's `PARK_DOME` has no roof to park.
- [ ] Mount 12 V line dropped out twice — find the bad contact.
- [ ] ZWO EAF does not enumerate on USB at all (cable / connection / power).
- [ ] Single reed switch opened with the mount parked — roof must refuse (needs someone on site).
- [ ] EQMod horizon limit vs park altitude (−0.3°).
- [ ] Verify the park position coincides with the reed switches; then save a reference
      `ParkData.xml`.
- [ ] Ekos Scheduler: startup/shutdown scripts, dome unpark/park, camera warm-up (GUI).
- [ ] `obs-power off` with INDI running and everything parked (not tested yet).
- [ ] Filter size / spacing — corner vignetting on full-frame test frames.
- [ ] Whole USB tree runs at USB 2.0 speed.
- [ ] Stale weather feed is not detected (driver keeps last values).
- [ ] Ekos Scheduler shutdown script → `/config/scripts/ekos-shutdown.sh` (GUI), then check
      one real night end-to-end: frames on the SSD → staging → `incoming` → pipeline.
- [ ] Router DHCP should push a working DNS server (the host uses a fallback for now).
