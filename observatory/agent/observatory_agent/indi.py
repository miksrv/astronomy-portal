"""Minimal read-only INDI client.

Speaks the INDI XML protocol over TCP with nothing but the standard library: asks for every
property (`<getProperties>`), keeps an in-memory tree that follows the server's `def*`/`set*`/
`delProperty` messages, and calls back on every change. It never sends `new*Vector` messages —
the agent only reads (see observatory/docs/safety.md). BLOBs are never enabled, so images
don't travel over this connection.
"""

from __future__ import annotations

import asyncio
import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Callable

log = logging.getLogger(__name__)

VECTOR_TYPES = {"Text", "Number", "Switch", "Light", "BLOB"}


@dataclass
class Property:
    """One INDI property vector: its type, state and element values."""

    device: str
    name: str
    kind: str  # Text / Number / Switch / Light / BLOB
    state: str = "Idle"  # Idle / Ok / Busy / Alert
    label: str = ""
    group: str = ""
    elements: dict[str, str] = field(default_factory=dict)

    def number(self, element: str) -> float | None:
        return parse_number(self.elements.get(element))

    def switch(self, element: str) -> bool | None:
        value = self.elements.get(element)
        return None if value is None else value.strip() == "On"

    def text(self, element: str) -> str | None:
        value = self.elements.get(element)
        return None if value is None else value.strip()

    def on_switches(self) -> list[str]:
        return [name for name, value in self.elements.items() if value.strip() == "On"]


def parse_number(value: str | None) -> float | None:
    """INDI numbers are decimal, or sexagesimal (`12:30:00`, `-5 23 22`)."""
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        pass
    parts = text.replace(" ", ":").split(":")
    try:
        numbers = [float(p) for p in parts if p != ""]
    except ValueError:
        return None
    if not numbers:
        return None
    sign = -1.0 if text.startswith("-") else 1.0
    result = abs(numbers[0])
    for i, part in enumerate(numbers[1:], start=1):
        result += part / (60**i)
    return sign * result


class PropertyTree:
    """All properties of all devices, updated from parsed INDI XML elements."""

    def __init__(self) -> None:
        self.properties: dict[tuple[str, str], Property] = {}

    def get(self, device: str, name: str) -> Property | None:
        return self.properties.get((device, name))

    def devices(self) -> list[str]:
        return sorted({device for device, _ in self.properties})

    def clear(self) -> None:
        self.properties.clear()

    def apply(self, element: ET.Element) -> tuple[str, str] | None:
        """Applies one top-level INDI message; returns (device, property) it changed, if any."""
        tag = element.tag
        device = element.get("device", "")
        name = element.get("name", "")

        if tag == "delProperty":
            if name:
                self.properties.pop((device, name), None)
            else:
                for key in [k for k in self.properties if k[0] == device]:
                    del self.properties[key]
            return (device, name)

        for prefix in ("def", "set"):
            if tag.startswith(prefix) and tag.endswith("Vector"):
                kind = tag[len(prefix) : -len("Vector")]
                if kind not in VECTOR_TYPES or not device or not name:
                    return None
                key = (device, name)
                prop = self.properties.get(key)
                if prefix == "def" or prop is None:
                    prop = Property(device=device, name=name, kind=kind)
                    self.properties[key] = prop
                prop.label = element.get("label", prop.label)
                prop.group = element.get("group", prop.group)
                if element.get("state"):
                    prop.state = element.get("state", prop.state)
                for child in element:
                    child_name = child.get("name")
                    if child_name:
                        prop.elements[child_name] = (child.text or "").strip()
                return key

        return None  # <message>, <getProperties> echoes, …


class IndiClient:
    """Keeps a connection to an INDI server and the property tree in sync with it."""

    def __init__(
        self,
        host: str,
        port: int,
        on_change: Callable[[tuple[str, str]], None] | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.tree = PropertyTree()
        self.connected = False
        self._on_change = on_change

    async def run_forever(self, stop: asyncio.Event) -> None:
        """Connects, reads until the server goes away, reconnects with back-off."""
        delay = 5.0
        while not stop.is_set():
            try:
                await self._session(stop)
                delay = 5.0
            except (OSError, asyncio.IncompleteReadError, ET.ParseError) as error:
                if self.connected:
                    log.warning("INDI connection lost: %s", error)
                else:
                    log.debug("INDI server not reachable: %s", error)
            finally:
                if self.connected:
                    self.connected = False
                    self.tree.clear()
            try:
                await asyncio.wait_for(stop.wait(), timeout=delay)
            except asyncio.TimeoutError:
                pass
            delay = min(delay * 2, 60.0)

    async def _session(self, stop: asyncio.Event) -> None:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(self.host, self.port), timeout=10)
        try:
            writer.write(b'<getProperties version="1.7"/>\n')
            await writer.drain()
            self.connected = True
            log.info("Connected to INDI server %s:%s", self.host, self.port)

            parser = StreamParser(self._handle)
            while not stop.is_set():
                try:
                    chunk = await asyncio.wait_for(reader.read(65536), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                if not chunk:
                    raise ConnectionResetError("INDI server closed the connection")
                parser.feed(chunk)
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    def _handle(self, element: ET.Element) -> None:
        key = self.tree.apply(element)
        if key and self._on_change:
            self._on_change(key)


class StreamParser:
    """Incremental parser for the endless INDI XML stream (no single root element)."""

    def __init__(self, handler: Callable[[ET.Element], None]) -> None:
        self._handler = handler
        self._parser = ET.XMLPullParser(events=("start", "end"))
        self._parser.feed("<indi>")
        self._depth = 0
        self._root: ET.Element | None = None

    def feed(self, data: bytes | str) -> None:
        self._parser.feed(data)
        for event, element in self._parser.read_events():
            if event == "start":
                if self._root is None:
                    self._root = element
                self._depth += 1
            else:
                self._depth -= 1
                if self._depth == 1:  # a complete top-level message
                    self._handler(element)
                    if self._root is not None:
                        self._root.clear()
