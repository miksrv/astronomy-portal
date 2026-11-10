"""Low-precision Sun and Moon positions and the night's darkness, without dependencies.

Good to a few hundredths of a degree for the Sun and ~0.3° for the Moon (Astronomical Almanac
low-precision formulas) — plenty for planning a night: which target is up, when it gets dark,
how far the Moon is. Never used to point the telescope (the agent never does).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

J2000_JD = 2451545.0


def julian_day(when: datetime) -> float:
    return when.timestamp() / 86400.0 + 2440587.5


def _days(when: datetime) -> float:
    return julian_day(when) - J2000_JD


def _sin(deg: float) -> float:
    return math.sin(math.radians(deg))


def _cos(deg: float) -> float:
    return math.cos(math.radians(deg))


def _obliquity(n: float) -> float:
    return 23.439 - 0.0000004 * n


def _ecliptic_to_equatorial(lon: float, lat: float, eps: float) -> tuple[float, float]:
    """Ecliptic (degrees) → RA/Dec (degrees)."""
    ra = math.degrees(math.atan2(_sin(lon) * _cos(eps) - math.tan(math.radians(lat)) * _sin(eps), _cos(lon)))
    dec = math.degrees(math.asin(_sin(lat) * _cos(eps) + _cos(lat) * _sin(eps) * _sin(lon)))
    return ra % 360, dec


def sun_ecliptic_longitude(when: datetime) -> float:
    n = _days(when)
    mean_lon = 280.460 + 0.9856474 * n
    anomaly = 357.528 + 0.9856003 * n
    return (mean_lon + 1.915 * _sin(anomaly) + 0.020 * _sin(2 * anomaly)) % 360


def sun_radec(when: datetime) -> tuple[float, float]:
    """Apparent RA/Dec of the Sun, degrees."""
    return _ecliptic_to_equatorial(sun_ecliptic_longitude(when), 0.0, _obliquity(_days(when)))


def _moon_ecliptic(when: datetime) -> tuple[float, float, float]:
    """Moon's ecliptic longitude, latitude and horizontal parallax, degrees."""
    t = _days(when) / 36525
    lon = (
        218.32
        + 481267.881 * t
        + 6.29 * _sin(135.0 + 477198.87 * t)
        - 1.27 * _sin(259.3 - 413335.36 * t)
        + 0.66 * _sin(235.7 + 890534.22 * t)
        + 0.21 * _sin(269.9 + 954397.74 * t)
        - 0.19 * _sin(357.5 + 35999.05 * t)
        - 0.11 * _sin(186.5 + 966404.03 * t)
    ) % 360
    lat = (
        5.13 * _sin(93.3 + 483202.02 * t)
        + 0.28 * _sin(228.2 + 960400.89 * t)
        - 0.28 * _sin(318.3 + 6003.15 * t)
        - 0.17 * _sin(217.6 - 407332.21 * t)
    )
    parallax = (
        0.9508
        + 0.0518 * _cos(135.0 + 477198.87 * t)
        + 0.0095 * _cos(259.3 - 413335.36 * t)
        + 0.0078 * _cos(235.7 + 890534.22 * t)
        + 0.0028 * _cos(269.9 + 954397.74 * t)
    )
    return lon, lat, parallax


def moon_radec(when: datetime) -> tuple[float, float]:
    """Geocentric RA/Dec of the Moon, degrees."""
    lon, lat, _ = _moon_ecliptic(when)
    return _ecliptic_to_equatorial(lon, lat, _obliquity(_days(when)))


def moon_illumination(when: datetime) -> float:
    """Illuminated fraction of the Moon's disc, 0…1."""
    lon, lat, _ = _moon_ecliptic(when)
    elongation = math.degrees(math.acos(_cos(lat) * _cos(lon - sun_ecliptic_longitude(when))))
    return (1 - _cos(elongation)) / 2


def local_sidereal_time(when: datetime, longitude: float) -> float:
    """Local mean sidereal time, degrees; longitude east-positive."""
    return (280.46061837 + 360.98564736629 * _days(when) + longitude) % 360


def altitude(ra: float, dec: float, when: datetime, latitude: float, longitude: float) -> float:
    """Altitude of RA/Dec (degrees) above the horizon, degrees (no refraction)."""
    hour_angle = local_sidereal_time(when, longitude) - ra
    value = _sin(latitude) * _sin(dec) + _cos(latitude) * _cos(dec) * _cos(hour_angle)
    return math.degrees(math.asin(max(-1.0, min(1.0, value))))


def sun_altitude(when: datetime, latitude: float, longitude: float) -> float:
    ra, dec = sun_radec(when)
    return altitude(ra, dec, when, latitude, longitude)


def moon_altitude(when: datetime, latitude: float, longitude: float) -> float:
    """Topocentric altitude of the Moon (parallax lowers it by up to ~1°)."""
    ra, dec = moon_radec(when)
    geocentric = altitude(ra, dec, when, latitude, longitude)
    _, _, parallax = _moon_ecliptic(when)
    return geocentric - parallax * _cos(geocentric)


def separation(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Angular distance between two points, degrees."""
    value = _sin(dec1) * _sin(dec2) + _cos(dec1) * _cos(dec2) * _cos(ra1 - ra2)
    return math.degrees(math.acos(max(-1.0, min(1.0, value))))


@dataclass(frozen=True)
class Night:
    """The dark part of one night (UTC times). `None` when the Sun never gets that low."""

    evening: datetime  # local noon of the evening date, as UTC — the search starts here
    nautical_start: datetime | None  # Sun below −12°
    nautical_end: datetime | None
    astro_start: datetime | None  # Sun below −18°
    astro_end: datetime | None

    @property
    def has_darkness(self) -> bool:
        return self.nautical_start is not None


def night_of(evening_noon_utc: datetime, latitude: float, longitude: float, step_minutes: int = 2) -> Night:
    """Darkness of the night that follows `evening_noon_utc` (the local noon of the evening date)."""
    step = timedelta(minutes=step_minutes)
    times = [evening_noon_utc + step * i for i in range(int(24 * 60 / step_minutes) + 1)]
    altitudes = [sun_altitude(t, latitude, longitude) for t in times]

    def window(limit: float) -> tuple[datetime | None, datetime | None]:
        below = [t for t, alt in zip(times, altitudes) if alt < limit]
        if not below:
            return None, None
        return below[0], below[-1]

    nautical = window(-12.0)
    astro = window(-18.0)
    return Night(evening_noon_utc, nautical[0], nautical[1], astro[0], astro[1])


def utc(when: datetime) -> datetime:
    return when.astimezone(timezone.utc)
