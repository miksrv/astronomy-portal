# Power control

Equipment power is switched through the RODOS-18 Ethernet relay by the
[`obs-power`](../scripts/obs-power) script — a deliberate choice over an INDI driver: the
Ekos Scheduler calls it as its startup/shutdown script, and it can be used from a shell.

## Install

The scripts live in `~/kstars-desktop/config/scripts/` on the host, which is
`/config/scripts/` inside the KStars container (KStars runs there as uid 1000 = the host user),
so the same files work from a shell and from Ekos. See [host-setup.md](host-setup.md#8-scripts).

| File | Purpose |
|---|---|
| `obs-power` | Main script (bash). Also linked as `/usr/local/bin/obs-power` |
| `obs-power-on.sh` | Ekos Scheduler startup script → `obs-power on` |
| `obs-power-off.sh` | `obs-power off` wrapper |
| `ekos-shutdown.sh` | Ekos Scheduler shutdown script: requests the frame upload, then `obs-power off` |
| `rodos.env` | `RODOS_HOST`, `RODOS_USER`, `RODOS_PASS` (relay API login), mode 600 — never commit it; template `rodos.env.example` |
| `obs-power.log` | Log of every run (host and container write the same file) |
| `.obs-power.lock` | `flock` lock: one run at a time |

## Usage

```bash
obs-power status            # state of every managed channel (read-only)
obs-power on                # 12 V supply first, then each device, 3 s apart, then 15 s for USB
obs-power off               # each device, then the 12 V supply — only if INDI says mount + roof parked
obs-power off --force       # same, without the INDI check (manual use, when you know it's safe)
obs-power light on|off      # LED panel inside the observatory
```

Remotely: `ssh astrolab obs-power status`. Exit code 0 on success, 1 on any error (printed and
logged).

## Sequences

- **on:** #7 (12 V) → #1 mount → #2 camera → #3 focuser → #4 dew heaters
- **off:** #4 → #3 → #2 → #1 → #7

3 s between switches, so devices never power up or down at once. A channel already in the
wanted state is skipped without a pause. After each switch the script reads the relay state
back and stops at the first mismatch, leaving the rest untouched.

## Rules

- `off` (without `--force`) first reads INDI on `localhost:7624`:
  `EQMod Mount.TELESCOPE_PARK.PARK` and `Roll Roof.DOME_PARK.PARK` must both be `On`. If INDI is
  down, a property can't be read or a device isn't parked, nothing is switched off.
  **When unsure, leave the power on** — a powered, parked mount is harmless.
- Powering the mount with the roof closed is fine: EQMod `DOME_LOCKS` blocks unparking.
- Warm the camera up before `off` (Scheduler warm-up option).
- WatchDog and any emergency handling only park — they never cut power.
- Channels #15/#16 (roof buttons) are hard-blocked: see [safety.md](safety.md).

## Relay API (firmware 1.03-2025)

The vendor's PDF manual (v2.03, 2020) describes older firmware. On this one:

- Web UI: session login (SHA-256 hashed password).
- API: HTTP Basic auth, realm `api`, a separate API login set in the web UI. Keep CORS off.
- `GET /pstat.xml` → `<rl0string>`…`<rl15string>`, `1` = on. Read-only.
- `GET /rb{N}n.cgi` = on, `GET /rb{N}f.cgi` = off, reply `Success`; `N` is 0-based
  (case number − 1). `rb{N}s.cgi` (pulse) is only for the roof channels — never used.
- The script passes the password to curl through a stdin config (`-K -`), so it never shows
  up in `ps`.
- The relay must not be reachable from the internet; use an SSH tunnel for its web UI.
