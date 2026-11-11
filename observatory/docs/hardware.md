# Hardware

## Optics and cameras

| Device | Model | Notes |
|---|---|---|
| Main telescope | Sky-Watcher Explorer 250P | Newtonian, D = 254 mm, f = 1200 mm, f/4.7. Ekos telescope id 3 — its entry in Ekos must be updated to these values |
| Guide scope | SVBony 60 mm | f = 240 mm, f/4. Ekos telescope id 4 |
| Main camera | ZWO ASI6200MM Pro | Full frame mono, 9576 × 6388 px, 3.76 µm → ≈ 0.65″/px at 1200 mm (field ≈ 1.72° × 1.15°). Gain 150 / offset 50, RAW16, FITS. A full frame is ≈ 122 MB |
| Filter wheel | ZWO EFW, 7 positions | Slots 1–7: **L R G B H O S**. A full-frame sensor needs 36 mm / 2″ filters — test frames showed strong corner vignetting, spacing/filter size still to be checked |
| Focuser | ZWO EAF | Connected to the camera's USB hub. Max travel 15000 steps in Ekos |
| Guide camera | QHY5-II mono (`QHY CCD QHY5II-M`) | Ekos ST4 driver is set to this camera (guide pulses through its ST4 port); EQMod guide rate 0.5× |

Optical trains in Ekos:

| Train | Scope | Camera | Filter wheel | Focuser | Guider |
|---|---|---|---|---|---|
| Primary | Explorer 250P 1200@f/4.7 | ASI6200MM Pro | ZWO EFW | ZWO EAF | QHY5II-M |
| Guide | SVBony 240@f/4 | QHY5II-M | — | — | QHY5II-M |

## Mount

Sky-Watcher **EQ6** with the original motor board (firmware 0204), driven by **EQMod** over a
Prolific PL2303 USB-serial cable (`/dev/serial/by-id/usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0`).

- **Park position:** the tube lies horizontal, parallel to the roof, pointing at the
  observatory wall (azimuth ≈ 205°). This is the only position in which the roof can move:
  clearance to the roof is about 20 cm.
- Two **reed switches** (magnets on the RA and Dec axes) confirm that the mount is physically
  at the park position; they are wired to the roof controller (see below).
- EQ6 encoders are relative. If the motor board loses power, it forgets where it points.
  EQMod restores the position only if the mount was parked (from `~/.indi/ParkData.xml`).
  See [operations.md](operations.md#lost-mount-position).

## Roof

Roll-off roof driven by a **sliding-gate motor**. A short button pulse starts a full travel
(≈ 10–11 s) that **cannot be interrupted** — there is no mid-stop, so "abort" is meaningless
by design. A repeated pulse at the end position is ignored by the motor.

The motor is controlled by an **Arduino Uno** (firmware `RoofController`, Firmata-based,
commands `OPEN` / `CLOSE` / `ABORT` / `QUERY` as Firmata strings). Driver, firmware and
detailed hardware notes live in their own repository:
[miksrv/indi-rollroof-controller](https://github.com/miksrv/indi-rollroof-controller).

### Arduino pinout

| Pin | Role | Mode | Signal |
|---|---|---|---|
| D2 | relay (named `pinRelayOpen` in code, actually used for **close**) | OUTPUT, idle HIGH | active LOW, 800 ms pulse |
| D3 | relay (named `pinRelayClose` in code, actually used for **open**) | OUTPUT, idle HIGH | active LOW, 800 ms pulse |
| D4 | roof CLOSED limit switch | INPUT_PULLUP | LOW = roof fully closed |
| D5 | roof OPEN limit switch | INPUT_PULLUP | LOW = roof fully open |
| D6 | mount park reed switch, Dec | INPUT_PULLUP | LOW = Dec at park |
| D7 | mount park reed switch, RA | INPUT_PULLUP | LOW = RA at park |
| D13 | debug LED | OUTPUT | only with `#define DEBUG` |

The relay variable names are swapped in the sketch, but the wiring matches and has worked for
years — do not "fix" one without the other. An unconnected input reads HIGH (pull-up), so a
LOW reading proves the wire is present.

### `QUERY` answer

Two digits: roof state, then park state.

| Roof digit | Meaning | Park digit | Meaning |
|---|---|---|---|
| 1 | open (D5 LOW, D4 HIGH) | 0 | both axes parked |
| 2 | closed (D4 LOW, D5 HIGH) | 1 | neither axis parked |
| 3 | unknown (both or neither) | 2 | Dec not parked |
| | | 3 | RA not parked |

The firmware itself ignores `OPEN`/`CLOSE` unless D6 **and** D7 are LOW; the INDI driver adds
its own software interlock on top (see [safety.md](safety.md)).

## Power relay

**RODOS-18 DIN MGS** Ethernet relay, firmware 1.03-2025: 16 channels, 7 A / 30 V DC each, on
the observatory LAN. Channel numbers as labelled on the case (the API index is `number − 1`):

| # | Device | Who may switch it |
|---|---|---|
| 1 | Mount (EQ6) | `obs-power` |
| 2 | Camera (ASI6200) | `obs-power` |
| 3 | Focuser (EAF) | `obs-power` |
| 4 | Dew heater controller | `obs-power` |
| 7 | 12 V power supply (master) | `obs-power` |
| 8 | LED panel (inside light) | `obs-power light`, the portal's "light" button |
| 15 | Roof CLOSE button | **nobody** |
| 16 | Roof OPEN button | **nobody** |

Channels 15/16 pulse the gate motor buttons directly and bypass every interlock — see
[safety.md](safety.md). Power control details: [power.md](power.md).

## Network

- The observatory has its own subnet behind a DD-WRT router; the observatory PC and the power
  relay sit on it with static addresses.
- Nothing at the observatory should be reachable from the internet except SSH to the PC and
  (optionally) the KStars web desktop. Reach the relay's web UI through an SSH tunnel:
  `ssh -L 8081:<relay-ip>:80 astrolab`, then `http://localhost:8081`.
- The DHCP-pushed DNS server (the upstream router) ignores queries from the observatory subnet,
  so the PC uses a systemd-resolved fallback (`config/systemd/90-fallback-dns.conf`). Without it
  DNS, NTP and the weather feed fail.

## USB

All devices run at USB 2.0 (480 Mbit/s) — a full ASI6200 frame downloads in ≈ 5 s. The EAF and
the filter wheel hang off the camera's built-in hub (ports 3/4 free).
