# FEAT-30 — Observatory Agent: live status + telescope jobs from the site

**Status:** Plan and decisions agreed (2026-11-03); phase 1 (status) prototype in `observatory/agent/` + `/observatory/status` API
**Priority:** High
**Affects:** New Python service (`observatory/agent/`) + Backend (CodeIgniter 4) + Frontend (Next.js)
**Supersedes:** the ROADMAP ideas "Live observatory status on the site" and "User imaging requests → KStars/Ekos Scheduler".

---

## 1. Goal

1. The site shows **what the observatory is doing right now**: is it online, roof open/closed,
   where the telescope points, what the camera is shooting, is the weather safe.
2. Registered users **create imaging jobs on the site**; the observatory shoots them
   autonomously on clear nights and the site shows the progress and, at the end, the frames.

---

## 2. Components

```
                        ┌──────────────────────── portal (internet) ────────────────────────┐
  user's browser ─────► │  Next.js UI  ──►  CI4 API + MariaDB                               │
                        │                   observatory_status · observatory_events ·      │
                        │                   telescope_jobs · telescope_job_frames           │
                        └───────────────────────────▲───────────────────────────────────────┘
                                                    │ HTTPS, outbound only (agent token)
 ┌──────────────── observatory PC (astrolab) ───────┼──────────────────────────────────────┐
 │                                                  │                                      │
 │   observatory-agent (Python, systemd) ───────────┘                                      │
 │      │ read: INDI XML :7624        │ DBus via docker exec        │ watches ~/fits        │
 │      ▼                             ▼                             ▼                       │
 │   indiserver + drivers  ◄───── KStars/Ekos Scheduler ──────► /home/mik/fits (SSD)       │
 │   (mount, camera, roof,          (container; does ALL            │                       │
 │    weather, watchdog…)            motion and imaging)            │ frames-upload         │
 └──────────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                    ▼
                       archive server: /data/fits/incoming → observatory-pipeline → observatory-api
```

| Component | Responsibility | Never does |
|---|---|---|
| **Portal** (CI4 + UI) | Stores jobs (the *desired* state), approval, limits, the latest status snapshot, notifications | Talks to the observatory directly |
| **Agent** | Reads INDI + Ekos state, pushes snapshots, pulls jobs, builds Ekos schedule files, loads/starts/stops the Ekos Scheduler, tracks frames per job | Moves the mount/roof, switches power, decides about weather |
| **Ekos Scheduler** | Night execution: startup (power on, unpark roof + mount) → slew → solve → focus → guide → capture → shutdown (park, close, power off); waits for darkness/altitude | Knows anything about the site |
| **WatchDog + Weather Watcher + roof driver** | Safety, independent of the agent and Ekos | — |
| **frames-upload** | Moves frames to the archive server after the night (already in place) | — |
| **Pipeline / observatory-api** | Archive, analysis, frame metadata — the portal reads frames from there | — |

**Principles**
- The portal is the source of truth for **what** should be shot; the agent for **what actually
  happened** (frames on disk, Ekos states).
- The agent is an *integrator*, not a controller: the only "write" it ever does is load / start /
  stop the Ekos Scheduler. Safety lives below it and works when the agent is dead.
- All traffic is outbound from the observatory; the portal never needs a route into the LAN.
- Every exchange is idempotent and retried — a lost request never loses or duplicates a job.

---

## 3. Live status

```
INDI (push, XML stream) ──► agent: in-memory property tree
                               │ every 60 s (important transitions — roof, weather alert, job — at once,
                               │ at most one extra request per minute)
                               ▼
              POST /observatory/agent/status  {snapshot, events[]}
                               ▼
     observatory_status (1 row: latest snapshot)  +  observatory_events (log, 90 days)
                               ▼
     GET /observatory/status  ◄── UI polls every 60 s (paused in a hidden tab)
```

- **Snapshot** (~3–6 KB JSON): `agent` (version), `indi` (server up, profile), per device
  `connected` + driver/version; `mount` (RA/Dec of date and J2000, Alt/Az, parked, tracking,
  slewing, track mode, pier side, LST, GOTO target); `camera` (temperature, cooler %, exposure
  in progress + remaining, frame type, gain/offset, binning, sensor, focal length, field of view);
  `guider`; `filter` (all slots, current, moving); `focuser` (position, max, temperature);
  `roof` (open/closed/moving/unknown, mount-parked interlock);
  `weather` (safety state + the 8 parameters); `watchdog` (armed, heartbeat, triggers, shutdown order); `scheduler`
  (idle/running/paused, current job id + target, next job start); `power`
  (channels on/off — admin only); `disk` (free GB on the SSD — admin only).
- **Online** = last snapshot younger than 3 minutes (3 missed pushes). When the agent, the PC or the internet is down the
  site shows "no link since HH:MM" instead of stale values.
- **Events** are state transitions (roof opened, weather alert, device disconnected, job started…),
  shown as a short "recent activity" list and used for notifications later.
- Public view hides operational details (power, disk, paths, error texts); `telescope.manage` sees all.
- Load on the site: one small UPSERT per minute (~1440 requests a day), whether INDI runs or not;
  `GET /observatory/status` is served from cache, so visitors don't add database load.
  The interval is a config value of the agent.

---

## 4. Telescope jobs

### 4.1 What a job is

| Field | Example |
|---|---|
| Target | object from our catalog (→ RA/Dec J2000) or manual RA/Dec + name |
| Plan | `L 20×300 s`, `R/G/B 10×300 s`, `Ha 15×600 s` — filter × exposure × count; gain/offset/binning fixed by the observatory |
| Constraints | min altitude (default 30°), moon separation, valid until (deadline) |
| Priority | set by an admin (default by creation order) |

Two modes of the same form, stored the same way (`plan`):
- **Simple** — target + a preset (`LRGB 10×300 s`, `HOO 10×600 s`, `L 20×300 s`, …; presets are
  observatory settings).
- **PRO** — own rows filter × exposure × count.

A job stores only the target's name and coordinates: picked on the star map, or found by search — our objects at once, a CDS (Sesame) lookup by name in the background ([FEAT-31](objects-simbad.md)).

Limits, checked by the API (values in `observatory_settings`, editable without a deploy; admins are
not limited): **≤ 2 h total exposure per job**, **≤ 3 active jobs per user**, exposure **30–600 s**,
**≤ 100 frames per filter**, filters from the wheel only. The form shows the remaining quota and a
visibility preview (altitude tonight and over the next weeks, `astronomy-engine`).

### 4.2 Lifecycle

```
            user creates                admin                  agent pulls & accepts
  ──────────► pending ───approve──► approved ─────────────────────► queued
                │   └──reject──► rejected                             │ Ekos starts the job at night
                │                                                     ▼
                └── user cancels ─► cancelled ◄── cancel ──────── running ⇄ queued (night ends, not finished)
                                                                      │
                                         all frames captured ────────►├──► completed
                                         deadline passed / error ────►└──► expired / failed
```

- A job spans **several nights**: `running` → back to `queued` at dawn with its progress kept;
  it is `completed` when every filter has its count.
- Cancelling a `running` job takes effect at the next safe point: the agent stops the Scheduler
  (Ekos parks and closes as usual) or, if other jobs are queued, removes the job when the
  Scheduler is idle. Never a hard stop.
- E-mail to the author: approved / rejected / first frames / completed / expired.

### 4.3 Sync protocol (portal ⇄ agent)

- **Pull, full desired state.** Every 5 minutes (and right after start) the agent calls `GET /observatory/agent/jobs`, which
  returns *all* jobs the observatory should know about (`approved`, `queued`, `running`,
  `cancel_requested`) with a `version` per job. The agent reconciles against its local SQLite
  state: new → accept, changed version → update, missing/cancel → remove. No deltas to lose.
- **Push, actual state.** Every change on the observatory side is an idempotent
  `POST /observatory/agent/jobs/{id}/state` with a per-job monotonically increasing `seq`
  (`accepted`, `started`, `frame` {file, filter, exposure, time}, `night_ended`, `completed`,
  `failed` {reason}). The API ignores a `seq` it has already seen. Unsent updates wait in a local
  outbox, so a night without internet is replayed in the morning in order.
- **Ownership of fields:** the portal owns target/plan/constraints/priority/approval; the agent owns
  progress, frames and execution state. Neither side overwrites the other's fields.
- Edits of an `approved`/`queued` job by an admin bump its `version`; the agent applies them before
  the next night. A `running` job is not changed mid-night.

### 4.4 Night cycle (who starts what)

1. **Afternoon (≈ 2 h before dusk):** the agent builds tonight's schedule from all `queued` jobs:
   one Ekos sequence (`.esq`) per job with the **remaining** counts per filter, one schedule (`.esl`)
   with the targets, constraints and priorities. It loads it into the Ekos Scheduler only when the
   Scheduler is idle and nobody is using Ekos manually.
2. **Go / no-go** before starting the Scheduler (all must hold, otherwise it stays idle and the
   reason is shown on the site):
   - autonomous mode **on** — both on the site (admin switch) and locally (`jobs.enabled`);
   - INDI profile running, WatchDog armed, Weather Watcher connected and Ok, roof driver connected;
   - at least one job observable tonight above its min altitude.
3. **Ekos runs the night:** startup script (power on) → unpark roof + mount → for each job: slew,
   plate solve, autofocus, guiding, capture → when nothing is observable, dawn or weather alert:
   park mount → close roof → `ekos-shutdown.sh` (frames upload request + power off).
4. **During the night** the agent only watches: Ekos job states over DBus, new FITS files in
   `~/fits` (attributed to a job by target folder + sequence) → `frame` events.
5. **Morning:** the agent marks unfinished jobs `queued` with their progress; `frames-upload` moves
   the files to the archive server; the pipeline ingests them; the portal links the job's frames
   (by file name) to observatory-api data.

### 4.5 Priorities: what to shoot now

Every job gets a score for tonight, recomputed by the agent when it builds the schedule (and shown
to admins on the site with the reasons):

| Factor | Effect |
|---|---|
| Altitude | hours above the job's min altitude tonight, and how high it culminates — higher is better (less atmosphere) |
| Moon | separation from the Moon × Moon illumination; **broadband (L/R/G/B) is penalised hard** when the Moon is up and bright, **narrowband (Ha/OIII/SII) barely** |
| Season | objects that are leaving the sky soon (setting earlier each night) go first |
| Deadline | jobs close to "valid until" go up |
| Progress | an almost finished job goes up (finish what was started) |
| Admin | manual priority (`+N` / pin to top / hold) overrides the score |

A job is split into Ekos jobs per filter group (broadband / narrowband) with their own moon
constraints, so on a moonlit night the observatory shoots the narrowband part of a job and leaves
LRGB for a dark night. The Ekos Scheduler then runs the highest-scoring job that is observable at
that moment and switches when a better one rises.

**Why the agent counts frames itself:** Ekos' "remember job progress" counts files in the capture
folder, but `frames-upload` empties it every morning — Ekos would re-shoot everything. So the agent
always generates sequences with the remaining counts and turns that Ekos option off.

### 4.6 Safety gates in the agent

- No code path sends slew, park, roof or relay commands. Writes are limited to Scheduler
  load/start/stop over DBus.
- The agent never starts the Scheduler while weather is not Ok, WatchDog is not armed, or the roof
  driver is missing — and never fights a human: if Ekos is busy with something it didn't start,
  it waits.
- Autonomous mode is off by default and stays off until the on-site checklist
  (`observatory/docs/operations.md`) has passed.

---

### 4.7 Frames for the author

The portal integrates **observatory-api** (called server-side by the portal API with its own API key,
responses cached up to a day; never from the browser): a job's frames are matched by **observation time**
(the agent reports `DATE-OBS` + filter + exposure of each captured frame; the pipeline renames files,
so file names can't be used) within the job's nights. The author sees per frame: preview, filter,
exposure, FWHM/quality and whether it passed QC; job progress can count only frames that passed QC.

### 4.8 Calibration

A shared calibration library of the observatory, not per user job: admins run service jobs
(darks at the working camera temperatures and exposures, flats at dusk/dawn or with a panel, bias).
The pipeline already archives calibration frames under `_calibration`.

### 4.9 Notifications

No Telegram (blocked where the servers are). Two channels already in the portal:

| Event | Who | Channel |
|---|---|---|
| Job approved / rejected / first frames / completed / expired | author | e-mail (+ Web Push if subscribed) |
| Weather abort, roof not closed, mount not parked, device lost, SSD low on space | admins (`telescope.manage`) | Web Push + e-mail |
| "No link" for > 15 min while a night is planned or running | admins | Web Push + e-mail |

Agent-detected problems arrive as events with the status push and are sent at once. "No link" can't
come from the agent — a spark command `observatory:watch` on the existing hosting cron (next to
`send-email`/`send-push`) checks the age of the last snapshot. Push subscriptions already carry
`user_id`, so pushes can target admins only. Repeated alerts are throttled (one per problem until it
clears).

## 5. Failure modes

| What fails | What happens |
|---|---|
| Internet / portal down | Status shows "no link"; the night still runs from the already loaded schedule; frame events wait in the outbox; jobs created meanwhile are picked up later |
| Agent crashes | systemd restarts it; it rebuilds state from SQLite + INDI + Ekos; a running night is not affected (Ekos owns it) |
| INDI server stopped | Snapshot says "INDI offline"; no new night is started |
| KStars container down | No schedule can be loaded/started; shown on the site; safety still with WatchDog |
| Weather alert mid-night | WatchDog/Ekos park and close; the agent records `night_ended` (weather), jobs stay `queued` |
| PC power loss | Everything stops; on boot nothing starts automatically (indiweb autostart off) — a human checks the mount position first |
| Archive server unreachable | Frames stay on the SSD; frames-upload retries; SSD free space is in the admin status |

---

## 6. Data model and API (outline — details when coding)

- `observatory_status` (latest snapshot), `observatory_events` (log).
- `telescope_jobs` (target, plan JSON, constraints, priority, status, version, progress JSON,
  author, approval, timestamps), `telescope_job_frames` (job, file name, filter, exposure, time,
  later the observatory-api frame id), `telescope_job_updates` (applied `seq` per job, for
  idempotency).
- `observatory_settings` gets `autonomous_mode` (admin switch).
- Agent API (token, `Authorization: Bearer`, rate-limited): `POST /observatory/agent/status`,
  `GET /observatory/agent/jobs`, `POST /observatory/agent/jobs/{id}/state`.
- Public / user API: `GET /observatory/status`, `GET /observatory/events`,
  `POST|GET /telescope/jobs`, `GET|DELETE /telescope/jobs/{id}`.
- Admin API: `GET /telescope/jobs?status=`, `PATCH /telescope/jobs/{id}` (approve, reject, priority,
  edit), `PATCH /observatory/settings` (autonomous mode).
- New privileges `telescope.request`, `telescope.manage` → `docs/permissions.md`.

## 7. UI (outline)

- `/observatory`: status card (online badge, roof, mount, camera, weather, current job), pointing
  marker + camera FOV on `<StarMap>`, recent activity.
- `/observatory/jobs`: "New job" form (object search → coordinates, plan rows within limits,
  visibility preview), my jobs with progress per filter and a night-by-night timeline, frames when
  available. Guests get the login prompt (subscription = authentication).
- `/admin/telescope`: job queue (approve / reject / priority / edit), autonomous mode switch with
  the go/no-go checklist, full status.

---

## 8. Phases

| Phase | Scope | Risk |
|---|---|---|
| 0 | Frames on the SSD → archive server (`frames-upload`) | done in this release |
| 1 | Agent status push, status API, status card on `/observatory` | none: read-only |
| 2 | Jobs on the site (create, approve, list), agent pulls them and **loads** the schedule; a human starts the night | low: a person decides to start |
| 3 | Go/no-go + autonomous start of the Scheduler by the agent | needs the on-site checklist passed |

---

## 9. Decisions (2026-11-03)

| # | Question | Decision |
|---|---|---|
| 1 | Approval | Every job is approved by an admin |
| 2 | Limits | ≤ 2 h exposure per job, ≤ 3 active jobs per user, 30–600 s, ≤ 100 frames per filter; values in settings |
| 3 | Modes | Simple (presets) and PRO (own plan), both |
| 4 | Frames for the author | Through the observatory-api integration on the site (§4.7) |
| 5 | Agent placement | Host systemd service; Ekos over `docker exec … qdbus` |
| 6 | Calibration | Shared observatory library, admin service jobs (§4.8) |
| 7 | Priorities | Per-object score: altitude, Moon vs filter, season, deadline, progress; admin override (§4.5) |
| 8 | Notifications | Web Push + e-mail, no Telegram; "no link" from the hosting cron (§4.9) |

Status push every 60 s, job sync every 5 min (§3, §4.3).

---

## 10. Acceptance criteria (phases 1–2)

- With INDI stopped, `/observatory` shows "INDI offline" within ~1 minute and "no link" ~3 minutes after the agent stops; with INDI running it
  shows every device of the profile and the real roof/mount state.
- The agent survives INDI restarts, network loss (outbox replays in order) and its own restart.
- The agent has no code path that sends roof, park, slew or relay commands.
- An approved job appears in the Ekos Scheduler with the remaining counts, its progress on the site
  follows the real captures across nights, and it reaches `completed` (or `failed`/`expired` with a
  reason).
- `docs/permissions.md` lists `telescope.request` and `telescope.manage`.
