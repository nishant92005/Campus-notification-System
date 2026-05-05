"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Pagination,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import { Bell, Check, GraduationCap, Layers3, RefreshCcw, Sparkles } from "lucide-react";
import { useNotifications } from "./useNotifications";
import { useNotificationSocket } from "./useNotificationSocket";
import type { CampusNotification, NotificationType } from "./types";

const notificationTypes: Array<NotificationType | "All"> = ["All", "Placement", "Result", "Event"];

const typeAccent: Record<NotificationType, string> = {
  Placement: "#7dd3fc",
  Result: "#f0abfc",
  Event: "#86efac"
};

export function NotificationDashboard({ mode }: { mode: "all" | "priority" }) {
  const [mounted, setMounted] = useState(false);
  const {
    items,
    total,
    loading,
    error,
    filters,
    setFilters,
    markRead,
    prependNotification,
    reload
  } = useNotifications(mode);

  useEffect(() => {
    setMounted(true);
  }, []);

  useNotificationSocket(prependNotification);

  const unreadCount = items.filter((notification) => !notification.read).length;
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <Box className="dashboard-shell">
      <Box className="ambient ambient-one" />
      <Box className="ambient ambient-two" />

      <Container maxWidth="xl" sx={{ position: "relative", py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Box className="topbar">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box className="brand-mark">
                <GraduationCap size={24} />
              </Box>
              <Box>
                <Typography variant="overline" color="primary">
                  Campus Command Center
                </Typography>
                <Typography variant="h1" className="page-title">
                  {mode === "priority" ? "Priority Notifications" : "All Notifications"}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Refresh notifications">
                <IconButton className="glass-icon" onClick={() => void reload()} aria-label="Refresh notifications">
                  <RefreshCcw size={18} />
                </IconButton>
              </Tooltip>
              <Button
                component={Link}
                href={mode === "priority" ? "/" : "/priority"}
                startIcon={mode === "priority" ? <Bell size={17} /> : <Sparkles size={17} />}
                variant="contained"
                className="nav-action"
              >
                {mode === "priority" ? "All" : "Priority"}
              </Button>
            </Stack>
          </Box>

          <Box className="hero-panel">
            <Box className="hero-copy">
              <Typography variant="h2">Live campus signal, organized for action.</Typography>
              <Typography color="text.secondary">
                Placements, results, and events arrive in one focused inbox with unread highlighting,
                priority ranking, and real-time delivery hooks.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} className="metric-row">
              <Metric label="Visible" value={items.length.toString()} icon={<Layers3 size={18} />} />
              <Metric label="Unread" value={unreadCount.toString()} icon={<Bell size={18} />} />
              <Metric label="Total" value={total.toString()} icon={<Sparkles size={18} />} />
            </Stack>
          </Box>

          <Box className="toolbar-panel">
            <ToggleButtonGroup
              exclusive
              value={filters.type}
              onChange={(_, value) => {
                if (value) {
                  setFilters((current) => ({ ...current, type: value, page: 1 }));
                }
              }}
              className="filter-group"
            >
              {notificationTypes.map((type) => (
                <ToggleButton key={type} value={type}>
                  {type}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {error ? <Alert severity="warning">{error}</Alert> : null}

          <Box className="notification-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <NotificationSkeleton key={index} />)
              : null}

            <AnimatePresence mode="popLayout">
              {!loading
                ? items.map((notification, index) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      index={index}
                      onMarkRead={markRead}
                      mounted={mounted}
                    />
                  ))
                : null}
            </AnimatePresence>
          </Box>

          {!loading && items.length === 0 ? (
            <Box className="empty-state">
              <Bell size={28} />
              <Typography variant="h3">No notifications found</Typography>
              <Typography color="text.secondary">Try another type filter or refresh the inbox.</Typography>
            </Box>
          ) : null}

          {mode === "all" ? (
            <Stack alignItems="center">
              <Pagination
                count={pageCount}
                page={filters.page}
                color="primary"
                onChange={(_, page) => setFilters((current) => ({ ...current, page }))}
              />
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Box className="metric-card">
      {icon}
      <Box>
        <Typography variant="h3">{value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

function NotificationCard({
  notification,
  index,
  onMarkRead,
  mounted
}: {
  notification: CampusNotification;
  index: number;
  onMarkRead: (id: string) => Promise<void>;
  mounted: boolean;
}) {
  const accent = typeAccent[notification.type];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.28, delay: index * 0.025 }}
      className={`notification-card ${notification.read ? "read" : "unread"}`}
      style={{ ["--accent" as string]: accent }}
    >
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={notification.type} size="small" sx={{ background: `${accent}22`, color: accent }} />
            {!notification.read ? <Chip label="Unread" size="small" color="primary" /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
            {mounted ? formatNotificationTime(notification.timestamp) : "Loading"}
          </Typography>
        </Stack>

        <Box>
          <Typography variant="h3" className="card-title">
            {notification.message}
          </Typography>
          <Typography color="text.secondary" className="card-subtext">
            Real-time campus update routed through the notification command stream.
          </Typography>
        </Box>

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box className="depth-line" />
          <Tooltip title={notification.read ? "Already read" : "Mark as read"}>
            <span>
              <IconButton
                className="mark-read"
                disabled={notification.read}
                onClick={() => void onMarkRead(notification.id)}
                aria-label="Mark notification as read"
              >
                <Check size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </motion.article>
  );
}

function formatNotificationTime(timestamp: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(timestamp));
}

function NotificationSkeleton() {
  return (
    <Box className="notification-card">
      <Stack spacing={2}>
        <Skeleton width={140} height={28} />
        <Skeleton width="70%" height={34} />
        <Skeleton width="92%" />
        <Skeleton width="52%" />
      </Stack>
    </Box>
  );
}
