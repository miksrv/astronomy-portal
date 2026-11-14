"""The .esl/.esq files follow the KStars 3.8.5 format and never carry what would change global
Ekos options; the checks refuse anything outside the rules."""

import xml.etree.ElementTree as ET

import pytest

from observatory_agent.config import CameraConfig
from observatory_agent.ekosfiles import (
    EkosFileError,
    EkosJob,
    SequenceRow,
    check_schedule,
    check_sequence,
    schedule_xml,
    sequence_xml,
    write_atomic,
)

TRAIN = "Primary"
DIR = "/config/agent"
FITS = "/home/mik/fits/jobs/a1"
WHEEL = ["L", "R", "G", "B", "H", "O", "S"]


def job(**kw):
    values = dict(name="M 51", ra_deg=202.4696, dec_deg=47.1952, sequence_path=f"{DIR}/2026-12-10/job-a1-bb.esq", min_altitude=30)
    values.update(kw)
    return EkosJob(**values)


def test_schedule_has_the_jobs_and_nothing_global():
    text = schedule_xml([job(min_moon_separation=40), job(name="M 42", ra_deg=83.82)], "AstroLab", TRAIN)
    root = ET.fromstring(text)
    assert root.tag == "SchedulerList" and root.get("version") == "2.2"
    assert [e.tag for e in root] == ["Profile", "Job", "Job", "SchedulerAlgorithm"]
    assert root.findtext("Profile") == "AstroLab"
    first = root.find("Job")
    assert first.findtext("Name") == "M 51"
    assert first.find("JobType").get("lead") == "true"
    assert float(first.findtext("Coordinates/J2000RA")) == pytest.approx(202.4696 / 15, abs=1e-6)
    assert float(first.findtext("Coordinates/J2000DE")) == pytest.approx(47.1952)
    assert first.findtext("OpticalTrain") == TRAIN
    constraints = {c.text: c.get("value") for c in first.iter("Constraint")}
    assert constraints == {"MinimumAltitude": "30", "MoonSeparation": "40", "EnforceTwilight": None, "EnforceArtificialHorizon": None}
    assert [s.text for s in first.iter("Step")] == ["Track", "Focus", "Align", "Guide"]
    assert first.findtext("CompletionCondition/Condition") == "Sequence"
    assert root.find("SchedulerAlgorithm").get("value") == "1"  # greedy
    assert check_schedule(text, TRAIN, 15, DIR) == 2
    for tag in ("StartupProcedure", "ShutdownProcedure", "ErrorHandlingStrategy"):
        assert tag not in text


def test_names_are_escaped():
    text = schedule_xml([job(name="Sh2-155 <Cave> & 'x'")], "AstroLab", TRAIN)
    assert ET.fromstring(text).findtext("Job/Name") == "Sh2-155 <Cave> & 'x'"


def test_characters_xml_cannot_carry_are_dropped():
    text = schedule_xml([job(name="M\x0151\ufffe")], "AstroLab", TRAIN)
    assert ET.fromstring(text).findtext("Job/Name") == "M51"
    assert check_schedule(text, TRAIN, 15, DIR) == 1


def test_an_empty_train_is_refused():
    with pytest.raises(ValueError):
        schedule_xml([job()], "AstroLab", "")


def test_unknown_steps_are_refused():
    with pytest.raises(ValueError):
        schedule_xml([job(steps=["Track", "Park"])], "AstroLab", TRAIN)


@pytest.mark.parametrize(
    "mutate, message",
    [
        (lambda t: t.replace("<SchedulerAlgorithm", "<StartupProcedure enabled='true'><PostStartupQueue>/x</PostStartupQueue></StartupProcedure>\n<SchedulerAlgorithm"), "StartupProcedure"),
        (lambda t: t.replace("<SchedulerAlgorithm", "<ErrorHandlingStrategy value='1'/>\n<SchedulerAlgorithm"), "ErrorHandlingStrategy"),
        (lambda t: t.replace("<OpticalTrain>Primary</OpticalTrain>", "<OpticalTrain></OpticalTrain>"), "optical train"),
        (lambda t: t.replace("value='30'>MinimumAltitude", "value='10'>MinimumAltitude"), "minimum altitude"),
        (lambda t: t.replace("<Constraint>EnforceArtificialHorizon</Constraint>", ""), "artificial horizon"),
        (lambda t: t.replace(f"{DIR}/2026", "/config/Desktop/2026"), "outside"),
        (lambda t: t.replace("<Step>Guide</Step>", "<Step>Park</Step>"), "step"),
        (lambda t: t[:-20], "not XML"),
    ],
)
def test_check_schedule_refuses(mutate, message):
    text = mutate(schedule_xml([job()], "AstroLab", TRAIN))
    with pytest.raises(EkosFileError, match=message):
        check_schedule(text, TRAIN, 15, DIR)


def test_sequence_rows():
    camera = CameraConfig(width=9576, height=6388, gain=150, offset=50, temperature=-10)
    text = sequence_xml([SequenceRow("L", 300, 12), SequenceRow("H", 600, 4)], camera, FITS)
    root = ET.fromstring(text)
    assert root.tag == "SequenceQueue" and root.get("version") == "2.6"
    assert [e.tag for e in root] == ["Job", "Job"]
    row = root.find("Job")
    assert row.findtext("Filter") == "L"
    assert row.findtext("Exposure") == "300"
    assert row.findtext("Count") == "12"
    assert row.findtext("Type") == "Light"
    assert (row.findtext("Frame/W"), row.findtext("Frame/H")) == ("9576", "6388")
    assert row.find("Temperature").get("force") == "true" and row.findtext("Temperature") == "-10"
    assert row.findtext("FITSDirectory") == FITS
    assert row.findtext("PlaceholderFormat") == "/%t/%T/%F/%t_%T_%F_%e_%D"
    assert {e.get("name"): e.text for e in row.iter("OneElement")} == {"Gain": "150", "Offset": "50"}
    assert row.findtext("Calibration/PreAction/Type") == "0"  # no park before the frame
    for tag in ("GuideDeviation", "HFRCheck", "RefocusEveryN", "Observer"):
        assert root.find(tag) is None
    assert check_sequence(text, WHEEL, FITS) == 16


def test_sequence_binning_and_no_temperature():
    camera = CameraConfig(temperature=None)
    root = ET.fromstring(sequence_xml([SequenceRow("L", 60, 5)], camera, FITS, binning=2))
    assert root.findtext("Job/Binning/X") == "2" and root.find("Job/Temperature") is None


@pytest.mark.parametrize(
    "mutate, wheel, message",
    [
        (lambda t: t, ["L", "R"], "not in the wheel"),
        (lambda t: t.replace("<W>9576</W>", "<W>0</W>"), WHEEL, "frame size"),
        (lambda t: t.replace("<Type>Light</Type>", "<Type>Dark</Type>"), WHEEL, "Light"),
        (lambda t: t.replace(FITS, "/home/mik/fits"), WHEEL, "folder"),
        (lambda t: t.replace("<Count>4</Count>", "<Count>0</Count>"), WHEEL, "without frames"),
        (lambda t: t.replace("<Job>", "<GuideDeviation enabled='true'>2</GuideDeviation>\n<Job>", 1), WHEEL, "GuideDeviation"),
    ],
)
def test_check_sequence_refuses(mutate, wheel, message):
    text = mutate(sequence_xml([SequenceRow("H", 600, 4)], CameraConfig(), FITS))
    with pytest.raises(EkosFileError, match=message):
        check_sequence(text, wheel, FITS)


def test_write_atomic(tmp_path):
    path = tmp_path / "n" / "tonight.esl"
    write_atomic(path, "one")
    write_atomic(path, "two")
    assert path.read_text() == "two"
    assert [p.name for p in path.parent.iterdir()] == ["tonight.esl"]
