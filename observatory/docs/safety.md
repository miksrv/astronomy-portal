# Safety

The single most dangerous event at this observatory is **the roof moving while the telescope
is not parked**. At park the tube lies horizontal under the roof with about 20 cm clearance;
in any other position the roof hits it, and the gate motor is strong enough to wreck all the
equipment. Everything below exists to prevent that.

## Hard rules

1. **The roof moves only when the mount is parked** — in software (EQMod `PARK = On`, state Ok)
   **and** physically (both park reed switches closed). Never relax this interlock, never move
   the roof "just to test" with the mount unparked.
2. **Relay channels #15 / #16 (roof close / open buttons) are never used** by any script,
   service or test. They bypass every interlock. The roof is controlled only through the INDI
   `Roll Roof` driver.
3. **Never send a motion or park command to read a state.** To read the roof or mount state,
   read INDI properties (`indi_getprop`) or reconnect the driver.
4. **Stop the INDI server while people work on site** (`curl -X POST localhost:8624/api/server/stop`):
   WatchDog could otherwise fire a park/close sequence.
5. **Cut mount power only when the mount is parked.** A mount that loses power while unparked
   loses its position, can't be parked, and then the roof can't close.
6. Every roof or mount motion during tests is announced first, someone watches the webcam,
   and the independent remote relay / motor power is the emergency stop.
7. If it is light outside, the lens cap stays on for mount tests — EQMod has no sun avoidance.

## Interlock layers

| Layer | Blocks |
|---|---|
| Roof firmware | `OPEN`/`CLOSE` ignored unless both reed switches (D6, D7) are closed |
| Roof driver | Motion refused unless EQMod reports a settled park **and** both reeds are closed |
| EQMod `DOME_LOCKS` | Mount can't be unparked while the roof is closed |
| `obs-power` | Channel allowlist (1, 2, 3, 4, 7, 8); `off` refuses unless INDI reports mount and roof parked |
| Ekos Observatory | "Close shutter on weather alert" is **off** — it would close without parking (and be refused) |

## Safety chain (bad weather / lost client)

```
Weather Watcher: a critical parameter out of range ──► SAFETY_STATUS = Alert
                                                            │ 120 s
Ekos stops sending heartbeats for 600 s ───────────────────►│
                                                            ▼
WatchDog: PARK_MOUNT ──► (mount parked, reeds closed) ──► PARK_DOME (roof closes)
```

The Ekos Scheduler does the same at the end of a night: park mount → park dome → shutdown
script (power off).

The roof driver never waits for the mount — the order (park mount, then close roof) is the
caller's job. If the mount doesn't reach park, the roof stays open and someone has to step in.

## Known residual risks

- **Mount 12 V dropout mid-track:** reeds open, EQMod position lost → the roof cannot close
  automatically. Root fix: reliable 12 V; mitigation: lost-position recovery
  ([operations.md](operations.md#lost-mount-position)).
- **Roof moved by the power relay or the gate remote:** bypasses the interlock (the relay
  channels are never used by scripts for this reason). The roof driver (≥ 2.1.0) notices the new
  position within ~5 s, so WatchDog/Scheduler and the site see it, and a shutdown closes an
  open or half-open roof again.
- **Observatory PC or INDI server crash:** WatchDog dies with it, nothing closes the roof.
  Candidates: a hardware rain sensor wired to the roof controller, external alerting.
- **Weather feed down or stale:** Weather Watcher keeps the last values, safety status doesn't
  change. No stale-feed watchdog yet.
- No unattended imaging until power, the EAF and the full safety chain have been verified on
  real hardware.
