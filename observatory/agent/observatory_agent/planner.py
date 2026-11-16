"""Tonight's plan: which jobs go into the Ekos schedule, in which order.

Pure computation (no I/O): the inputs are the local jobs from the portal, the site and the
night's darkness. The output is the list of Ekos jobs to write and a
report for the portal (`POST /observatory/agent/plan`) with the score and the reasons per job.

Rules (features/observatory-agent.md §4.5, §4.11):
- Pinned first, then the admin priority, then the score of the night. A held job is not planned.
- A job is split into a broadband (L/R/G/B) and a narrowband (H/O/S) Ekos job: broadband needs
  astronomical night and suffers from the Moon, narrowband runs from nautical darkness.
- Every Ekos job has min altitude = max(floor, the job's), never below the floor.
- Only the remaining frames are planned (progress = the portal's counts when first seen + the
  frames this agent has seen since; a job repeated on the site — only those since its repeat).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from . import ephem

def notice(code: str, **params) -> dict:
    """A reason or warning for the site: a code it translates, with its numbers/names (the agent
    sends no human text, so the admin page reads in the viewer's language)."""
    return {"code": code, **params}


BROADBAND = ("L", "R", "G", "B")
NARROWBAND = ("H", "O", "S")
SAMPLE_MINUTES = 10
# A job group needs this much observable time tonight to be worth loading
MIN_OBSERVABLE_MINUTES = 30


@dataclass
class PlannedGroup:
    """One Ekos job of the plan, with what its sequence file must contain."""

    key: str  # file name stem: "job-<id>-bb" / "job-<id>-nb"
    kind: str  # "job" (the only kind; kept in the plan report)
    ref: str  # job id
    name: str
    ra: float
    dec: float
    rows: list[tuple[str, float, int]]  # (filter, exposure s, count)
    min_altitude: float
    min_moon_separation: float | None
    binning: int | None = None
    observable_minutes: int = 0


@dataclass
class Plan:
    night: date
    groups: list[PlannedGroup] = field(default_factory=list)
    report: dict = field(default_factory=dict)


def _iso(when: datetime | None) -> str | None:
    return when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if when else None


def _parse(text: str | None) -> datetime | None:
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def remaining(plan_rows: list[dict], progress: dict[str, int]) -> list[tuple[str, float, int]]:
    """(filter, exposure, frames still to shoot) for every row of a job's plan with frames left."""
    out = []
    for row in plan_rows:
        try:
            filter_, exposure, count = str(row["filter"]), float(row["exposure"]), int(row["count"])
        except (KeyError, TypeError, ValueError):
            continue
        left = count - int(progress.get(filter_, 0))
        if left > 0 and exposure > 0:
            out.append((filter_, exposure, left))
    return out


def is_complete(plan_rows: list[dict], progress: dict[str, int]) -> bool:
    return bool(plan_rows) and not remaining(plan_rows, progress)


@dataclass
class _Samples:
    times: list[datetime]
    sun: list[float]
    moon_alt: list[float]
    moon_radec: list[tuple[float, float]]


class Planner:
    def __init__(self, latitude: float, longitude: float, floor: float, steps: list[str]) -> None:
        self.lat = latitude
        self.lon = longitude
        self.floor = max(15.0, floor)
        self.steps = steps

    def _samples(self, night: ephem.Night, now: datetime) -> _Samples:
        """Moments of tonight's darkness still ahead (a plan built mid-night counts no past hours)."""
        times: list[datetime] = []
        if night.nautical_start and night.nautical_end:
            t = night.nautical_start
            if now > t:
                t += timedelta(minutes=SAMPLE_MINUTES * -(-(now - t) // timedelta(minutes=SAMPLE_MINUTES)))
            while t <= night.nautical_end:
                times.append(t)
                t += timedelta(minutes=SAMPLE_MINUTES)
        return _Samples(
            times,
            [ephem.sun_altitude(t, self.lat, self.lon) for t in times],
            [ephem.moon_altitude(t, self.lat, self.lon) for t in times],
            [ephem.moon_radec(t) for t in times],
        )

    def _visible(self, s: _Samples, ra: float, dec: float, min_alt: float, sun_limit: float, moon_sep: float | None) -> tuple[list[bool], list[float]]:
        ok, alts = [], []
        for i, t in enumerate(s.times):
            alt = ephem.altitude(ra, dec, t, self.lat, self.lon)
            alts.append(alt)
            visible = alt >= min_alt and s.sun[i] < sun_limit
            if visible and moon_sep and s.moon_alt[i] > 0:
                visible = ephem.separation(ra, dec, *s.moon_radec[i]) >= moon_sep
            ok.append(visible)
        return ok, alts

    def build(
        self,
        evening: date,
        night: ephem.Night,
        jobs: list[dict],
        progress: dict[str, dict[str, int]],
        now: datetime,
        wheel: list[str] | None,
    ) -> Plan:
        """`jobs` — local job rows (`data` is the portal's job); `progress` — absolute counts per job."""
        plan = Plan(evening)
        s = self._samples(night, now)
        moon_illum = ephem.moon_illumination(night.nautical_start or night.evening + timedelta(hours=12))
        sun_ra, _ = ephem.sun_radec(night.evening)
        report_jobs = []
        candidates: list[tuple[tuple, list[PlannedGroup], dict]] = []

        for job in jobs:
            data = job["data"]
            entry = {"id": job["id"], "targetName": data.get("targetName"), "planned": False, "reasons": []}
            report_jobs.append(entry)
            if job["local_status"] not in ("queued", "running"):
                entry["reasons"].append(notice("status", status=job["local_status"]))
                continue
            if job["cancel_requested"]:
                entry["reasons"].append(notice("cancel-requested"))
                continue
            if data.get("held"):
                entry["reasons"].append(notice("held"))
                continue
            left = remaining(data.get("plan") or [], progress.get(job["id"], {}))
            if not left:
                entry["reasons"].append(notice("complete"))
                continue
            unknown = sorted({f for f, _, _ in left if wheel is not None and f not in wheel})
            if unknown:
                entry["reasons"].append(notice("filters-missing", filters=unknown))
                continue
            if not s.times:
                entry["reasons"].append(notice("no-darkness"))
                continue

            ra, dec = float(data["ra"]), float(data["dec"])
            min_alt = max(self.floor, float(data.get("minAltitude") or 0))
            moon_sep = data.get("minMoonSeparation")
            groups, minutes_total, max_alt = [], 0, -90.0
            moon_penalty = 0.0
            for suffix, filters, sun_limit in (("bb", BROADBAND, -18.0), ("nb", NARROWBAND, -12.0)):
                rows = [r for r in left if r[0] in filters] + ([r for r in left if r[0] not in BROADBAND + NARROWBAND] if suffix == "bb" else [])
                if not rows:
                    continue
                ok, alts = self._visible(s, ra, dec, min_alt, sun_limit, moon_sep)
                minutes = sum(ok) * SAMPLE_MINUTES
                max_alt = max([max_alt] + [a for a, o in zip(alts, ok) if o])
                if minutes < MIN_OBSERVABLE_MINUTES:
                    entry["reasons"].append(notice("not-observable", group=suffix, minutes=minutes))
                    continue
                if suffix == "bb":
                    # The Moon above the horizon while the target is up washes out broadband frames
                    up = [i for i, o in enumerate(ok) if o and s.moon_alt[i] > 0]
                    if up:
                        sep = min(ephem.separation(ra, dec, *s.moon_radec[i]) for i in up)
                        moon_penalty = moon_illum * (len(up) / max(1, sum(ok))) * (1 - min(sep, 120) / 120) * 40
                minutes_total += minutes
                groups.append(
                    PlannedGroup(
                        key=f"job-{job['id']}-{suffix}",
                        kind="job",
                        ref=job["id"],
                        name=str(data.get("targetName") or job["id"]),
                        ra=ra,
                        dec=dec,
                        rows=rows,
                        min_altitude=min_alt,
                        min_moon_separation=float(moon_sep) if moon_sep else None,
                        observable_minutes=minutes,
                    )
                )
            if not groups:
                continue

            # From the same rows `remaining()` accepts: a malformed one must not stop the night's plan
            planned = remaining(data.get("plan") or [], {})
            total = sum(count for _, _, count in planned) or 1
            done = max(0, total - sum(count for _, _, count in left)) if planned else 0
            # Leaving the evening sky: the target is less than 90° east of the Sun
            leaving = 0 < (ra - sun_ra) % 360 < 90
            valid_until = _parse((data.get("validUntil") or "") + "T00:00:00Z") if data.get("validUntil") else None
            days_left = (valid_until - now).days if valid_until else None
            score = (
                max_alt / 90 * 30
                + min(minutes_total, 360) / 360 * 20
                - moon_penalty
                + (15 if leaving else 0)
                + (15 * (1 - max(0, days_left) / 7) if days_left is not None and days_left < 7 else 0)
                + done / total * 15
            )
            entry.update(
                {
                    "planned": True,
                    "score": round(score, 1),
                    "observableMinutes": minutes_total,
                    "maxAltitude": round(max_alt, 1),
                    "remaining": {f: n for f, _, n in left},
                    "groups": [g.key.rsplit("-", 1)[1] for g in groups],
                }
            )
            order = (0 if data.get("pinned") else 1, -int(data.get("priority") or 0), -score)
            candidates.append((order, groups, entry))

        candidates.sort(key=lambda c: c[0])
        for _, groups, _ in candidates:
            plan.groups.extend(groups)

        plan.report = {
            "night": evening.isoformat(),
            "builtAt": _iso(now),
            "darkness": {
                "nauticalStart": _iso(night.nautical_start),
                "nauticalEnd": _iso(night.nautical_end),
                "astroStart": _iso(night.astro_start),
                "astroEnd": _iso(night.astro_end),
            },
            "moon": {"illumination": round(moon_illum, 2)},
            "jobs": report_jobs,
            "ekosJobs": [{"key": g.key, "kind": g.kind, "name": g.name} for g in plan.groups],
        }
        return plan


def evening_date(now: datetime, tz) -> date:
    """The observing night a moment belongs to: local noon → next local noon, named by the evening."""
    local = now.astimezone(tz)
    return (local - timedelta(hours=12)).date()


def evening_noon_utc(evening: date, tz) -> datetime:
    return datetime(evening.year, evening.month, evening.day, 12, 0, tzinfo=tz).astimezone(timezone.utc)
