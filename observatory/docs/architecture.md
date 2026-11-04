# Architecture

How the observatory, the archive and the portal fit together: which machine does what and how
data moves between them. Hosts are named by role; addresses, domains and credentials are
intentionally left out.

## Machines

| Role | What runs there |
|---|---|
| **Observatory PC** (`astrolab`) | Ubuntu, INDI server + drivers, indiweb, KStars/Ekos in Docker (browser desktop), `obs-power`, `frames-upload`, the frames SSD. Later: the observatory agent |
| **Roof controller** | Arduino on USB of the observatory PC (Firmata), drives the gate motor, reads the limit and park reed switches |
| **Power relay** | 16-channel Ethernet relay on the observatory LAN |
| **Weather station + weather API** | Station at the site; the API server publishes current values, forecasts and a `current/text` feed for the INDI weather driver |
| **Archive server** | FITS archive (`/data/fits`), observatory pipeline (Docker: watcher + workers), observatory-api |
| **Portal** | This repository: Next.js frontend on a VPS, CodeIgniter 4 API + MariaDB on PHP hosting |

## Overview

```
                                   ┌───────────────────────────── observatory site ─────────────────────────────┐
                                   │                                                                            │
  operator ──ssh / browser──────►  │  Observatory PC                                                            │
                                   │  ┌──────────────────────┐  INDI :7624   ┌──────────────────────────────┐   │
                                   │  │ KStars / Ekos        │◄─────────────►│ indiserver (via indiweb)     │   │
                                   │  │ (Docker, web desktop)│               │  EQMod ── USB-serial ── mount │   │
                                   │  │ Scheduler, capture,  │               │  ZWO CCD/EFW/EAF ─ USB ─ cam  │   │
                                   │  │ focus, guide, align  │               │  QHY ── USB ── guide camera   │   │
                                   │  └─────────┬────────────┘               │  Roll Roof ── USB ── Arduino ─┼──►│ roof motor, switches
                                   │            │ frames                     │  Weather Watcher ─────────────┼───┼──► weather API (HTTPS)
                                   │            ▼                            │  WatchDog                     │   │
                                   │  /home/mik/fits (SSD)                   └──────────────────────────────┘   │
                                   │            │ frames-upload (rsync/ssh)                                     │
                                   │  obs-power ┼──── HTTP (LAN) ────► power relay ──► 12 V, mount, camera…     │
                                   └────────────┼───────────────────────────────────────────────────────────────┘
                                                ▼
                         Archive server: /data/fits/upload ──mv──► /data/fits/incoming
                                                                        │ watcher
                                                                        ▼
                                                          observatory pipeline ──► /data/fits/archive
                                                                        │
                                                                        ▼
                                                                  observatory-api
                                                                        │ server-side, API key
                                                                        ▼
  visitors ──► Portal frontend ──► Portal API ◄── weather API (current, forecast, history)
                                       ▲
                                       └── webcam snapshots
```

## Flows

### Control (night)

Ekos (in the container) is the only client that commands the hardware: it talks to the INDI
server on the same host (host networking), and the drivers talk to the devices over USB. The
Ekos Scheduler runs a night: startup script (`obs-power on`) → unpark roof and mount → slew,
plate solve, autofocus, guide, capture → park mount → close roof → shutdown script
(`ekos-shutdown.sh`: frames upload request + `obs-power off`).

### Safety

Independent of Ekos: Weather Watcher reads the weather feed every minute and raises an alert on
rain, wind, gusts, clouds or forecast; WatchDog parks the mount and then the roof on a weather
alert (after 120 s) or when Ekos stops sending heartbeats (600 s). The roof driver and the roof
firmware refuse any motion unless the mount is parked in software and on both reed switches.
Details: [safety.md](safety.md).

### Power

`obs-power` (shell or Ekos startup/shutdown) switches the relay channels over the LAN in a fixed
order, never the roof channels, and powers down only when INDI reports mount and roof parked.
Details: [power.md](power.md).

### Frames

Ekos saves frames to the SSD (`/home/mik/fits`, bind-mounted into the container). After the night
`frames-upload` moves them to the archive server's staging directory and renames them into the
pipeline's `incoming` directory; the pipeline analyses and archives them, observatory-api serves
the results, and the portal reads object statistics and frames from it server-side.
Details: [operations.md](operations.md#frames).

### Weather

The weather station feeds the weather API. Two consumers: the INDI Weather Watcher (safety, via
the text feed) and the portal (dashboard: current values, forecast, history).

### Access

Operators reach the observatory PC over SSH (key-only) and the KStars desktop in a browser;
indiweb and the relay's web UI only through SSH tunnels. The observatory has no inbound
connection from the portal.

## Observatory agent (prototype)

```
Observatory PC: agent ──reads──► INDI (:7624), Ekos Scheduler (DBus), ~/fits
                  │
                  │ HTTPS, outbound only, agent token
                  ├──► every 60 s:  POST status snapshot  ──► Portal API ──► /observatory status card
                  └──► every 5 min: GET jobs / POST job progress ◄──► telescope jobs created on the site
```

Phase 1 (status) is implemented in [`../agent/`](../agent/README.md); the job part comes next.
The agent never moves hardware; in phase 2 it loads and starts Ekos Scheduler runs built from the
jobs on the site and reports what was captured. Full plan:
[FEAT-30](../../features/observatory-agent.md).
