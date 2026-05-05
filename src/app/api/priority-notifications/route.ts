import { NextRequest, NextResponse } from "next/server";

const REMOTE_API_URL = "http://20.244.56.144/evaluation-service/notifications";

const fallbackNotifications = [
  {
    ID: "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    Type: "Placement",
    Message: "CSX Corporation hiring",
    Timestamp: "2026-04-22 17:51:18"
  },
  {
    ID: "d146095a-0d86-4a34-9e69-3900a14576bc",
    Type: "Result",
    Message: "mid-sem",
    Timestamp: "2026-04-22 17:51:30"
  },
  {
    ID: "81589ada-0ad3-4f77-9554-f52fb558e09d",
    Type: "Event",
    Message: "farewell",
    Timestamp: "2026-04-22 17:51:06"
  },
  {
    ID: "ea836726-c25e-4f21-a72f-544a6af8a37f",
    Type: "Result",
    Message: "project-review",
    Timestamp: "2026-04-22 17:50:42"
  },
  {
    ID: "demo-placement-2",
    Type: "Placement",
    Message: "Resume shortlisting round closes tonight",
    Timestamp: "2026-04-23 08:10:00"
  },
  {
    ID: "demo-event-2",
    Type: "Event",
    Message: "AI research colloquium at seminar hall",
    Timestamp: "2026-04-23 06:25:00"
  },
  {
    ID: "demo-placement-3",
    Type: "Placement",
    Message: "Pre-placement talk moved to 11 AM",
    Timestamp: "2026-04-24 04:30:00"
  },
  {
    ID: "demo-result-3",
    Type: "Result",
    Message: "Internal assessment marks updated",
    Timestamp: "2026-04-23 12:15:00"
  },
  {
    ID: "demo-event-3",
    Type: "Event",
    Message: "Cultural fest volunteer briefing",
    Timestamp: "2026-04-21 13:00:00"
  },
  {
    ID: "demo-placement-4",
    Type: "Placement",
    Message: "Mock interview slots are open",
    Timestamp: "2026-04-20 09:45:00"
  }
];

export async function GET(request: NextRequest) {
  const remoteUrl = new URL(REMOTE_API_URL);
  const page = request.nextUrl.searchParams.get("page") ?? "1";
  const limit = request.nextUrl.searchParams.get("limit") ?? "100";
  const notificationType = request.nextUrl.searchParams.get("notification_type");

  remoteUrl.searchParams.set("page", page);
  remoteUrl.searchParams.set("limit", limit);

  if (notificationType) {
    remoteUrl.searchParams.set("notification_type", notificationType);
  }

  try {
    const response = await fetch(remoteUrl.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "campus-notification-system/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackResponse(notificationType, `Remote API returned ${response.status}`);
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch {
    return fallbackResponse(notificationType, "Remote API request failed");
  }
}

function fallbackResponse(notificationType: string | null, reason: string) {
  const notifications = notificationType
    ? fallbackNotifications.filter((notification) => notification.Type === notificationType)
    : fallbackNotifications;

  return NextResponse.json({
    notifications,
    source: "fallback",
    reason
  });
}
