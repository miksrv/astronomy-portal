"""The agent never pushes twice within `min_push_gap`; important events only bring a push forward."""

import asyncio

from observatory_agent import main
from observatory_agent.config import Config


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def monotonic(self) -> float:
        return self.now


def make_agent(monkeypatch, clock, push_interval=300.0):
    agent = main.Agent(Config(portal_url="http://portal.test", token="t", push_interval=push_interval, ekos_enabled=False))
    pushes: list[float] = []
    agent.portal.push_status = lambda snapshot, batch: pushes.append(clock.now)
    monkeypatch.setattr(agent, "_poll_host", lambda: asyncio.sleep(0))
    monkeypatch.setattr(main.time, "monotonic", clock.monotonic)
    return agent, pushes


def tick(agent, events):
    agent.build = lambda: {}
    main.diff_events = lambda previous, snapshot: list(events)
    asyncio.run(agent.tick())


def test_important_event_waits_for_the_gap(monkeypatch):
    clock = Clock()
    agent, pushes = make_agent(monkeypatch, clock)
    original = main.diff_events
    try:
        tick(agent, [])  # first push
        assert pushes == [1000.0]

        clock.now += 20
        tick(agent, [{"type": "roof_opened", "time": "t"}])  # too soon: waits
        assert len(pushes) == 1

        clock.now += 45  # 65 s after the last push: the pending roof event goes now
        tick(agent, [])
        assert pushes == [1000.0, 1065.0]

        clock.now += 60  # nothing important: the regular 300 s interval applies
        tick(agent, [])
        assert len(pushes) == 2
    finally:
        main.diff_events = original


def test_never_more_than_one_push_a_minute(monkeypatch):
    clock = Clock()
    agent, pushes = make_agent(monkeypatch, clock, push_interval=60)
    original = main.diff_events
    try:
        for _ in range(120):  # 10 minutes of 5 s ticks, an important event every tick
            tick(agent, [{"type": "weather_alert", "time": "t"}])
            clock.now += 5
        gaps = [b - a for a, b in zip(pushes, pushes[1:])]
        assert gaps and min(gaps) >= 60
    finally:
        main.diff_events = original
