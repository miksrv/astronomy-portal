# Observatory agent

A small Python service on the observatory PC that reports what the observatory is doing to the
portal ([FEAT-30](../../features/observatory-agent.md), phase 1 — live status) and, when enabled,
carries the telescope jobs from the site to Ekos and their progress back (phase 2, see
[Telescope jobs](#telescope-jobs)). It never sends commands to INDI, never moves the mount or the
roof, never switches power, and **never starts the Ekos Scheduler**.

```
INDI server (:7624) ──XML──►┐
indiweb (:8624) ───────────►├─ agent ──HTTPS, every 60 s──► portal API ──► /observatory status card
Ekos Scheduler (DBus) ─────►┘          POST /observatory/agent/status
```

- Standard library only, Python ≥ 3.11 — nothing to `pip install` on the host.
- **Snapshot** every 60 s: INDI up/down + profile; every device with its connection and driver
  version; mount (RA/Dec of date **and J2000** — precessed in `astro.py`, IAU 1976 — Alt/Az,
  parked/tracking/slewing, track mode, pier side, LST, last GOTO target); camera (temperature,
  cooler, exposure, frame type, gain/offset, binning, sensor, focal length, **field of view**);
  guider; filter wheel (all slot names, current, moving); focuser (position, max, temperature);
  roof (state + mount-park reed switches); weather (safety + parameters); WatchDog (heartbeat,
  triggers, shutdown order); Ekos Scheduler (state + current job); free disk space for frames
  (admin only on the site).
- **Events** (roof opened/closed, mount parked, weather alert/ok, INDI online/offline, device
  connected/disconnected, job started/finished) go with the next push and are kept until delivered
  if the portal is unreachable. Important ones (roof, weather alert, INDI up/down, job) are pushed
  early, but never sooner than `min_push_gap` (60 s) after the previous push: **at most one request
  a minute** in any case, also with `push_interval` raised to 300.
- The snapshot shape is the contract with the portal; see `observatory_agent/snapshot.py`.

## Layout

| Path | What |
|---|---|
| `observatory_agent/indi.py` | Read-only INDI XML client and property tree |
| `observatory_agent/snapshot.py` | Snapshot builder and event diff |
| `observatory_agent/astro.py` | JNow → J2000 precession (IAU 1976), camera field of view |
| `observatory_agent/host.py` | indiweb profile, Ekos Scheduler over DBus (`docker exec … dbus-send`), disk space |
| `observatory_agent/portal.py` | HTTPS client (Bearer token) |
| `observatory_agent/main.py` | Main loop, `--once` mode |
| `observatory_agent/jobs.py` | Telescope jobs: sync, frames → progress, Ekos observation, tonight's plan + load |
| `observatory_agent/jobstate.py` | Local SQLite: jobs, outbox (per-job `seq`), frames, patrol visits |
| `observatory_agent/planner.py` | What to shoot tonight: visibility, darkness, Moon, score, patrol |
| `observatory_agent/ephem.py` | Low-precision Sun/Moon, altitude, the night's darkness |
| `observatory_agent/ekosfiles.py` | `.esq`/`.esl` writer + checks (KStars 3.8.5 format) |
| `observatory_agent/ekos.py` | Ekos Scheduler over DBus (`busctl`): read state, `loadScheduler` only |
| `observatory_agent/frames.py` | Finds the jobs' and patrol frames under `~/fits/jobs`, `~/fits/patrol` |
| `config.example.toml` | Every setting with defaults |
| `observatory-agent.service` | systemd unit |
| `tools/fake_indi.py` | Fake INDI server for trying it without hardware |
| `tests/` | pytest, with a recorded INDI session as fixture |

## Install on the observatory PC

```bash
sudo mkdir -p /opt/observatory-agent /etc/observatory-agent
sudo cp -r observatory_agent /opt/observatory-agent/
sudo cp config.example.toml /etc/observatory-agent/config.toml      # set portal.url
sudo sh -c 'umask 077; printf "%s" "<token>" > /etc/observatory-agent/token'   # = observatory.agentToken on the portal
sudo chown -R mik: /etc/observatory-agent
cd /opt/observatory-agent && python3 -m observatory_agent --config /etc/observatory-agent/config.toml --once   # prints one snapshot, sends nothing
sudo cp observatory-agent.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now observatory-agent
journalctl -u observatory-agent -f
```

The portal side needs `observatory.agentToken` (≥ 32 random bytes, `openssl rand -hex 32`) in
`server/.env` and the migration `AddObservatoryStatus`.

## Telescope jobs

Off unless `[jobs] enabled = true` (and `[site]` filled in — on the host only). Then the agent:

1. every 5 min pulls the jobs the observatory should know (`GET /observatory/agent/jobs`), accepts
   new approved ones, and pushes its outbox (`POST /observatory/agent/updates`) — each update with
   a per-job `seq`, kept in the local database until the site has it, so nothing is lost or counted
   twice across restarts and outages;
2. every 30 s looks for new frames under `~/fits/jobs/<job id>/…` and `~/fits/patrol/<target id>/…`
   (each sequence it writes saves there) and reports absolute counts per filter (`progress`),
   `started` with the first frame, `completed` when every filter has its count; patrol frames
   become visits (`POST /observatory/agent/patrol/visits`), reported while they are shot and once
   more when over — the night's first visit makes that night's patrol job on the site;
3. watches the Ekos Scheduler: the job it runs is `started`; when it goes idle, or in daylight
   while Ekos shoots nothing (also after the PC was off for days), the running jobs go back to
   `queued` (`night_ended`); a cancel from the site is confirmed only once
   the job is no longer in the Scheduler — also with `load_into_ekos = false`, since a person may
   have loaded the agent's schedule by hand (then the person takes it out or reloads);
4. from 2 h before nautical dusk builds tonight's plan (`planner.py`), writes one `.esq` per Ekos
   job and `tonight.esl` to a folder of its own, `ekos_dir/<night>/<version>/` (a newer plan never
   deletes the files of the schedule Ekos has loaded), copies that `tonight.esl` to
   `ekos_dir/<night>/tonight.esl` for loading by hand, posts the plan to the site, and — only with
   `load_into_ekos = true` — loads it into the Scheduler (after a load the night's older plan
   folders go). A load refused because the Scheduler is busy, unreachable or holds a person's
   schedule is tried again with the next plan, ~10 min later.

Frames already counted on the site (up to the job's `lastFrameAt` when the agent first saw it) are
not counted again — after a lost `state.db` the frames still on the SSD don't inflate the progress.

**Safety.** The only DBus method the agent may call is `loadScheduler` (`ekos.ALLOWED_METHODS`,
checked by `tests/test_ekos_safety.py`): starting the Scheduler would run the observatory startup
queue (roof unpark, mount unpark), so it stays a person's decision. A schedule is loaded only into
an **idle** Scheduler whose jobs are all the agent's own (a schedule a person built is never
replaced), only with the filter wheel's names known, and only after the written files passed
`check_schedule()`/`check_sequence()`. The files never carry `StartupProcedure`,
`ShutdownProcedure` or `ErrorHandlingStrategy` (they would overwrite the observatory's Ekos
options), always name the optical train (an unknown one opens a modal dialog in KStars) and the
full sensor frame, and every job has min altitude ≥ the 15° floor and the artificial horizon on.

**Install additions:**

```bash
mkdir -p /home/mik/kstars-desktop/config/agent       # Ekos files (writable for the service)
# /etc/observatory-agent/config.toml: [jobs] enabled = true, [site] latitude/longitude/timezone
sudo cp observatory-agent.service /etc/systemd/system/ && sudo systemctl daemon-reload
sudo systemctl restart observatory-agent
```

**In Ekos (by hand, once):** Scheduler → Options → *Remember job progress* **off** (frames are
moved to the archive every morning, so Ekos would count wrong; the agent writes the remaining
counts instead); the optical train `Primary` must name the guide camera as it is now
(`QHY CCD QHY5II-M`); check one loaded job in the Ekos log (`ROI = …`, binning, filter) before
the first unattended night.

## Try it locally

```bash
python3 tools/fake_indi.py --port 7624 &          # fake devices; a weather alert and the roof closing follow
OBSERVATORY_AGENT_TOKEN=<token> python3 -m observatory_agent --config config.local.toml -v
```

with a `config.local.toml` pointing `portal.url` at the local API (`http://localhost:8080`) and
`[ekos] enabled = false`.

## Tests

```bash
python3 -m pip install pytest && python3 -m pytest
```
