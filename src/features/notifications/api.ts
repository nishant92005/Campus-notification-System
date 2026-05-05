import { logger } from "@/lib/logger";
import { fallbackNotifications } from "./mockData";
import type { CampusNotification, NotificationFilters, NotificationPage, NotificationType } from "./types";

const REMOTE_API_URL = "http://20.207.122.201/evaluation-service/notifications";

interface RawNotification {
  ID?: string;
  id?: string;
  Type?: NotificationType;
  type?: NotificationType;
  Message?: string;
  message?: string;
  Timestamp?: string;
  timestamp?: string;
}

function parseTimestamp(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`).toISOString();
}

function normalizeNotification(raw: RawNotification): CampusNotification {
  return {
    id: String(raw.ID ?? raw.id),
    type: (raw.Type ?? raw.type ?? "Event") as NotificationType,
    message: String(raw.Message ?? raw.message ?? ""),
    timestamp: parseTimestamp(String(raw.Timestamp ?? raw.timestamp ?? new Date().toISOString())),
    read: false
  };
}

export async function fetchNotifications(filters: NotificationFilters): Promise<NotificationPage> {
  try {
    const response = await fetch(REMOTE_API_URL, {
      headers: {
        Accept: "application/json",
        "X-Request-Id": crypto.randomUUID()
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Notification API returned ${response.status}`);
    }

    const payload = await response.json();
    const rawNotifications = Array.isArray(payload) ? payload : payload.notifications;
    const normalized = Array.isArray(rawNotifications)
      ? rawNotifications.map(normalizeNotification)
      : fallbackNotifications;

    logger.info("notifications.fetch.success", { count: normalized.length });
    return paginate(filter(normalized, filters.type), filters.page, filters.pageSize);
  } catch (error) {
    logger.error("notifications.fetch.fallback", {
      reason: error instanceof Error ? error.message : "unknown"
    });
    return paginate(filter(fallbackNotifications, filters.type), filters.page, filters.pageSize);
  }
}

export async function markNotificationRead(id: string): Promise<{ id: string; read: boolean }> {
  logger.info("notifications.mark_read.local", { id });
  return { id, read: true };
}

function filter(notifications: CampusNotification[], type: NotificationFilters["type"]) {
  if (type === "All") {
    return notifications;
  }
  return notifications.filter((notification) => notification.type === type);
}

function paginate(notifications: CampusNotification[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    items: notifications.slice(start, start + pageSize),
    total: notifications.length
  };
}

