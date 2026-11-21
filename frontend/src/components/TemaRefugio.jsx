
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { estilosUI } from "./EstilosUI.jsx";

const temaRefugio = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    info: { main: "#2563eb" },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
    divider: "#e2e8f0",
  },

  shape: {
    borderRadius: 12,
  },

  typography: {
    fontFamily: "inherit",
    h4: {
      fontSize: "1.875rem",
      fontWeight: 700,
      lineHeight: 1.25,
    },
    h6: {
      fontSize: "1.25rem",
      fontWeight: 600,
    },
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          padding: "8px 16px",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#f8fafc",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "#e2e8f0",
        },
        head: {
          fontWeight: 600,
          color: "#334155",
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

export default function TemaRefugio({ children }) {
  return (
    <ThemeProvider theme={temaRefugio}>
      <main className={estilosUI.pagina}>
        <div className={estilosUI.contenedor}>
          {children}
        </div>
      </main>
    </ThemeProvider>
  );
}
