"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Fade,
  Grid,
  Stack,
  Typography
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import PriorityControls from "./PriorityControls";
import PriorityNotificationCard from "./PriorityNotificationCard";
import { logger } from "@/lib/logger";

const API_URL = "/api/priority-notifications";
const READ_STORAGE_KEY = "campus.priority.readNotificationIds";
const priorityWeight = {
  Placement: 3,
  Result: 2,
  Event: 1
};

const surfaceShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const titleReveal = keyframes`
  0% { opacity: 0; transform: translateY(18px) scale(0.98); filter: blur(10px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
`;

const textShimmer = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

const softFloat = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

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

export default function PriorityNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPriorityNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
      limit: "100"
    });

    if (type !== "All") {
      params.set("notification_type", type);
    }

    try {
      const response = await fetch(`${API_URL}?${params.toString()}`, {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const payload = await response.json();
      const rawItems = Array.isArray(payload) ? payload : payload.notifications;
      setNotifications(Array.isArray(rawItems) ? rawItems.map(normalizeNotification) : []);
      logger.info("priority_page.fetch.success", { count: Array.isArray(rawItems) ? rawItems.length : 0 });

      if (payload.source === "fallback") {
        setError("Remote API unavailable. Showing local fallback notifications for demo.");
      }
    } catch (reason) {
      const fallbackItems = fallbackNotifications
        .map(normalizeNotification)
        .filter((notification) => type === "All" || notification.type === type);

      setNotifications(fallbackItems);
      setError(reason instanceof Error ? reason.message : "Unable to fetch notifications");
      logger.error("priority_page.fetch.failed");
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    const storedReadIds = window.localStorage.getItem(READ_STORAGE_KEY);
    setReadIds(storedReadIds ? JSON.parse(storedReadIds) : []);
  }, []);

  useEffect(() => {
    void fetchPriorityNotifications();
  }, [fetchPriorityNotifications]);

  const rankedNotifications = useMemo(() => {
    return [...notifications]
      .sort((left, right) => {
        const priorityDelta = right.priority - left.priority;
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      })
      .slice(0, limit);
  }, [notifications, limit]);

  const markRead = useCallback((id) => {
    setReadIds((current) => {
      const next = current.includes(id) ? current : [...current, id];
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #070912 0%, #101827 42%, #07131a 100%)",
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(240,171,252,0.05) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%)"
        },
        "&::after": {
          content: '""',
          position: "fixed",
          inset: "-20%",
          pointerEvents: "none",
          background:
            "linear-gradient(115deg, rgba(125,211,252,0.14), transparent 28%, rgba(240,171,252,0.12), transparent 62%, rgba(134,239,172,0.1))",
          backgroundSize: "220% 220%",
          animation: `${surfaceShift} 16s ease infinite`,
          opacity: 0.75
        }
      }}
    >
    <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.46))",
            backdropFilter: "blur(24px)",
            boxShadow:
              "0 32px 90px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.12)",
            transform: "perspective(1200px) rotateX(0.8deg)"
          }}
        >
          <Box>
            <Typography variant="overline" color="primary">
              Stage 7
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 950,
                lineHeight: 1,
                background:
                  "linear-gradient(90deg, #ffffff 0%, #7dd3fc 26%, #f0abfc 52%, #86efac 76%, #ffffff 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 12px 32px rgba(125,211,252,0.18)",
                animation: `${titleReveal} 720ms ease both, ${textShimmer} 4.8s linear 900ms infinite`
              }}
            >
              Priority Notifications
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                mt: 1.2,
                maxWidth: 620,
                animation: `${titleReveal} 760ms ease 120ms both, ${softFloat} 4s ease-in-out 1s infinite`
              }}
            >
              Ranked campus updates with priority-first sorting and live read tracking.
            </Typography>
          </Box>

          <Button
            component={Link}
            href="/"
            variant="outlined"
            sx={{
              minHeight: 48,
              px: 2.5,
              borderColor: "rgba(125,211,252,0.45)",
              boxShadow: "0 14px 34px rgba(14,165,233,0.14)",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 22px 48px rgba(14,165,233,0.22)"
              }
            }}
          >
            All Notifications
          </Button>
        </Stack>

        <PriorityControls
          limit={limit}
          page={page}
          type={type}
          totalPages={5}
          onLimitChange={setLimit}
          onPageChange={setPage}
          onTypeChange={(nextType) => {
            setType(nextType);
            setPage(1);
          }}
        />

        {error ? (
          <Alert severity="warning">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", minHeight: 260 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!loading && rankedNotifications.length === 0 ? (
          <Alert severity="info">No notifications available for the selected filter.</Alert>
        ) : null}

        <Grid container spacing={2.5} sx={{ perspective: "1400px" }}>
          {rankedNotifications.map((notification) => (
            <Grid item xs={12} md={6} lg={4} key={notification.id}>
              <Fade in timeout={420}>
                <Box sx={{ height: "100%" }}>
                  <PriorityNotificationCard
                    notification={notification}
                    isRead={readIds.includes(notification.id)}
                    onMarkRead={markRead}
                  />
                </Box>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
    </Box>
  );
}

function normalizeNotification(raw) {
  const type = raw.Type ?? raw.type ?? raw.notification_type ?? "Event";
  const timestamp = parseTimestamp(raw.Timestamp ?? raw.timestamp ?? raw.createdAt);

  return {
    id: String(raw.ID ?? raw.id),
    type,
    message: String(raw.Message ?? raw.message ?? ""),
    timestamp,
    priority: priorityWeight[type] ?? 0
  };
}

function parseTimestamp(value) {
  const fallback = new Date().toISOString();
  if (!value) {
    return fallback;
  }

  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  const withTimezone = normalized.endsWith("Z") || normalized.includes("+") ? normalized : `${normalized}Z`;
  const parsed = new Date(withTimezone);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}
