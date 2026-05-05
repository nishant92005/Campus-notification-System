"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "@/theme/createAppTheme";

const theme = createAppTheme();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

