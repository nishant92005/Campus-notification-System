"use client";

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography
} from "@mui/material";

const notificationTypes = ["All", "Placement", "Result", "Event"];
const limitOptions = [10, 15, 20];

export default function PriorityControls({
  limit,
  page,
  type,
  totalPages,
  onLimitChange,
  onPageChange,
  onTypeChange
}) {
  return (
    <Box
      component="section"
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "rgba(255,255,255,0.14)",
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.72), rgba(17,24,39,0.52))",
        backdropFilter: "blur(22px)",
        boxShadow:
          "0 24px 70px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.1)",
        transition: "transform 180ms ease, border-color 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(125,211,252,0.32)"
        }
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 800 }}>
          Priority Inbox
        </Typography>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="priority-type-label">Type</InputLabel>
          <Select
            labelId="priority-type-label"
            label="Type"
            value={type}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            {notificationTypes.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="priority-limit-label">Top N</InputLabel>
          <Select
            labelId="priority-limit-label"
            label="Top N"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {limitOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Pagination
          count={totalPages}
          page={page}
          color="primary"
          onChange={(_, nextPage) => onPageChange(nextPage)}
          sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" } }}
        />
      </Stack>
    </Box>
  );
}
