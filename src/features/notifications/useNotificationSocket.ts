"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import type { CampusNotification } from "./types";

interface SocketEvent {
  event?: string;
  data?: CampusNotification;
}

export function useNotificationSocket(onNotification: (notification: CampusNotification) => void) {
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!socketUrl) {
      logger.info("notifications.socket.disabled");
      return;
    }

    const socket = new WebSocket(socketUrl);

    socket.addEventListener("open", () => {
      logger.info("notifications.socket.connected");
    });

    socket.addEventListener("message", (message) => {
      try {
        const payload = JSON.parse(message.data) as SocketEvent;
        if (payload.event === "notification.created" && payload.data) {
          onNotification(payload.data);
        }
      } catch {
        logger.warn("notifications.socket.invalid_message");
      }
    });

    socket.addEventListener("error", () => {
      logger.error("notifications.socket.error");
    });

    socket.addEventListener("close", () => {
      logger.info("notifications.socket.closed");
    });

    return () => {
      socket.close();
    };
  }, [onNotification]);
}

