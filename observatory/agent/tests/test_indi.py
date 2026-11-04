from pathlib import Path

from observatory_agent.indi import PropertyTree, StreamParser, parse_number

FIXTURE = (Path(__file__).parent / "fixtures" / "indi_session.xml").read_bytes()


def load_tree(chunk_size: int = 97) -> PropertyTree:
    tree = PropertyTree()
    parser = StreamParser(tree.apply)
    # Feed in odd-sized chunks: messages arrive split across TCP reads
    for i in range(0, len(FIXTURE), chunk_size):
        parser.feed(FIXTURE[i : i + chunk_size])
    return tree


def test_parses_every_device():
    assert load_tree().devices() == [
        "EQMod Mount", "QHY CCD QHY5II-M", "Roll Roof", "WatchDog", "Weather Watcher", "ZWO CCD ASI6200MM Pro", "ZWO EAF", "ZWO EFW",
    ]


def test_chunking_does_not_matter():
    assert load_tree(7).properties.keys() == load_tree(4096).properties.keys()


def test_values_and_state():
    tree = load_tree()
    eod = tree.get("EQMod Mount", "EQUATORIAL_EOD_COORD")
    assert eod.kind == "Number" and eod.state == "Ok"
    assert eod.number("DEC") == 41.4155
    assert tree.get("EQMod Mount", "TELESCOPE_PARK").switch("UNPARK") is True
    assert tree.get("Roll Roof", "ROOF").text("ROOF") == "OPEN"


def test_set_and_del_property():
    tree = load_tree()
    parser = StreamParser(tree.apply)
    parser.feed(b'<setNumberVector device="ZWO CCD ASI6200MM Pro" name="CCD_TEMPERATURE" state="Busy">'
                b'<oneNumber name="CCD_TEMPERATURE_VALUE">-5.5</oneNumber></setNumberVector>')
    prop = tree.get("ZWO CCD ASI6200MM Pro", "CCD_TEMPERATURE")
    assert prop.number("CCD_TEMPERATURE_VALUE") == -5.5 and prop.state == "Busy"
    parser.feed(b'<delProperty device="ZWO EFW"/>')
    assert "ZWO EFW" not in tree.devices()


def test_parse_number_sexagesimal():
    assert parse_number("12:30:00") == 12.5
    assert parse_number("-05:30:00") == -5.5
    assert parse_number("  3.25 ") == 3.25
    assert parse_number("") is None and parse_number("abc") is None


def test_precession_matches_reference():
    from datetime import datetime, timezone

    from observatory_agent.astro import date_to_j2000, field_of_view, j2000_to_date

    when = datetime(2026, 11, 4, tzinfo=timezone.utc)
    # M31 J2000 → JNow, checked against astropy FK5 (J2026.84): 11.0534°, +41.4155°
    ra, dec = j2000_to_date(10.684708, 41.26875, when)
    assert abs(ra - 11.0534) < 2e-4 and abs(dec - 41.4155) < 2e-4
    back = date_to_j2000(ra, dec, when)
    assert abs(back[0] - 10.684708) < 1e-6 and abs(back[1] - 41.26875) < 1e-6
    assert field_of_view(9576, 6388, 3.76, 0) is None


def test_parse_number_rejects_non_finite():
    # A confused driver's nan/inf would break int() in the snapshot and the portal's JSON
    assert parse_number("nan") is None
    assert parse_number("inf") is None
    assert parse_number("-inf") is None
