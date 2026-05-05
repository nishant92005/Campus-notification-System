from __future__ import annotations

import argparse
import heapq
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_URL = "http://20.244.56.144/evaluation-service/notifications"
PRIORITY_WEIGHT = {"Placement": 3, "Result": 2, "Event": 1}
SAMPLE_NOTIFICATIONS = [
    {
        "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "Type": "Result",
        "Message": "mid-sem",
        "Timestamp": "2026-04-22 17:51:30",
    },
    {
        "ID": "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
        "Type": "Placement",
        "Message": "CSX Corporation hiring",
        "Timestamp": "2026-04-22 17:51:18",
    },
    {
        "ID": "81589ada-0ad3-4f77-9554-f52fb558e09d",
        "Type": "Event",
        "Message": "farewell",
        "Timestamp": "2026-04-22 17:51:06",
    },
    {
        "ID": "ea836726-c25e-4f21-a72f-544a6af8a37f",
        "Type": "Result",
        "Message": "project-review",
        "Timestamp": "2026-04-22 17:50:42",
    },
]


class AppLogger:
    """Tiny structured logger to avoid console.log-style ad hoc output."""

    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    def info(self, event: str, **fields: Any) -> None:
        self._write("INFO", event, fields)

    def error(self, event: str, **fields: Any) -> None:
        self._write("ERROR", event, fields)

    def _write(self, level: str, event: str, fields: dict[str, Any]) -> None:
        if not self.enabled:
            return

        payload = {
            "level": level,
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **fields,
        }
        print(json.dumps(payload, default=str), file=sys.stderr)


@dataclass(frozen=True)
class Notification:
    id: str
    type: str
    message: str
    timestamp: datetime

    @classmethod
    def from_api(cls, raw: dict[str, Any]) -> "Notification":
        raw_timestamp = raw.get("Timestamp") or raw.get("timestamp") or raw.get("createdAt")
        if not raw_timestamp:
            raise ValueError("notification is missing Timestamp")

        return cls(
            id=str(raw.get("ID") or raw.get("id")),
            type=str(raw.get("Type") or raw.get("type")),
            message=str(raw.get("Message") or raw.get("message") or ""),
            timestamp=parse_timestamp(str(raw_timestamp)),
        )

    def to_dict(self) -> dict[str, str]:
        return {
            "ID": self.id,
            "Type": self.type,
            "Message": self.message,
            "Timestamp": self.timestamp.isoformat(),
        }


def parse_timestamp(value: str) -> datetime:
    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        parsed = datetime.strptime(normalized, "%Y-%m-%d %H:%M:%S")

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def fetch_notifications(
    api_url: str,
    timeout_seconds: int,
    logger: AppLogger,
    auth_token: str | None = None,
) -> list[Notification]:
    headers = {"Accept": "application/json", "User-Agent": "campus-priority-inbox/1.0"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    request = Request(api_url, headers=headers)
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        logger.error("priority_inbox.http_error", status=exc.code, reason=exc.reason)
        raise
    except URLError as exc:
        logger.error("priority_inbox.network_error", reason=str(exc.reason))
        raise

    raw_notifications = payload.get("notifications", payload if isinstance(payload, list) else [])
    if not isinstance(raw_notifications, list):
        raise ValueError("API response must contain a notifications list")

    notifications: list[Notification] = []
    for raw in raw_notifications:
        if not isinstance(raw, dict):
            continue
        try:
            notifications.append(Notification.from_api(raw))
        except ValueError as exc:
            logger.error("priority_inbox.invalid_notification", reason=str(exc), raw=raw)

    logger.info("priority_inbox.fetched", count=len(notifications))
    return notifications


def top_priority_notifications(notifications: Iterable[Notification], limit: int = 10) -> list[Notification]:
    heap: list[tuple[int, float, str, Notification]] = []

    for notification in notifications:
        priority = PRIORITY_WEIGHT.get(notification.type, 0)
        timestamp_score = notification.timestamp.timestamp()
        entry = (priority, timestamp_score, notification.id, notification)

        if len(heap) < limit:
            heapq.heappush(heap, entry)
        elif entry > heap[0]:
            heapq.heapreplace(heap, entry)

    return [
        item[3]
        for item in sorted(heap, key=lambda entry: (entry[0], entry[1], entry[2]), reverse=True)
    ]


def process_stream(current_top: list[Notification], incoming: Iterable[Notification], limit: int = 10) -> list[Notification]:
    return top_priority_notifications([*current_top, *incoming], limit)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch and rank campus notifications.")
    parser.add_argument("--api-url", default=API_URL)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=10)
    parser.add_argument("--auth-token", default=None, help="Bearer token if the API requires authorization.")
    parser.add_argument("--demo", action="store_true", help="Use bundled sample notifications instead of the remote API.")
    parser.add_argument("--verbose", action="store_true", help="Print structured logs to stderr.")
    args = parser.parse_args()

    logger = AppLogger(enabled=args.verbose)

    if args.demo:
        notifications = [Notification.from_api(raw) for raw in SAMPLE_NOTIFICATIONS]
        logger.info("priority_inbox.demo_data", count=len(notifications))
    else:
        try:
            notifications = fetch_notifications(args.api_url, args.timeout, logger, args.auth_token)
        except HTTPError as exc:
            print(
                json.dumps(
                    {
                        "error": "API request failed",
                        "status": exc.code,
                        "reason": exc.reason,
                        "hint": "The API returned 401 Unauthorized. Provide --auth-token if you have one, or run with --demo.",
                    },
                    indent=2,
                )
            )
            return 1
        except URLError as exc:
            print(
                json.dumps(
                    {
                        "error": "Network request failed",
                        "reason": str(exc.reason),
                        "hint": "Check network access, or run with --demo.",
                    },
                    indent=2,
                )
            )
            return 1

    ranked = top_priority_notifications(notifications, args.limit)
    print(json.dumps([notification.to_dict() for notification in ranked], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
