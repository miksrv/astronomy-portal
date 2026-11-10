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

    # --- telescope jobs (FEAT-30 phase 2) ---------------------------------------------------

    def get_jobs(self) -> dict:
        """`{serverTime, settings, jobs}` — the full desired state."""
        return self._request("GET", "/observatory/agent/jobs")

    def post_updates(self, updates: list[dict]) -> dict:
        """`{results: [{jobId, seq, result, lastSeq?}], stopped}`."""
        return self._post("/observatory/agent/updates", {"updates": updates})

    def get_patrol(self) -> list[dict]:
        targets = self._request("GET", "/observatory/agent/patrol").get("targets")
        return targets if isinstance(targets, list) else []

    def post_visits(self, visits: list[dict]) -> dict:
        return self._post("/observatory/agent/patrol/visits", {"visits": visits})

    def post_plan(self, night: str, plan: dict) -> None:
        self._post("/observatory/agent/plan", {"night": night, "plan": plan})

    def _post(self, path: str, body: dict) -> dict:
        return self._request("POST", path, body)

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        data = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode() if body is not None else None
        headers = {
            "Authorization": f"Bearer {self._token}",
            "User-Agent": f"observatory-agent/{__version__}",
        }
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = urllib.request.Request(self.url + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise PortalError(f"HTTP {error.code} from {path}") from None
        except (OSError, ValueError) as error:
            raise PortalError(f"{path}: {error}") from None
        if not isinstance(result, dict):
            raise PortalError(f"{path}: the answer is not an object")
        return result
