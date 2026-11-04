"""Coordinate helpers without dependencies.

The mount reports where it points in coordinates of the date (JNow); star maps and catalogs use
J2000. Over a couple of decades precession moves a point by a few tenths of a degree — more than
the camera's field is worth ignoring — so positions are converted with the IAU 1976 precession
(Lieske et al. 1977), good to well under an arcsecond for dates near J2000.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

ARCSEC = math.pi / (180 * 3600)
J2000 = datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def _centuries(when: datetime) -> float:
    return (when - J2000).total_seconds() / (36525 * 86400)


def _precession_matrix(when: datetime) -> list[list[float]]:
    """Rotation J2000 → mean equator and equinox of `when` (IAU 1976)."""
    t = _centuries(when)
    zeta = (2306.2181 * t + 0.30188 * t**2 + 0.017998 * t**3) * ARCSEC
    z = (2306.2181 * t + 1.09468 * t**2 + 0.018203 * t**3) * ARCSEC
    theta = (2004.3109 * t - 0.42665 * t**2 - 0.041833 * t**3) * ARCSEC

    cz, sz = math.cos(zeta), math.sin(zeta)
    cZ, sZ = math.cos(z), math.sin(z)
    ct, st = math.cos(theta), math.sin(theta)

    return [
        [cZ * ct * cz - sZ * sz, -cZ * ct * sz - sZ * cz, -cZ * st],
        [sZ * ct * cz + cZ * sz, -sZ * ct * sz + cZ * cz, -sZ * st],
        [st * cz, -st * sz, ct],
    ]


def _to_vector(ra_deg: float, dec_deg: float) -> list[float]:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    return [math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)]


def _from_vector(v: list[float]) -> tuple[float, float]:
    ra = math.degrees(math.atan2(v[1], v[0])) % 360
    dec = math.degrees(math.asin(max(-1.0, min(1.0, v[2]))))
    return ra, dec


def j2000_to_date(ra_deg: float, dec_deg: float, when: datetime) -> tuple[float, float]:
    m = _precession_matrix(when)
    v = _to_vector(ra_deg, dec_deg)
    return _from_vector([sum(m[i][j] * v[j] for j in range(3)) for i in range(3)])


def date_to_j2000(ra_deg: float, dec_deg: float, when: datetime) -> tuple[float, float]:
    """JNow (mean equator of `when`) → J2000, degrees."""
    m = _precession_matrix(when)
    v = _to_vector(ra_deg, dec_deg)
    # The inverse of a rotation is its transpose
    return _from_vector([sum(m[j][i] * v[j] for j in range(3)) for i in range(3)])


def field_of_view(width_px: float, height_px: float, pixel_um: float, focal_mm: float) -> tuple[float, float] | None:
    """Camera field of view in degrees (width, height), or None without the numbers."""
    if not (width_px and height_px and pixel_um and focal_mm):
        return None

    def angle(px: float) -> float:
        return math.degrees(2 * math.atan(px * pixel_um / 1000 / (2 * focal_mm)))

    return angle(width_px), angle(height_px)
