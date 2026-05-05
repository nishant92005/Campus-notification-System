import { createTheme } from "@mui/material/styles";

export function createAppTheme() {
  return createTheme({
    palette: {
      mode: "dark",
      primary: {
        main: "#7dd3fc"
      },
      secondary: {
        main: "#f0abfc"
      },
      background: {
        default: "#090b12",
        paper: "rgba(17, 24, 39, 0.72)"
      },
      success: {
        main: "#86efac"
      },
      warning: {
        main: "#fde68a"
      },
      error: {
        main: "#fda4af"
      }
    },
    typography: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        fontWeight: 800,
        letterSpacing: 0
      },
      h2: {
        fontWeight: 800,
        letterSpacing: 0
      },
      h3: {
        fontWeight: 760,
        letterSpacing: 0
      },
      button: {
        textTransform: "none",
        fontWeight: 700,
        letterSpacing: 0
      }
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none"
          }
        }
      }
    }
  });
}

