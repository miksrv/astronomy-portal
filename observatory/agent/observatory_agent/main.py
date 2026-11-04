"""Agent main loop.

Every 5 s a snapshot is built locally (cheap); it is pushed to the portal every
`push_interval` seconds (60 by default), and additionally at once when an important transition
happens (roof opened/closed, weather alert, INDI up/down, job change) — at most one such extra
push per `extra_push_min_gap` seconds. Events that couldn't be delivered are kept (bounded) and
sent with the next successful push.

    python -m observatory_agent --config /etc/observatory-agent/config.toml
    python -m observatory_agent --config config.toml --once     # print one snapshot, send nothing
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import signal
import time

from . import __version__, host
from .config import Config, load
from .indi import IndiClient
from .portal import PortalClient, PortalError
from .snapshot import IMPORTANT_EVENTS, SnapshotBuilder, diff_events, utc_now

log = logging.getLogger("observatory_agent")

TICK_SECONDS = 5.0
STARTUP_GRACE_SECONDS = 4.0
MAX_PENDING_EVENTS = 200
# Events per push, oldest first: a long backlog drains over a few pushes and never blocks the snapshot
MAX_EVENTS_PER_PUSH = 50
# Ekos polls in a row without an answer before the scheduler is taken as gone
SCHEDULER_MISSES_TO_FORGET = 3


class Agent:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.indi = IndiClient(config.indi_host, config.indi_port)
        self.builder = SnapshotBuilder(config.roles)
        self.portal = PortalClient(config.portal_url, config.token)
        self.pending: list[dict] = [{"type": "agent_started", "time": utc_now(), "payload": {"version": __version__}}]
        self.previous: dict | None = None
        self.last_push = 0.0
        self.last_extra_push = 0.0
        self.profile: str | None = None
        self.scheduler: dict | None = None
        self._scheduler_misses = 0
        self._last_host_poll = 0.0

    async def _poll_host(self) -> None:
        """indiweb profile + Ekos Scheduler, at most every `ekos_interval` seconds."""
        now = time.monotonic()
        if now - self._last_host_poll < self.config.ekos_interval:
            return
        self._last_host_poll = now
        self.profile = await asyncio.to_thread(host.indiweb_profile, self.config.indiweb_url)
        if self.config.ekos_enabled:
            scheduler = await asyncio.to_thread(host.ekos_scheduler, self.config.ekos_container, self.config.ekos_user)
            # One failed DBus poll (a timeout, a slow `docker exec`) is not the end of the job:
            # keep the last known state, or the log gets a false "finished" and "started" pair
            self._scheduler_misses = 0 if scheduler is not None else self._scheduler_misses + 1
            if scheduler is not None or self._scheduler_misses >= SCHEDULER_MISSES_TO_FORGET:
                self.scheduler = scheduler

    def build(self) -> dict:
        return self.builder.build(
            self.indi.tree,
            indi_online=self.indi.connected,
            profile=self.profile,
            scheduler=self.scheduler,
            disk_free_gb=host.disk_free_gb(self.config.frames_dir),
            agent_version=__version__,
        )

    async def tick(self) -> None:
        await self._poll_host()
        snapshot = self.build()
        events = diff_events(self.previous, snapshot)
        self.previous = snapshot
        for event in events:
            log.info("event %s %s", event["type"], event.get("device") or "")
        self.pending.extend(events)
        del self.pending[:-MAX_PENDING_EVENTS]

        now = time.monotonic()
        due = now - self.last_push >= self.config.push_interval
        important = any(e["type"] in IMPORTANT_EVENTS for e in events)
        extra = important and now - self.last_extra_push >= self.config.extra_push_min_gap
        if not (due or extra):
            return

        batch = self.pending[:MAX_EVENTS_PER_PUSH]
        try:
            await asyncio.to_thread(self.portal.push_status, snapshot, batch)
        except PortalError as error:
            log.warning("push failed (%d events kept): %s", len(self.pending), error)
            self.last_push = now  # retry on the next interval, don't hammer the site
            return
        log.debug("pushed snapshot, %d events", len(batch))
        del self.pending[: len(batch)]
        self.last_push = now
        if extra and not due:
            self.last_extra_push = now

    async def run(self, stop: asyncio.Event) -> None:
        indi_task = asyncio.create_task(self.indi.run_forever(stop))
        log.info("observatory-agent %s: portal %s, INDI %s:%s", __version__, self.config.portal_url, self.config.indi_host, self.config.indi_port)
        # Let the INDI connection come up (and the server describe its devices) before the first
        # push, so a restart doesn't report "INDI offline" for a minute
        try:
            await asyncio.wait_for(stop.wait(), timeout=STARTUP_GRACE_SECONDS)
        except asyncio.TimeoutError:
            pass
        try:
            while not stop.is_set():
                try:
                    await self.tick()
                except Exception:  # never let one bad tick kill the service
                    log.exception("tick failed")
                try:
                    await asyncio.wait_for(stop.wait(), timeout=TICK_SECONDS)
                except asyncio.TimeoutError:
                    pass
        finally:
            await indi_task


async def run_once(config: Config) -> None:
    """Connects, waits for INDI to describe its properties, prints one snapshot."""
    agent = Agent(config)
    stop = asyncio.Event()
    task = asyncio.create_task(agent.indi.run_forever(stop))
    await asyncio.sleep(4)
    agent._last_host_poll = -1e9
    await agent._poll_host()
    print(json.dumps(agent.build(), indent=2, ensure_ascii=False))
    stop.set()
    await task


def main() -> None:
    parser = argparse.ArgumentParser(prog="observatory-agent", description="Report the observatory status to the portal")
    parser.add_argument("--config", default="/etc/observatory-agent/config.toml")
    parser.add_argument("--once", action="store_true", help="print one snapshot and exit (sends nothing)")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    config = load(args.config)

    if args.once:
        asyncio.run(run_once(config))
        return

    async def runner() -> None:
        stop = asyncio.Event()
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, stop.set)
        await Agent(config).run(stop)

    asyncio.run(runner())


if __name__ == "__main__":
    main()
