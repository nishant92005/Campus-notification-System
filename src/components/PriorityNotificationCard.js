"use client";

import { Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { CheckCircleOutline, RadioButtonUnchecked } from "@mui/icons-material";
import { keyframes } from "@mui/material/styles";

const typeColor = {
  Placement: "primary",
  Result: "secondary",
  Event: "success"
};

const sheen = keyframes`
  0% { transform: translateX(-130%) skewX(-18deg); }
  100% { transform: translateX(160%) skewX(-18deg); }
`;

export default function PriorityNotificationCard({ notification, isRead, onMarkRead }) {
  const displayDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(new Date(notification.timestamp));

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        borderColor: isRead ? "rgba(255,255,255,0.12)" : "primary.main",
        background: isRead
          ? "linear-gradient(145deg, rgba(17,24,39,0.72), rgba(8,13,24,0.86))"
          : "linear-gradient(145deg, rgba(14,165,233,0.16), rgba(168,85,247,0.1) 48%, rgba(17,24,39,0.8))",
        backdropFilter: "blur(18px)",
        transformStyle: "preserve-3d",
        boxShadow: isRead
          ? "0 16px 42px rgba(0,0,0,0.22)"
          : "0 26px 70px rgba(14,165,233,0.18), 0 10px 30px rgba(0,0,0,0.28)",
        transition:
          "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease, background 220ms ease",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(120deg, transparent 18%, rgba(255,255,255,0.14), transparent 42%)",
          transform: "translateX(-130%) skewX(-18deg)"
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "0 auto 0 0",
          width: 5,
          background:
            notification.type === "Placement"
              ? "linear-gradient(#7dd3fc, #a78bfa)"
              : notification.type === "Result"
                ? "linear-gradient(#f0abfc, #818cf8)"
                : "linear-gradient(#86efac, #67e8f9)"
        },
        "&:hover": {
          transform: "perspective(900px) translateY(-8px) rotateX(4deg) rotateY(-3deg)",
          boxShadow:
            "0 34px 90px rgba(0,0,0,0.38), 0 16px 48px rgba(14,165,233,0.2)",
          "&::before": {
            animation: `${sheen} 850ms ease`
          }
        }
      }}
    >
      <CardContent sx={{ position: "relative", zIndex: 1, transform: "translateZ(24px)" }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                size="small"
                color={typeColor[notification.type] || "default"}
                label={notification.type}
              />
              <Chip
                size="small"
                variant={isRead ? "outlined" : "filled"}
                icon={isRead ? <CheckCircleOutline /> : <RadioButtonUnchecked />}
                label={isRead ? "Read" : "Unread"}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
              {displayDate}
            </Typography>
          </Stack>

          <Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
            {notification.message}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Priority score {notification.priority}. Ranked by notification type and latest timestamp.
          </Typography>

          <Button
            size="small"
            variant={isRead ? "outlined" : "contained"}
            disabled={isRead}
            onClick={() => onMarkRead(notification.id)}
            sx={{
              alignSelf: "flex-start",
              boxShadow: isRead ? "none" : "0 12px 28px rgba(14,165,233,0.24)",
              transition: "transform 160ms ease, box-shadow 160ms ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 18px 36px rgba(14,165,233,0.32)"
              }
            }}
          >
            {isRead ? "Read" : "Mark as read"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
