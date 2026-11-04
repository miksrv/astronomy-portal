"""HTTPS client for the portal API. Outbound only; the agent token goes in the
Authorization header and never into logs."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from . import __version__

log = logging.getLogger(__name__)


class PortalError(Exception):
    pass


class PortalClient:
    def __init__(self, url: str, token: str, timeout: float = 15.0) -> None:
        self.url = url.rstrip("/")
        self._token = token
        self.timeout = timeout

    def push_status(self, snapshot: dict, events: list[dict]) -> None:
        body = dict(snapshot)
        if events:
            body["events"] = events
        self._post("/observatory/agent/status", body)

    def _post(self, path: str, body: dict) -> dict:
        data = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode()
        request = urllib.request.Request(
            self.url + path,
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._token}",
                "User-Agent": f"observatory-agent/{__version__}",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise PortalError(f"HTTP {error.code} from {path}") from None
        except (OSError, ValueError) as error:
            raise PortalError(f"{path}: {error}") from None
