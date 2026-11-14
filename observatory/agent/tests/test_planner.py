"""Tonight's plan: what goes into the Ekos schedule and why (a generic site at 50°N 10°E)."""

from datetime import date, datetime, timedelta, timezone

from observatory_agent import ephem
from observatory_agent.planner import Planner, evening_date, evening_noon_utc, is_complete, remaining

UTC = timezone.utc
LAT, LON = 50.0, 10.0
EVENING = date(2026, 12, 10)  # new moon on 9 December
NIGHT = ephem.night_of(evening_noon_utc(EVENING, UTC), LAT, LON)
NOW = datetime(2026, 12, 10, 14, 0, tzinfo=UTC)
WHEEL = ["L", "R", "G", "B", "H", "O", "S"]
SETTINGS = {"altitudeFloor": 15, "patrol": {"enabled": True, "minAltitude": 25, "cadenceDays": 6, "exposure": 60, "count": 5, "binning": 2}}

M31 = (10.6847, 41.2690)
M42 = (83.8221, -5.3911)
NEVER_RISES = (100.0, -60.0)


def job(id_, radec, plan, status="queued", **data):
    values = {
        "id": id_,
        "targetName": data.pop("name", id_),
        "ra": radec[0],
        "dec": radec[1],
        "plan": plan,
        "minAltitude": 30,
        "minMoonSeparation": None,
        "priority": 0,
        "pinned": False,
        "held": False,
        "validUntil": None,
    }
    values.update(data)
    return {"id": id_, "local_status": status, "cancel_requested": False, "data": values}


def build(jobs, progress=None, targets=(), settings=SETTINGS, wheel=WHEEL, night=NIGHT):
    planner = Planner(LAT, LON, 15, ["Track", "Focus", "Align", "Guide"])
    return planner.build(EVENING, night, jobs, progress or {}, settings, list(targets), NOW, wheel)


def entry(plan, id_):
    return next(j for j in plan.report["jobs"] if j["id"] == id_)


def test_remaining_and_complete():
    rows = [{"filter": "L", "exposure": 300, "count": 10}, {"filter": "H", "exposure": 600, "count": 4}]
    assert remaining(rows, {"L": 3}) == [("L", 300.0, 7), ("H", 600.0, 4)]
    assert remaining(rows, {"L": 12, "H": 4}) == []
    assert is_complete(rows, {"L": 10, "H": 4}) and not is_complete(rows, {"L": 10})
    assert not is_complete([], {})


def test_a_job_splits_into_broadband_and_narrowband():
    rows = [{"filter": "L", "exposure": 300, "count": 10}, {"filter": "R", "exposure": 300, "count": 5}, {"filter": "H", "exposure": 600, "count": 6}]
    plan = build([job("a1", M31, rows)], progress={"a1": {"L": 4}})
    keys = [g.key for g in plan.groups]
    assert keys == ["job-a1-bb", "job-a1-nb"]
    bb, nb = plan.groups
    assert bb.rows == [("L", 300.0, 6), ("R", 300.0, 5)]
    assert nb.rows == [("H", 600.0, 6)]
    assert bb.min_altitude == 30 and bb.kind == "job" and bb.name == "a1"
    report = entry(plan, "a1")
    assert report["planned"] and report["remaining"] == {"L": 6, "R": 5, "H": 6}
    assert report["groups"] == ["bb", "nb"]


def test_min_altitude_never_below_the_floor():
    plan = build([job("a1", M31, [{"filter": "L", "exposure": 300, "count": 5}], minAltitude=5)])
    assert plan.groups[0].min_altitude == 15


def test_not_planned_and_why():
    rows = [{"filter": "L", "exposure": 300, "count": 5}]
    plan = build(
        [
            job("held", M31, rows, held=True),
            job("cancel", M31, rows),
            job("done", M31, rows),
            job("wheel", M31, [{"filter": "X", "exposure": 300, "count": 5}]),
            job("south", NEVER_RISES, rows),
            job("pending", M31, rows, status="approved"),
        ],
        progress={"done": {"L": 5}},
    )
    plan_jobs = {j["id"]: j for j in plan.report["jobs"]}
    for job_id in ("held", "done", "wheel", "south", "pending"):
        assert not plan_jobs[job_id]["planned"], job_id
    # Codes with their numbers: the site translates them
    assert plan_jobs["held"]["reasons"] == [{"code": "held"}]
    assert plan_jobs["done"]["reasons"] == [{"code": "complete"}]
    assert plan_jobs["wheel"]["reasons"] == [{"code": "filters-missing", "filters": ["X"]}]
    assert plan_jobs["south"]["reasons"][0] == {"code": "not-observable", "group": "bb", "minutes": 0}
    assert plan_jobs["pending"]["reasons"] == [{"code": "status", "status": "approved"}]
    assert [g.ref for g in plan.groups] == ["cancel"]


def test_cancel_requested_is_not_planned():
    j = job("c1", M31, [{"filter": "L", "exposure": 300, "count": 5}])
    j["cancel_requested"] = True
    plan = build([j])
    assert plan.groups == [] and entry(plan, "c1")["reasons"] == [{"code": "cancel-requested"}]


def test_order_pinned_then_priority_then_score():
    rows = [{"filter": "H", "exposure": 600, "count": 4}]
    plan = build([job("low", M31, rows), job("high", M42, rows, priority=5), job("pin", M42, rows, pinned=True)])
    assert [g.ref for g in plan.groups] == ["pin", "high", "low"]


def test_without_a_known_wheel_filters_are_not_judged():
    plan = build([job("a1", M31, [{"filter": "H", "exposure": 600, "count": 4}])], wheel=None)
    assert [g.ref for g in plan.groups] == ["a1"]


def test_patrol_fills_after_the_jobs():
    last_week = (NOW - timedelta(days=10)).strftime("%Y-%m-%dT%H:%M:%SZ")
    yesterday = (NOW - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    targets = [
        {"id": 1, "name": "M 31", "ra": M31[0], "dec": M31[1], "lastVisitAt": last_week},
        {"id": 2, "name": "M 33", "ra": 23.4621, "dec": 30.6602, "lastVisitAt": yesterday},  # not due
        {"id": 3, "name": "south", "ra": NEVER_RISES[0], "dec": NEVER_RISES[1], "lastVisitAt": None},
        {"id": 4, "name": "M 74", "ra": 24.1742, "dec": 15.7836, "lastVisitAt": None},
    ]
    plan = build([job("a1", M42, [{"filter": "H", "exposure": 600, "count": 4}])], targets=targets)
    kinds = [g.kind for g in plan.groups]
    assert kinds[0] == "job" and set(kinds[1:]) == {"patrol"}
    patrol = [g for g in plan.groups if g.kind == "patrol"]
    assert sorted(g.ref for g in patrol) == [1, 4]
    assert all(g.rows == [("L", 60.0, 5)] and g.binning == 2 and g.min_altitude == 25 for g in patrol)
    assert plan.report["patrol"]["candidates"] == 2


def test_patrol_off():
    targets = [{"id": 1, "name": "M 31", "ra": M31[0], "dec": M31[1], "lastVisitAt": None}]
    plan = build([], targets=targets, settings={"altitudeFloor": 15, "patrol": {"enabled": False}})
    assert plan.groups == [] and plan.report["patrol"]["planned"] == []


def test_no_darkness_no_plan():
    summer = ephem.night_of(evening_noon_utc(date(2026, 6, 21), UTC), 56.0, LON)
    plan = build([job("a1", M31, [{"filter": "H", "exposure": 600, "count": 4}])], night=summer)
    assert plan.groups == [] and entry(plan, "a1")["reasons"] == [{"code": "no-darkness"}]


def test_evening_date():
    assert evening_date(datetime(2026, 12, 11, 3, tzinfo=UTC), UTC) == date(2026, 12, 10)
    assert evening_date(datetime(2026, 12, 10, 13, tzinfo=UTC), UTC) == date(2026, 12, 10)
    assert evening_date(datetime(2026, 12, 10, 11, 59, tzinfo=UTC), UTC) == date(2026, 12, 9)


def test_a_plan_built_mid_night_counts_only_the_hours_ahead():
    rows = [{"filter": "H", "exposure": 600, "count": 4}]
    full = build([job("a1", M31, rows)])
    planner = Planner(LAT, LON, 15, ["Track"])
    late = planner.build(EVENING, NIGHT, [job("a1", M31, rows)], {}, SETTINGS, [], NIGHT.nautical_end - timedelta(minutes=20), WHEEL)
    assert entry(full, "a1")["observableMinutes"] > 300
    assert entry(late, "a1")["planned"] is False
    assert entry(late, "a1")["reasons"][0]["code"] == "not-observable"
