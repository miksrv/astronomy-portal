# Observatory

Everything needed to understand, operate and **rebuild from scratch** the remote observatory
behind this portal: the hardware, the observatory PC (`astrolab`), its INDI drivers and
KStars/Ekos setup, the power and safety rules, and the configuration files themselves.

The observatory is a small roll-off-roof building at a remote site. Nobody is on site most
of the time: it is operated over SSH and a browser-based KStars desktop, watched through an
indoor webcam.

> Everything here is anonymised on purpose: no logins, passwords, API keys, public
> addresses or site coordinates. Where a real value is needed the files use a placeholder
> (`change-me`, `example.com`, `0.0`) and the docs say where the real one comes from.

## At a glance

| Part | What |
|---|---|
| Telescope | Sky-Watcher BK2001P Newtonian, 200 mm, f = 1000 mm (f/5) |
| Mount | Sky-Watcher EQ6 (EQMod driver) |
| Main camera | ZWO ASI6200MM Pro (cooled mono, 9576 × 6388, 3.76 µm) |
| Filter wheel | ZWO EFW, 7 slots: L R G B H O S |
| Focuser | ZWO EAF |
| Guiding | SVBony 60/240 guide scope + QHY5-II mono |
| Roof | Roll-off roof on a sliding-gate motor, Arduino controller, INDI driver `indi_rollroof` |
| Weather / safety | INDI Weather Watcher reading the site weather API; INDI WatchDog |
| Power | RODOS-18 Ethernet relay (16 channels), `obs-power` script |
| Observatory PC | `astrolab`: Ubuntu 26.04, INDI 2.2, KStars 3.8 in Docker |

## Documentation

| Document | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | How the observatory PC, archive server and portal fit together; control, safety, power, frames and weather flows |
| [docs/hardware.md](docs/hardware.md) | Equipment, optical trains, roof controller wiring, power relay channel map, network layout |
| [docs/host-setup.md](docs/host-setup.md) | Step-by-step rebuild of the observatory PC: OS, INDI, indiweb, roof driver, KStars container, configs, scripts |
| [docs/indi-drivers.md](docs/indi-drivers.md) | Every INDI driver and Ekos profile: what each setting is and why it has that value |
| [docs/safety.md](docs/safety.md) | Roof/mount interlocks, the safety chain (WatchDog → park mount → close roof), hard rules |
| [docs/power.md](docs/power.md) | Power control through the relay: `obs-power`, sequences, Ekos Scheduler hooks |
| [docs/operations.md](docs/operations.md) | Day-to-day operation, troubleshooting, lost mount position recovery, open issues |

## Repository layout

```
observatory/
├── README.md                 # this file
├── docs/                     # the documents listed above
├── config/
│   ├── indi/                 # INDI driver configs → ~/.indi/ on the host
│   ├── profiles/             # indiweb + Ekos equipment profiles (SQL for sqlite3)
│   ├── kstars/               # kstarsrc excerpt (Ekos module settings)
│   ├── kstars-desktop/       # Dockerfile + compose.yaml + .env.example for the KStars web desktop
│   └── systemd/              # indiwebmanager, frames-upload units, DNS fallback
├── scripts/                  # obs-power (relay), Ekos startup/shutdown scripts, frames-upload
└── agent/                    # observatory agent (Python): status → portal
```

`agent/` — the observatory agent, a Python service on the observatory PC that reports the
device status to the portal ([agent/README.md](agent/README.md); prototype, phase 1 of
[FEAT-30](../features/observatory-agent.md)). Telescope jobs from the site come in phase 2.

## Quick restore

If the observatory PC dies, follow [docs/host-setup.md](docs/host-setup.md). In short:

1. Install Ubuntu, INDI 2.x from the `mutlaqja/ppa`, indiweb, astrometry.net + index files.
2. Build and install the roof driver from
   [indi-rollroof-controller](https://github.com/miksrv/indi-rollroof-controller).
3. Copy `config/indi/*.xml` to `~/.indi/`, set the site coordinates and the weather URL,
   fix the Arduino `/dev/serial/by-id/…` path.
4. Install `config/systemd/indiwebmanager.service`, load `config/profiles/indiweb-profile.sql`.
5. Build the KStars desktop container from `config/kstars-desktop/`, load
   `config/profiles/ekos-profile.sql`, apply `config/kstars/kstarsrc.example` settings.
6. Put `scripts/` into `~/kstars-desktop/config/scripts/`, create `rodos.env` from the example,
   install the `frames-upload` units (frames → archive server).
7. Verify every device **before** any roof or mount motion — see [docs/safety.md](docs/safety.md).
