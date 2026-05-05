"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logger } from "@/lib/logger";
import { fetchNotifications, markNotificationRead } from "./api";
import { sortByPriority } from "./priority";
import type { CampusNotification, NotificationFilters } from "./types";

export function useNotifications(mode: "all" | "priority") {
  const [filters, setFilters] = useState<NotificationFilters>({ type: "All", page: 1, pageSize: 6 });
  const [items, setItems] = useState<CampusNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchNotifications(filters);
      setItems(mode === "priority" ? sortByPriority(page.items).slice(0, 10) : page.items);
      setTotal(page.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to fetch notifications");
      logger.error("notifications.load.failed");
    } finally {
      setLoading(false);
    }
  }, [filters, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    const result = await markNotificationRead(id);
    setItems((current) =>
      current.map((notification) =>
        notification.id === result.id ? { ...notification, read: result.read } : notification
      )
    );
  }, []);

  const prependNotification = useCallback(
    (notification: CampusNotification) => {
      setItems((current) => {
        const next = [notification, ...current.filter((item) => item.id !== notification.id)];
        return mode === "priority" ? sortByPriority(next).slice(0, 10) : next.slice(0, filters.pageSize);
      });
      setTotal((current) => current + 1);
    },
    [filters.pageSize, mode]
  );

  return useMemo(
    () => ({
      items,
      total,
      loading,
      error,
      filters,
      setFilters,
      markRead,
      prependNotification,
      reload: load
    }),
    [items, total, loading, error, filters, markRead, prependNotification, load]
  );
}

