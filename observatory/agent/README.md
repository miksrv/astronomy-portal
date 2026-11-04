# Observatory agent

A small Python service on the observatory PC that reports what the observatory is doing to the
portal ([FEAT-30](../../features/observatory-agent.md), phase 1 — live status). It only **reads**:
it never sends commands to INDI, never moves the mount or the roof, never switches power.

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
  connected/disconnected, job started/finished) are pushed at once — at most one extra request per
  minute — and kept until delivered if the portal is unreachable.
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
