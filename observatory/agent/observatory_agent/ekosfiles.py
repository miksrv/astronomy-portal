"""Ekos schedule (.esl) and sequence (.esq) files, in the format of KStars 3.8.5.

Checked against the 3.8.5 sources (`SchedulerProcess::appendEkosScheduleList`,
`SchedulerUtils::createJob`, `SequenceQueue::load`, `SequenceJob::loadFrom`):

- A schedule never carries `StartupProcedure`, `ShutdownProcedure` or `ErrorHandlingStrategy`:
  loading them overwrites the observatory's global Ekos options (startup/shutdown queues,
  error handling). Without them the options stay as the observatory has them.
- Every job names its optical train: an empty or unknown train makes KStars open a modal dialog,
  which would block the DBus call that loads the schedule.
- A sequence carries no guide/focus option headers (they overwrite global options too); only
  `<Job>` elements — any other unknown root tag would itself be read as a job.
- A filter name Ekos doesn't know silently becomes slot 1, so the caller checks names against the
  wheel first.
- The frame is always the full sensor: with W/H 0 Ekos keeps whatever subframe the camera had.

`check_schedule()` / `check_sequence()` parse a written file back and refuse anything outside
these rules; the agent loads nothing that fails them.
"""

from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape

from .config import DEFAULT_STEPS, CameraConfig

SCHEDULE_VERSION = "2.2"
SEQUENCE_VERSION = "2.6"

# Root tags of a schedule that change global Ekos options when loaded — never written
FORBIDDEN_SCHEDULE_TAGS = {"StartupProcedure", "ShutdownProcedure", "ErrorHandlingStrategy", "Mosaic"}
ALLOWED_SCHEDULE_TAGS = {"Profile", "Job", "SchedulerAlgorithm"}
ALLOWED_STEPS = set(DEFAULT_STEPS)


@dataclass
class SequenceRow:
    filter: str
    exposure: float
    count: int


@dataclass
class EkosJob:
    """One Ekos Scheduler job: a target with its own sequence file."""

    name: str
    ra_deg: float  # J2000
    dec_deg: float
    sequence_path: str  # as KStars sees it (inside the container)
    min_altitude: float
    min_moon_separation: float | None = None
    enforce_twilight: bool = True
    steps: list[str] = field(default_factory=lambda: list(DEFAULT_STEPS))


# Characters XML 1.0 can't carry at all (escaping doesn't help): C0 controls but tab/LF/CR,
# surrogates, U+FFFE/U+FFFF. The portal refuses them in names; this is the second line
_NOT_XML = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]")


def _x(text: str) -> str:
    return escape(_NOT_XML.sub("", str(text)), {"'": "&apos;", '"': "&quot;"})


def _num(value: float) -> str:
    """C-locale number, no exponent, trailing zeros trimmed."""
    text = f"{value:.6f}".rstrip("0").rstrip(".")
    return text if text not in ("", "-0") else "0"


def sequence_xml(rows: list[SequenceRow], camera: CameraConfig, fits_dir: str, binning: int | None = None) -> str:
    bin_ = binning or camera.binning
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', f"<SequenceQueue version='{SEQUENCE_VERSION}'>"]
    for row in rows:
        lines += [
            "<Job>",
            f"<Exposure>{_num(row.exposure)}</Exposure>",
            *([f"<Format>{_x(camera.format)}</Format>"] if camera.format else []),
            "<Encoding>FITS</Encoding>",
            "<Binning>",
            f"<X>{bin_}</X>",
            f"<Y>{bin_}</Y>",
            "</Binning>",
            "<Frame>",
            "<X>0</X>",
            "<Y>0</Y>",
            f"<W>{camera.width}</W>",
            f"<H>{camera.height}</H>",
            "</Frame>",
            *([f"<Temperature force='true'>{_num(camera.temperature)}</Temperature>"] if camera.temperature is not None else []),
            f"<Filter>{_x(row.filter)}</Filter>",
            "<Type>Light</Type>",
            f"<Count>{row.count}</Count>",
            "<Delay>0</Delay>",
            f"<FITSDirectory>{_x(fits_dir)}</FITSDirectory>",
            "<PlaceholderFormat>/%t/%T/%F/%t_%T_%F_%e_%D</PlaceholderFormat>",
            "<PlaceholderSuffix>0</PlaceholderSuffix>",
            "<UploadMode>0</UploadMode>",
            "<Properties>",
            "<PropertyVector name='CCD_CONTROLS'>",
            f"<OneElement name='Gain'>{camera.gain}</OneElement>",
            f"<OneElement name='Offset'>{camera.offset}</OneElement>",
            "</PropertyVector>",
            "</Properties>",
            "<Calibration>",
            "<PreAction>",
            "<Type>0</Type>",
            "</PreAction>",
            "<FlatDuration dark='false'>",
            "<Type>Manual</Type>",
            "</FlatDuration>",
            "</Calibration>",
            "</Job>",
        ]
    lines.append("</SequenceQueue>")
    return "\n".join(lines) + "\n"


def schedule_xml(jobs: list[EkosJob], profile: str, optical_train: str) -> str:
    if not optical_train:
        raise ValueError("an optical train is required (KStars opens a modal dialog without one)")
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', f"<SchedulerList version='{SCHEDULE_VERSION}'>", f"<Profile>{_x(profile)}</Profile>"]
    for job in jobs:
        bad = [s for s in job.steps if s not in ALLOWED_STEPS]
        if bad:
            raise ValueError(f"unknown steps {bad}")
        constraints = [f"<Constraint value='{_num(job.min_altitude)}'>MinimumAltitude</Constraint>"]
        if job.min_moon_separation:
            constraints.append(f"<Constraint value='{_num(job.min_moon_separation)}'>MoonSeparation</Constraint>")
        if job.enforce_twilight:
            constraints.append("<Constraint>EnforceTwilight</Constraint>")
        constraints.append("<Constraint>EnforceArtificialHorizon</Constraint>")
        lines += [
            "<Job>",
            "<JobType lead='true'/>",
            f"<Name>{_x(job.name)}</Name>",
            "<Group></Group>",
            "<Coordinates>",
            f"<J2000RA>{_num((job.ra_deg % 360) / 15)}</J2000RA>",
            f"<J2000DE>{_num(job.dec_deg)}</J2000DE>",
            "</Coordinates>",
            f"<OpticalTrain>{_x(optical_train)}</OpticalTrain>",
            "<PositionAngle>0</PositionAngle>",
            f"<Sequence>{_x(job.sequence_path)}</Sequence>",
            "<StartupCondition>",
            "<Condition>ASAP</Condition>",
            "</StartupCondition>",
            "<Constraints>",
            *constraints,
            "</Constraints>",
            "<CompletionCondition>",
            "<Condition>Sequence</Condition>",
            "</CompletionCondition>",
            "<Steps>",
            *[f"<Step>{step}</Step>" for step in job.steps],
            "</Steps>",
            "</Job>",
        ]
    lines += ["<SchedulerAlgorithm value='1'/>", "</SchedulerList>"]
    return "\n".join(lines) + "\n"


class EkosFileError(ValueError):
    pass


def check_schedule(text: str, optical_train: str, floor: float, sequence_dir: str) -> int:
    """Parses a schedule back; raises EkosFileError unless it keeps every rule. Returns the job count."""
    try:
        root = ET.fromstring(text.encode())
    except ET.ParseError as error:
        raise EkosFileError(f"schedule is not XML: {error}") from None
    if root.tag != "SchedulerList":
        raise EkosFileError("root is not SchedulerList")
    count = 0
    for element in root:
        if element.tag in FORBIDDEN_SCHEDULE_TAGS or element.tag not in ALLOWED_SCHEDULE_TAGS:
            raise EkosFileError(f"schedule has <{element.tag}>")
        if element.tag != "Job":
            continue
        count += 1
        if (element.findtext("OpticalTrain") or "") != optical_train:
            raise EkosFileError("job without the optical train")
        sequence = element.findtext("Sequence") or ""
        if not sequence.startswith(sequence_dir.rstrip("/") + "/"):
            raise EkosFileError(f"sequence outside {sequence_dir}: {sequence}")
        altitudes = [c.get("value") for c in element.iter("Constraint") if c.text == "MinimumAltitude"]
        if len(altitudes) != 1 or float(altitudes[0]) < floor:
            raise EkosFileError(f"job without a minimum altitude ≥ {floor}°")
        if not any(c.text == "EnforceArtificialHorizon" for c in element.iter("Constraint")):
            raise EkosFileError("job without the artificial horizon")
        for step in element.iter("Step"):
            if step.text not in ALLOWED_STEPS:
                raise EkosFileError(f"unknown step {step.text}")
    return count


def check_sequence(text: str, filters: list[str] | None, fits_dir: str) -> int:
    """Parses a sequence back; raises EkosFileError unless it keeps every rule. Returns the frame count."""
    try:
        root = ET.fromstring(text.encode())
    except ET.ParseError as error:
        raise EkosFileError(f"sequence is not XML: {error}") from None
    if root.tag != "SequenceQueue":
        raise EkosFileError("root is not SequenceQueue")
    frames = 0
    for element in root:
        if element.tag != "Job":
            raise EkosFileError(f"sequence has <{element.tag}>")
        filter_ = element.findtext("Filter") or ""
        if filters is not None and filter_ not in filters:
            raise EkosFileError(f"filter {filter_!r} is not in the wheel {filters}")
        if (element.findtext("Type") or "") != "Light":
            raise EkosFileError("only Light frames")
        if (element.findtext("FITSDirectory") or "") != fits_dir:
            raise EkosFileError("frames would go outside the job's folder")
        width = int(element.findtext("Frame/W") or 0)
        height = int(element.findtext("Frame/H") or 0)
        if width <= 0 or height <= 0:
            raise EkosFileError("frame size missing (Ekos would keep the camera's subframe)")
        count = int(element.findtext("Count") or 0)
        if count <= 0:
            raise EkosFileError("a row without frames")
        frames += count
    return frames


def write_atomic(path: Path, text: str) -> None:
    """Writes via a temporary file + rename, so KStars never reads half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8") as file:
        file.write(text)
        file.flush()
        os.fsync(file.fileno())
    os.replace(tmp, path)
