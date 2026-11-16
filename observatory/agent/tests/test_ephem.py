"""Sun/Moon positions and darkness against known values (a generic site, not the observatory)."""

from datetime import datetime, timedelta, timezone

import pytest

from observatory_agent import ephem

UTC = timezone.utc
LAT, LON = 50.0, 10.0


def test_sun_at_j2000():
    ra, dec = ephem.sun_radec(datetime(2000, 1, 1, 12, tzinfo=UTC))
    assert ra == pytest.approx(281.29, abs=0.05)
    assert dec == pytest.approx(-23.03, abs=0.05)


def test_sun_at_the_march_equinox_2026():
    _, dec = ephem.sun_radec(datetime(2026, 3, 20, 14, 46, tzinfo=UTC))
    assert dec == pytest.approx(0, abs=0.05)


def test_moon_phases_2026():
    # Full moon 2026-03-03 11:38 UTC (total lunar eclipse), new moon 2026-03-19 01:23 UTC
    assert ephem.moon_illumination(datetime(2026, 3, 3, 11, 38, tzinfo=UTC)) > 0.99
    assert ephem.moon_illumination(datetime(2026, 3, 19, 1, 23, tzinfo=UTC)) < 0.01
    # During the eclipse the Moon is opposite the Sun
    when = datetime(2026, 3, 3, 11, 38, tzinfo=UTC)
    assert ephem.separation(*ephem.moon_radec(when), *ephem.sun_radec(when)) == pytest.approx(180, abs=1.5)


def test_altitude_at_transit():
    when = datetime(2026, 12, 10, 22, tzinfo=UTC)
    lst = ephem.local_sidereal_time(when, LON)
    assert ephem.altitude(lst, LAT, when, LAT, LON) == pytest.approx(90, abs=0.01)
    assert ephem.altitude(lst, 0, when, LAT, LON) == pytest.approx(40, abs=0.01)
    assert ephem.altitude((lst + 180) % 360, 89.99, when, LAT, LON) == pytest.approx(LAT, abs=0.05)


def test_winter_night_has_astronomical_darkness():
    night = ephem.night_of(datetime(2026, 12, 10, 11, tzinfo=UTC), LAT, LON)
    assert night.has_darkness and night.astro_start and night.astro_end
    assert night.nautical_start < night.astro_start < night.astro_end < night.nautical_end
    # Mid-December at 50°N 10°E: nautical darkness ≈ 16:35–05:50 UT (Frankfurt: 17:38–06:57 CET)
    assert night.nautical_start.hour == 16
    assert night.nautical_end.hour == 5
    assert (night.nautical_end - night.nautical_start) > timedelta(hours=13)


def test_midsummer_at_50_degrees_has_no_astronomical_night():
    night = ephem.night_of(datetime(2026, 6, 21, 11, tzinfo=UTC), LAT, LON)
    assert night.has_darkness
    assert night.astro_start is None and night.astro_end is None


def test_midsummer_at_56_degrees_has_no_darkness_at_all():
    night = ephem.night_of(datetime(2026, 6, 21, 11, tzinfo=UTC), 56.0, LON)
    assert not night.has_darkness
