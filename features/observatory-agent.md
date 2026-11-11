# FEAT-30 — Observatory Agent: live status + telescope jobs from the site

**Status:** Plan and decisions agreed (2026-11-03); autopilot / supernova patrol added (2026-11-04, §4.10); phase 1 (status) prototype in `observatory/agent/` + `/observatory/status` API
**Priority:** High
**Affects:** New Python service (`observatory/agent/`) + Backend (CodeIgniter 4) + Frontend (Next.js)
**Supersedes:** the ROADMAP ideas "Live observatory status on the site" and "User imaging requests → KStars/Ekos Scheduler".

---

## 1. Goal

1. The site shows **what the observatory is doing right now**: is it online, roof open/closed,
   where the telescope points, what the camera is shooting, is the weather safe.
2. Registered users **create imaging jobs on the site**; the observatory shoots them
   autonomously on clear nights and the site shows the progress and, at the end, the frames.
3. **Every clear night has a plan, even with an empty queue.** There are only ~80–95 clear nights
   a year at the site, so the telescope must never stand idle because nobody added a job: whatever
   time the jobs leave free goes to the **supernova patrol** (§4.10).

---

## 2. Components

```
                        ┌──────────────────────── portal (internet) ────────────────────────┐
  user's browser ─────► │  Next.js UI  ──►  CI4 API + MariaDB                               │
                        │                   observatory_status · observatory_events ·      │
                        │                   telescope_jobs · telescope_job_updates          │
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
                               │ every 60 s (`push_interval`); important transitions — roof, weather
                               │ alert, job — early, but never two pushes within `min_push_gap` (60 s)
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
| Constraints | min altitude (default 30°, never below the 15° floor — §4.11), moon separation, valid until (optional deadline) |
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
- **A job has no date.** It waits in `queued` for as long as it takes: cloudy nights cost nothing,
  because the agent rebuilds the schedule every afternoon from *all* queued jobs (§4.4). On the
  first clear night when the target is observable it is shot, ahead of the patrol (§4.5). The only
  date is the optional "valid until". If the target is not observable at all in the coming weeks
  (wrong season, never above its min altitude) the form says so when the job is created.
- Cancelling a `running` job takes effect at the next safe point: the agent stops the Scheduler
  (Ekos parks and closes as usual) or, if other jobs are queued, removes the job when the
  Scheduler is idle. Never a hard stop.
- Only a `pending` job is cancelled (or deleted) at once. From `approved` on the agent may have the
  job — it pulls an approved job at once and may load it into Ekos before its `accepted` reaches
  the site — so a cancel is a request the agent confirms, and a manager deletes such a job only
  after it is final. While Ekos can't be read the agent waits with the confirmation, unless Ekos
  stays unreadable for 15 min (KStars down) or the agent has no Ekos access at all.
- Expiry and the end of a patrol night follow the date, not the agent: the agent's pull and the
  site's job reads (at most once a minute) both run them, so a PC that is off for weeks never
  leaves stale active jobs counting against their authors' limits.
- E-mail to the author: approved / rejected / first frames / completed / expired; it links to the
  job's own page.

### 4.3 Sync protocol (portal ⇄ agent)

- **Pull, full desired state.** Every 5 minutes (and right after start) the agent calls
  `GET /observatory/agent/jobs`, which returns *all* jobs the observatory should know about
  (`approved`, `queued`, `running`; `cancelRequested` flag) with `version`, `lastSeq`, `progress`
  and `lastFrameAt` per job, plus the settings the agent needs (altitude floor, filters, autonomous
  mode, patrol). Before answering, the portal expires `approved`/`queued` jobs past "valid until" —
  "valid until X" includes the night that starts on the evening of X (compared with the current
  night, local noon → noon); a `running` one finishes its night first. The agent reconciles against its local SQLite state: new → accept,
  changed version → update, missing → remove. No deltas to lose; a lost local database is rebuilt
  from `lastSeq` + `progress`.
- **Push, actual state, in batches.** Every change on the observatory side is an update
  `{jobId, seq, type, time, payload}` with a per-job `seq` (1, 2, 3 …) kept in a local outbox and
  sent in order with `POST /observatory/agent/updates` (a whole night in one or two requests). Per
  job: `seq ≤ lastSeq` → a duplicate, acknowledged and not applied again; `seq = lastSeq + 1` →
  applied in a transaction; a gap → the batch stops there and the answer carries `lastSeq`, the
  agent resends in order.
- **Types:** `accepted` (approved → queued), `started` (queued → running), `progress`
  {progress: {filter: count}, frameTime} — **absolute** counts, so a repeat never double-counts —,
  `night_ended` {reason} (running → queued), `completed`, `failed` {reason}, `cancelled` (only after
  a cancel request). A transition that doesn't fit the job's current status (e.g. `accepted` for a
  job cancelled meanwhile) still consumes its `seq` and is logged as ignored — the outbox must never
  get stuck on it. Progress is stored in any status, final ones included (a late frame).
- **No frames in the portal database.** Frames live in observatory-api (§4.7); a job keeps only
  the counts per filter and the window of its frames (`first_frame_at`/`last_frame_at`).
- **Ownership of fields:** the portal owns target/plan/constraints/priority/approval; the agent owns
  progress and execution state. Neither side overwrites the other's fields.
- Edits of an `approved`/`queued` job by an admin bump its `version`; the agent applies them before
  the next night. A `running` job is not changed mid-night.

### 4.4 Night cycle (who starts what)

1. **Afternoon (≈ 2 h before dusk):** the agent builds tonight's schedule from all `queued` jobs
   **plus the patrol targets due tonight** (§4.10): one Ekos sequence (`.esq`) per job with the
   **remaining** counts per filter, one schedule (`.esl`) with the targets, constraints and
   priorities. It loads it into the Ekos Scheduler only when the Scheduler is idle and nobody is
   using Ekos manually, and pushes the plan to the portal ("tonight" on `/observatory`).
2. **Go / no-go** before starting the Scheduler (all must hold, otherwise it stays idle and the
   reason is shown on the site):
   - autonomous mode **on** — both on the site (admin switch) and locally (`jobs.enabled`);
   - INDI profile running, WatchDog armed, Weather Watcher connected and Ok, roof driver connected;
   - at least one job or patrol target observable tonight above its min altitude.
3. **Ekos runs the night:** startup script (power on) → unpark roof + mount → for each job: slew,
   plate solve, autofocus, guiding, capture → when nothing is observable, dawn or weather alert:
   park mount → close roof → `ekos-shutdown.sh` (frames upload request + power off).
4. **During the night** the agent only watches: Ekos job states over DBus, new FITS files →
   `progress` updates. Every sequence the agent writes saves into its own folder —
   `~/fits/jobs/<job id>/<target>/Light/<filter>/…`, `~/fits/patrol/<target id>/…` — so a frame is
   attributed by its path, never by the target name.
5. **Morning:** the agent marks unfinished jobs `queued` with their progress; `frames-upload` moves
   the files to the archive server; the pipeline ingests them; the site shows the job's frames from
   observatory-api (§4.7).

### 4.5 Priorities: what to shoot now

**Two strict tiers:** jobs always rank above the patrol. The patrol never takes time from a job
that is observable; it fills the gaps — before a job's target rises, after it sets, while the Moon
blocks its broadband part, or the whole night when the queue is empty. A patrol visit is short
(~10 min, §4.10), so when a job becomes observable it waits at most one visit. (To verify: how the
Ekos greedy scheduler switches between jobs — between Ekos jobs is enough for us, no mid-sequence
preemption needed.)

Within the jobs tier every job gets a score for tonight, recomputed by the agent when it builds
the schedule (and shown to admins on the site with the reasons):

| Factor | Effect |
|---|---|
| Altitude | hours above the job's min altitude tonight, and how high it culminates — higher is better (less atmosphere) |
| Moon | separation from the Moon × Moon illumination; **broadband (L/R/G/B) is penalised hard** when the Moon is up and bright, **narrowband (Ha/OIII/SII) barely** |
| Season | objects that are leaving the sky soon (setting earlier each night) go first |
| Deadline | jobs close to "valid until" go up |
| Progress | an almost finished job goes up (finish what was started) |
| Admin | manual priority (`+N` / pin to top / pause) overrides the score; a paused job (`held`, the site's status "Приостановлено" — only approved/queued, never one being shot) is left out of the plan until resumed |

A job is split into Ekos jobs per filter group (broadband / narrowband) with their own moon
constraints, so on a moonlit night the observatory shoots the narrowband part of a job and leaves
LRGB for a dark night. The Ekos Scheduler then runs the highest-scoring job that is observable at
that moment and switches when a better one rises.

**Why the agent counts frames itself:** Ekos' "remember job progress" counts files in the capture
folder, but `frames-upload` empties it every morning — Ekos would re-shoot everything. So the agent
always generates sequences with the remaining counts and turns that Ekos option off.

### 4.6 Safety gates in the agent

- No code path sends slew, park, roof or relay commands. In phase 2 the only DBus write is
  `loadScheduler` (allow-list in `observatory/agent/observatory_agent/ekos.py`, checked by a test);
  start/stop come with autonomous mode (phase 3). Starting the Scheduler runs the observatory
  startup queue (`observatory_startup.json`: roof unpark → mount unpark).
- `loadScheduler` replaces every job and does not check the Scheduler's state: the agent loads only
  into an idle Scheduler whose jobs are all its own (sequence in its folder), only with the filter
  wheel's names known (Ekos silently maps an unknown filter to slot 1).
- Generated files (KStars 3.8.5 format, checked against its sources 2026-11-05) never carry
  `StartupProcedure`/`ShutdownProcedure`/`ErrorHandlingStrategy` (loading them overwrites global
  Ekos options), always name the optical train (an unknown one opens a modal dialog that blocks
  the DBus call) and the full sensor frame (W/H 0 keeps the camera's subframe). Job steps: Track,
  Focus, Align, Guide — Focus stays even while the EAF is being repaired (a warning in the plan).
- The agent never starts the Scheduler while weather is not Ok, WatchDog is not armed, or the roof
  driver is missing — and never fights a human: if Ekos is busy with something it didn't start,
  it waits.
- Autonomous mode is off by default and stays off until the on-site checklist
  (`observatory/docs/operations.md`) has passed.

---

### 4.7 Frames for the author

The portal integrates **observatory-api** (called server-side by the portal API with its own API key,
responses cached up to a day; never from the browser). **The portal database stores no frames**
(decision #18): a job keeps the counts per filter and the window of its frames
(`first_frame_at`…`last_frame_at`), and the site asks observatory-api for the frames of the job's
target in that window (the pipeline renames files, so file names can't be used). The author sees per
frame: preview, filter, exposure, FWHM/quality and whether it passed QC; job progress can count only
frames that passed QC.

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
| **Night ready** (phase 2 only): at dusk, forecast clear, plan loaded, Scheduler not started — "tonight: M101 (job, 6/15 h) + 74 patrol galaxies", one tap to the admin page with the start button | admins | Web Push |
| "No link" for > 15 min while a night is planned or running | admins | Web Push + e-mail |

Agent-detected problems arrive as events with the status push and are sent at once. "No link" can't
come from the agent — a spark command `observatory:watch` on the existing hosting cron (next to
`send-email`/`send-push`) checks the age of the last snapshot. Push subscriptions already carry
`user_id`, so pushes can target admins only. Repeated alerts are throttled (one per problem until it
clears).

### 4.10 Autopilot: supernova patrol when the queue is empty

**Why.** Deciding *what to shoot tonight* is the bottleneck: a night with no job added is a lost
night, and there are only ~80–95 clear nights a year. So the observatory always has a default
plan. Roughly half of the observing goals are artistic imaging and half are hunting new objects
(supernovae, novae); artistic imaging stays **manual** — it comes only from jobs (there is no
automatic "art backlog"), the patrol is **automatic**. The 50/50 split is a loose guideline, not
an enforced rule: the site may show the share of time jobs vs patrol over the last 30 days, the
planner does not balance it.

**What the patrol is.** A list of galaxies (`patrol_targets`), each re-imaged every few nights. A
visit is a short series; finding the supernova (compare with a reference frame, check against TNS)
is the job of observatory-pipeline, not of the planner — the planner only guarantees regular frames.

**A patrol night is a job** (decision #23). The agent plans the patrol by itself and reports every
visit to the portal (`POST /observatory/agent/patrol/visits`) — while it is shot too, then once
more when it is over (target + first-frame time is the visit's key, the larger count wins). The
portal turns the visits into **one job per night** (`telescope_jobs.source = patrol`, `night`,
`App\Libraries\PatrolNights`):
- it appears with the night's **first reported visit** — a cloudy night, or one whose plan never
  started, leaves nothing; the plan files of such nights are pruned by the agent (7 nights kept);
- it is `running` while its night lasts and `completed` after the night's dawn (nautical, from the
  agent's plan; or once the next night began);
- it counts galaxies shot of the planned ones (`visits_done` / `visits_planned`, the planned count
  never shrinks — a target already shot drops out of later plans) and the frames (`progress.L`);
  its page lists the galaxies in the order they were shot;
- it is never in the agent's desired state, and nobody changes, pauses, cancels or deletes it on
  the site. In the queue it ranks after the visitors' jobs of its rank.

**Every visit is focused and guided.** A frame the pipeline rejects (soft focus, trailed stars) is
telescope time thrown away, so quality comes before the number of galaxies per hour. The overhead
is paid per visit, so each visit takes enough exposure to be worth it:

| Step | Time | How it is kept short |
|---|---|---|
| Slew | 20–60 s | the agent orders targets along a path — neighbours on the sky, setting (west) first |
| Plate solve + correction | 15–30 s | one solve after the slew, binned, offline index |
| Autofocus | ≈ 2–4 min | **every target** (Ekos job step "Focus"); binned focus frames, short exposures, tuned step count — the EAF is being repaired |
| Guiding | ≈ 30–60 s | **every target** (job step "Guide"); calibrate once per night and reuse the calibration after slews (Ekos guide option), so a visit only pays for star selection + settle |
| Exposure | 5 × 60 s L, bin 2 | ≥ 3 frames so a satellite trail or a cosmic ray never looks like a new star; 5 to make the overhead worth paying |

≈ **9–10 min per visit → ~6 galaxies per hour**, about half the time on the sky. Storage at bin 2 is
≈ 30 MB per frame, ≈ 9 GB for 60 visits — fine for the SSD and frames-upload.

The pipeline's FWHM/QC statistics of the patrol frames show later whether per-target focus is really
needed or whether the Ekos options "refocus on HFR growth / temperature change / after a meridian
flip" keep the frames just as sharp — then the visit gets shorter. Start with full focus + guide.

**Reach.** 250 mm f/4.7, 5 × 60 s stacked: roughly mag 19 on a dark night, less with the Moon.
Supernovae in galaxies within ~40 Mpc peak at mag 12–16, so the margin is comfortable; the patrol
runs on moonlit nights too, just shallower.

**Recommended size (start):**
- **~100–120 galaxies**: major axis ≥ 2′ (smaller ones gain nothing from our 0.65″/px), B ≤ 12.5 or
  distance ≤ ~30 Mpc (the brightest, nearest — the best chance of a supernova we can see),
  culminating ≥ 30° at the site; plus **M31 and M33** for novae (M31 needs ~2–3 fields with our
  1.7° × 1.15° frame). Seeded once from SIMBAD by a spark command (`patrol:seed`, reusing the
  FEAT-31 SIMBAD client), then edited by admins (enable/disable, add).
- In any season about half are observable → **~50–60 candidates a night**.
- **Cadence: every 5–7 calendar days.** A supernova stays bright for weeks, so a run of cloudy
  nights loses nothing: the target's priority just keeps growing with the days since its last
  visit. A long winter night (10–12 h dark, ~60–70 visits) covers every observable galaxy; a
  night shared with jobs covers the most overdue ones. The list grows once the real visit time is
  known.

**Planning the patrol part of the night** (agent, every afternoon):
1. Candidates = enabled targets observable tonight above `max(15° floor, 25°)` — the patrol accepts
   lower altitude than art, a visit is about *seeing* a new star, not about a pretty frame.
2. Score = days since last visit (main factor) + altitude/airmass + Moon separation.
3. Fill the dark time the jobs leave free, then order the chosen visits along a path (west to east,
   neighbours together) and write them into the `.esl` below every job (lower Ekos priority).
   If Ekos ignores our order between equal priorities, use strictly decreasing priorities.
4. Darkness: jobs with broadband filters need astronomical night; narrowband jobs and the patrol
   also run in nautical darkness (sun < −12°) — at the site's latitude there is no astronomical
   night around midsummer, so in summer the patrol is (with narrowband jobs) the only work.

**Reporting.** Frames go to `~/fits/patrol/<target id>/…`; the agent sends a `patrol_visit` event
(target, frames, time) → `patrol_targets.last_visit_at`, visit count. Frames reach observatory-api
like any other, so the object pages show them too.

**Public.** Everyone sees "Tonight" on `/observatory`: planned jobs (target + "job") and the
patrol (number of galaxies, then the current one) — and during the night what the telescope is
shooting right now. A job shows its author with avatar and full name (decision of 2026-11-06: a job is a public
credit, unlike a comment).

### 4.11 Altitude floor: 15°, enforced in Ekos too

The mount/site cannot image below **15°**. The floor is enforced in three independent layers, so a
mistake in one never sends the telescope lower:

1. **Ekos Mount module — altitude limits**, min 15°: Ekos refuses to slew/track below it, for
   every source of commands, including manual use. Saved in the Ekos profile/config on astrolab
   (exact option names to check in the installed KStars version).
2. **KStars artificial horizon** from the by-eye mask (trees, buildings): minimum altitude per
   azimuth in 8 directions (N, NE, … NW), measured during the on-site visit; never below 15°.
   Every Ekos job the agent writes has "enforce artificial horizon" on.
3. **The agent and the portal:** every generated Ekos job has `altitude > max(15°, job min)`; the
   job form does not accept a min altitude below the floor (setting `altitude_floor`, default 15);
   the planner never counts time below it.

For artistic jobs 15° is only the floor — the default min altitude stays 30° (airmass at 15° is
≈ 3.8), and the score prefers targets near culmination (§4.5).

## 5. Failure modes

| What fails | What happens |
|---|---|
| Internet / portal down | Status shows "no link"; the night still runs from the already loaded schedule; job updates wait in the outbox; jobs created meanwhile are picked up later |
| Agent crashes | systemd restarts it; it rebuilds state from SQLite + INDI + Ekos; a running night is not affected (Ekos owns it) |
| INDI server stopped | Snapshot says "INDI offline"; no new night is started |
| KStars container down | No schedule can be loaded/started; shown on the site; safety still with WatchDog |
| Weather alert mid-night | WatchDog/Ekos park and close; the agent records `night_ended` (weather), jobs stay `queued` |
| PC power loss / PC off for days | Nothing is lost: on boot indiweb (profile autostart), the KStars container and the agent come back by themselves; the agent resumes from its SQLite state, pulls the jobs (overdue ones were expired by the portal), sends what waited in its outbox, puts a job left `running` back to `queued` in daylight, and builds the next plan. Nothing moves: the Scheduler is never started by the agent, and the equipment stays unpowered until a night starts. Ekos itself must be connected (KStars GUI) before a night. After an abrupt power loss mid-night (roof/mount maybe not parked) a human checks the mount and roof position before the next night |
| Archive server unreachable | Frames stay on the SSD; frames-upload retries; SSD free space is in the admin status |

---

## 6. Data model and API (outline — details when coding)

- `observatory_status` (latest snapshot), `observatory_events` (log).
- `telescope_jobs` (target, plan JSON, constraints, priority, status, version, progress JSON,
  author, approval, timestamps, the frames' time window — no frames table, decision #18),
  `telescope_job_updates` (every applied `seq` per job: idempotency + the job's timeline).
- `patrol_targets` (name, RA/Dec, size, magnitude, enabled, cadence days, last visit, visit
  count), `observatory_night_plans` (the plan the agent pushes for tonight, shown publicly).
- `observatory_settings` gets `autonomous_mode` (admin switch), `altitude_floor` (15),
  `patrol_enabled`, patrol defaults (exposure, count, binning, cadence).
- Agent API also: `GET /observatory/agent/patrol` (targets, synced like jobs),
  `POST /observatory/agent/patrol/visits` (batch, unique per target + time),
  `POST /observatory/agent/plan` (tonight's plan, upsert per night).
- Agent API (token, `Authorization: Bearer`, rate-limited): `POST /observatory/agent/status`,
  `GET /observatory/agent/jobs`, `POST /observatory/agent/updates` (batch, §4.3).
- Public / user API: `GET /observatory/status`, `GET /observatory/events`, `GET /telescope/config`
  (filters, presets, limits), `POST|GET /telescope/jobs`, `GET|DELETE /telescope/jobs/{id}`.
- Admin API: `GET /telescope/jobs?all=1&status=`, `POST /telescope/jobs/{id}/approve|reject`,
  `PATCH /telescope/jobs/{id}` (priority, pin, hold, edit — with the `version` the admin saw, 409 when
  stale), `PATCH /observatory/settings` (autonomous mode).
- New privilege `telescope.manage` → `docs/permissions.md`; creating a job needs only `isAuth` (decision #17).

## 7. UI (outline)

- `/observatory`: status card (online badge, roof, mount, camera, weather, current job), pointing
  marker + camera FOV on `<StarMap>`, recent activity, **"Очередь телескопа"** — the next two jobs
  in queue order, one full-width row each (target + coordinates, frames × exposure per filter,
  total, status and progress).
- `/observatory/jobs`: every job — the **queue** in the order the observatory shoots it (running,
  then pinned / priority / oldest, held, pending), numbered, then the **finished** ones; "Все /
  Мои" for a signed-in visitor; "Отправить задание" in the header (a guest gets the login dialog —
  subscription = authentication). No tonight's-plan block and no target map on the list (decision
  of 2026-11-10: the queue is what people think in).
- `/observatory/jobs/new`: the "New job" form (object search → coordinates, plan rows within
  limits, visibility preview); after sending, the new job's page.
- `/observatory/jobs/:id`: one job — target facts, the target on `<StarMap>`, tonight's visibility,
  the plan per filter with the frames captured, the history; the author's cancel and every
  manager action (approve / reject / pin / pause–resume / priority / cancel / delete) in the header's "⋯"
  menu. Frames from observatory-api later.
- Still open (not built): autonomous mode switch with the go/no-go checklist, full status, the
  agent's plan with the reasons, patrol list (enable / disable / add, last visit per galaxy) — the
  agent's report is served (`GET /telescope/tonight`, `report` for managers) but not shown.

---

## 8. Phases

| Phase | Scope | Risk |
|---|---|---|
| 0 | Frames on the SSD → archive server (`frames-upload`) | done in this release |
| 1 | Agent status push, status API, status card on `/observatory` | none: read-only |
| 2 | Jobs on the site (create, approve, list), patrol list + tonight's plan, agent pulls them and **loads** the schedule; "night ready" push, a human starts the night | low: a person decides to start |
| 3 | Go/no-go + autonomous start of the Scheduler by the agent — from here a clear night runs with nobody involved | needs the on-site checklist passed (incl. the horizon mask and the altitude limits, §4.11) |

**Open task — Ekos after a reboot (needed before phase 3, nice to have in phase 2).** After the PC
boots, indiweb starts the INDI drivers by itself (profile autostart), but **Ekos stays idle**
(`/KStars/Ekos` `ekosStatus`/`indiStatus` = 0, checked 2026-11-05): someone opens the KStars web
desktop and presses Start in Ekos. Until then the driver configs Ekos applies (WatchDog triggers,
the camera's SCOPE_INFO) are not loaded and no schedule can run. KStars 3.8.5 has no "start Ekos
on launch" option, but its DBus does: `/KStars/Ekos` `setProfile("AstroLab")` + `start()` (the Ekos
profile has autoconnect on, so the devices connect). Plan: a separate one-shot host unit
(`ekos-autostart.service`, after the KStars container, waits for the `org.kde.kstars` bus name,
then those two calls and a check of `ekosStatus`), **not** the agent — the agent keeps its
one-method allow-list. Starting Ekos connects drivers only, it moves nothing (EQMod stays parked,
the roof driver only reports); with Ekos connected WatchDog gets its real config, which makes an
unattended PC safer, not less. To verify on site before relying on it: devices powered *after*
Ekos connected are not connected automatically (autoconnect happens once, at driver start).

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

**Added 2026-11-04 (autopilot):**

| # | Question | Decision |
|---|---|---|
| 9 | Empty queue | Automatic supernova/nova patrol fills every free dark hour (§4.10); no automatic art backlog — art only from jobs |
| 10 | 50/50 art vs hunting | A loose guideline, not enforced by the planner |
| 11 | Jobs vs patrol | Strict tiers: an observable job always goes before the patrol; a dateless job waits through cloudy nights and runs on the first clear night it is observable |
| 12 | Altitude | 15° floor in Ekos (mount limits + artificial horizon from a by-eye mask) and in the agent/form (§4.11) |
| 13 | Patrol visit | Autofocus + guiding on every target (rejected frames waste more than the overhead); 5 × 60 s L bin 2, ≈ 9–10 min per visit |
| 14 | Patrol size | Start with ~100–120 galaxies + M31/M33, revisit every 5–7 days; grow when the real visit time is known |
| 15 | Visibility | Tonight's plan and the current target are public on `/observatory`, with the job author (avatar + full name) |

**Added 2026-11-05 (start of 4.17.0):**

| # | Question | Decision |
|---|---|---|
| 16 | Admins' own jobs | A job created by a `telescope.manage` holder is approved at once (still listed in the queue); decision #1 stays for everyone else |
| 17 | Who may create jobs | Any authenticated user (`isAuth`), no separate privilege — spam is bounded by the 3-active-jobs limit and the approval; only `telescope.manage` is new |
| 18 | Frames | Not stored in the portal: they live in observatory-api, the site asks it for a job's frames by target + the job's frame window; a job keeps counts per filter (absolute, reported by the agent) |
| 19 | Agent | One daemon: the jobs are part of the existing `observatory-agent` service (same token, config, DBus access), off unless `[jobs] enabled`; loading into Ekos is a second switch (`load_into_ekos`), off until the generated files were checked by eye |
| 20 | Focus step | Every job and patrol visit has Focus (with Track, Align, Guide); the missing EAF is a mechanical fault being repaired, so the agent warns in the plan instead of dropping the step |
| 21 | Job pages | `/observatory/jobs` is public (the queue in shooting order + the finished jobs, one row per job); `/observatory/jobs/:id` has the map, visibility, plan, history and — in the "⋯" menu — the author's and managers' actions; `/observatory/jobs/new` the form; writes need a session; no admin page; `/observatory` shows the next two jobs (redesign of 2026-11-10). A job's author is shown with the **full name** + avatar (a job is a public credit; comments keep "FirstName L.") |
| 22 | Agent texts | The agent sends no human text to the site: the plan's reasons and warnings, the Ekos load state and the `night_ended` reason are codes with their numbers/names (`{"code": "not-observable", "group": "bb", "minutes": 20}`), translated on the site (`noticeText()` in `client/components/pages/observatory/telescope-jobs/utils.ts`); an unknown code is shown as is |
| 23 | Patrol as jobs | Whatever the telescope shoots is a job on the site, made on the site or by the agent (user, 2026-11-10): one patrol job per night, made by the night's first reported visit — never a job per galaxy (≈ 30–55 a winter night) or one endless job; nights without frames make nothing (§4.10) |

---

## 10. Acceptance criteria (phases 1–2)

- With INDI stopped, `/observatory` shows "INDI offline" within ~1 minute and "no link" ~3 minutes after the agent stops; with INDI running it
  shows every device of the profile and the real roof/mount state.
- The agent survives INDI restarts, network loss (outbox replays in order) and its own restart.
- The agent has no code path that sends roof, park, slew or relay commands.
- An approved job appears in the Ekos Scheduler with the remaining counts, its progress on the site
  follows the real captures across nights, and it reaches `completed` (or `failed`/`expired` with a
  reason).
- With an empty queue the loaded schedule contains patrol visits for every free dark hour; with a
  queued job observable tonight, the job is before the patrol in the schedule. A job created
  before several cloudy nights is in the schedule of the first clear night it is observable.
- No generated Ekos job can run below 15°, and Ekos itself refuses a slew below 15°.
- `/observatory` shows tonight's plan to guests.
- `docs/permissions.md` lists `telescope.manage` and the job endpoints open to any authenticated user.
