# Rebuilding the observatory PC

How to set up `astrolab` — the PC inside the observatory — from a blank disk. The current host
runs Ubuntu 26.04 LTS, INDI 2.2.5, indiweb, astrometry.net 0.98 and KStars 3.8.5 (in Docker).
Paths below assume the user `mik` (uid 1000); adjust if different.

**Before anything moves:** do not start the INDI server with the roof or mount drivers until
all configs are in place and you have read [safety.md](safety.md). The roof must only ever
move with the mount parked.

## 1. Operating system

1. Install Ubuntu Server LTS (amd64). The INDI PPA ships INDI 2.x for the current LTS only —
   check the PPA before choosing a release.
2. Create the user, enable SSH with key-only login, give the user passwordless `sudo` and add it
   to the `dialout` group (serial devices):
   ```bash
   sudo usermod -aG dialout,docker mik
   ```
3. Static LAN address on the observatory subnet.
4. DNS fallback (the router-pushed DNS does not answer this subnet):
   ```bash
   sudo mkdir -p /etc/systemd/resolved.conf.d
   sudo cp config/systemd/90-fallback-dns.conf /etc/systemd/resolved.conf.d/
   sudo systemctl restart systemd-resolved
   resolvectl query github.com      # must resolve
   timedatectl                      # "System clock synchronized: yes"
   ```
   Correct time matters: plate solving, scheduling and the weather safety all depend on it.

## 2. INDI

```bash
sudo add-apt-repository ppa:mutlaqja/ppa
sudo apt update
sudo apt install indi-bin libindi-dev indi-3rdparty-drivers indi-3rdparty-libs
indiserver -h 2>&1 | head -1          # sanity check
```

Drivers used: `indi_eqmod_telescope`, `indi_asi_ccd`, `indi_asi_wheel`, `indi_asi_focuser`,
`indi_qhy_ccd`, `indi_watcher_weather`, `indi_watchdog`, `indi_astrometry`, and the roof driver
`indi_rollroof` (built from source, step 4).

## 3. Plate solving

```bash
sudo apt install astrometry.net astrometry-data-4204 astrometry-data-4205 \
  astrometry-data-4206 astrometry-data-4207 astrometry-data-4208-4219
```

Index files 4107–4114 (small fields) are downloaded separately into `/usr/share/astrometry`
from data.astrometry.net. The KStars container mounts that directory read-only, so Ekos
(StellarSolver) and the INDI Astrometry driver share one set of indexes.

## 4. Roof driver

```bash
git clone https://github.com/miksrv/indi-rollroof-controller ~/indi-rollroof
cd ~/indi-rollroof
git checkout v2.1.0            # or the latest release
./indi-driver/build.sh         # installs /usr/bin/indi_rollroof + /usr/share/indi/indi_rollroof.xml
```

The driver needs INDI ≥ 2.0 (CMake stops with a clear error on 1.x). After installing,
restart indiweb so it lists "Roll Roof" under Domes. The Arduino firmware is in the same
repository; reflash it only if the controller board is replaced.

## 5. indiweb (INDI Web Manager)

```bash
pipx install indiweb            # or: pip install --user indiweb → ~/.local/bin/indi-web
sudo cp config/systemd/indiwebmanager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now indiwebmanager
curl -s localhost:8624/api/drivers | head -c 300   # must list drivers incl. "Roll Roof"
```

Then load the equipment profile:

```bash
sudo systemctl stop indiwebmanager
sqlite3 ~/.indi/profiles.db < config/profiles/indiweb-profile.sql
sudo systemctl start indiwebmanager
```

indiweb listens on `:8624`, the INDI server it starts on `:7624` (log `/tmp/indiserver.log`,
command FIFO `/tmp/indiFIFO`). Profile autostart stays **off** — the INDI server is started on
purpose (by Ekos or by hand), never on boot.

## 6. Driver configs

```bash
mkdir -p ~/.indi
cp config/indi/*.xml ~/.indi/
```

Then edit the placeholders:

| File | What to set |
|---|---|
| `EQMod Mount_config.xml` | `GEOGRAPHIC_COORD` LAT / LONG / ELEV (site) |
| `Weather Watcher_config.xml` | `GEOGRAPHIC_COORD` (site) and `WATCH_SOURCE.URL` (the weather API `…/current/text` feed) |
| `Roll Roof_config.xml` | `DEVICE_PORT` — the Arduino's real `/dev/serial/by-id/usb-Arduino…-if00` (`ls -l /dev/serial/by-id/`) |
| `ParkData.xml` | Keep only if it is a verified park position for this mount; otherwise delete and set park again |

Notes:
- Serial ports are always `/dev/serial/by-id/…` with **Auto Search off** — `/dev/ttyUSB*`
  numbering changes between boots and could swap the mount and the roof.
- Device names must match exactly (`ZWO CCD ASI6200MM Pro`, `QHY CCD QHY5II-M`, …): INDI
  stores configs per device name. A guider that came up as `QHY CCD QHY5II-M-1067db` on an
  older install got a new config file under the new name.
- Every setting is explained in [indi-drivers.md](indi-drivers.md).

## 7. KStars / Ekos web desktop

KStars runs in a Docker container (linuxserver `webtop` + `kstars-bleeding` from the INDI PPA),
reachable in a browser. INDI drivers stay on the host so they keep running if the desktop
container restarts.

```bash
sudo apt install docker.io docker-compose-v2
mkdir -p ~/kstars-desktop && cd ~/kstars-desktop
cp <repo>/observatory/config/kstars-desktop/{Dockerfile,compose.yaml} .
cp <repo>/observatory/config/kstars-desktop/.env.example .env && chmod 600 .env   # set login, password, TZ
docker compose up -d --build
```

- Host network: the desktop's HTTPS listener binds host port 80; plain HTTP stays on
  loopback only. Expose it to the internet only through a router port forward you control,
  with a strong password.
- Container user `abc` = host uid 1000, so files under `~/kstars-desktop/config` (`/config` in
  the container) belong to `mik`.
- Memory is capped (5 GB) so a runaway solver can't starve sshd and the INDI drivers.

First start, inside the web desktop:
1. Skip the wizard, set the site location (Settings → Geographic).
2. Stop the container, back up and load the Ekos profile:
   ```bash
   docker compose stop
   cd config/.local/share/kstars
   cp userdb.sqlite userdb.sqlite.bak-$(date +%Y%m%d)
   sqlite3 userdb.sqlite < <repo>/observatory/config/profiles/ekos-profile.sql
   cd ~/kstars-desktop && docker compose start
   ```
3. Apply the module settings from `config/kstars/kstarsrc.example` (GUI, or merge into
   `config/.config/kstarsrc` while the container is stopped — a running KStars overwrites it).
4. Ekos Scheduler → Observatory: startup script `/config/scripts/obs-power-on.sh`, shutdown
   script `/config/scripts/ekos-shutdown.sh` (requests the frame upload, then powers down),
   unpark/park dome + mount, camera warm-up.

## 8. Scripts

```bash
mkdir -p ~/kstars-desktop/config/scripts
cp <repo>/observatory/scripts/obs-power* ~/kstars-desktop/config/scripts/
cp <repo>/observatory/scripts/rodos.env.example ~/kstars-desktop/config/scripts/rodos.env
chmod 600 ~/kstars-desktop/config/scripts/rodos.env        # set relay IP + API login
sudo ln -s ~/kstars-desktop/config/scripts/obs-power /usr/local/bin/obs-power
obs-power status                                           # read-only check
```

Frames (see [operations.md](operations.md#frames)):

```bash
mkdir -p ~/fits                                            # Ekos CaptureDirectory, mounted into the container
cp <repo>/observatory/scripts/{frames-upload,ekos-shutdown.sh} ~/kstars-desktop/config/scripts/
sudo ln -s ~/kstars-desktop/config/scripts/frames-upload /usr/local/bin/frames-upload
sudo cp <repo>/observatory/scripts/frames-upload.env.example /etc/default/frames-upload   # DEST_HOST = ssh alias
sudo cp <repo>/observatory/config/systemd/frames-upload.{service,path,timer} /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now frames-upload.path frames-upload.timer
frames-upload --dry-run
```

The host user needs key-based ssh to the archive server (an alias in `~/.ssh/config`), and on
the server a staging directory next to the pipeline's `incoming` (same filesystem):
`mkdir -p /data/fits/upload && chgrp fits /data/fits/upload && chmod 2775 /data/fits/upload`.

## 9. Observatory agent

Reports the status to the portal (read-only). Install as described in
[agent/README.md](../agent/README.md#install-on-the-observatory-pc): code in
`/opt/observatory-agent`, config + token in `/etc/observatory-agent/`, systemd unit
`observatory-agent.service`. The token must match `observatory.agentToken` on the portal.

## 10. Verify (no motion)

1. Power up: `obs-power on` (12 V supply, then mount, camera, focuser, dew heaters).
2. `lsusb` — the camera, EFW, EAF (03c3:…), QHY guider, PL2303 and the Arduino must all be there.
3. Start the INDI profile from Ekos; every device connects; Weather Watcher shows all 8
   parameters and `SAFETY_STATUS` Ok; WatchDog shows the mount, roof and weather as active.
4. Roll Roof shows the real roof state and `TELESCOPE: PARKED` only when EQMod is parked and
   both reed switches are closed.

Only then continue with motion tests — the on-site checklist is in
[operations.md](operations.md#motion-tests).
