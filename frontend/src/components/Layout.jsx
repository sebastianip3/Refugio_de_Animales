import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
} from "@mui/material";

const SECCIONES = [
  { id: "inicio", label: "Inicio", icono: "🏠" },
  { id: "animales", label: "Animales", icono: "🐾" },
  { id: "adopciones", label: "Adopciones", icono: "🏡" },
  { id: "historial", label: "Historial clínico", icono: "🩺" },
  { id: "insumos", label: "Insumos", icono: "📦" },
  { id: "voluntariado", label: "Voluntariado", icono: "🤝" },
  { id: "trabajadores", label: "Trabajadores", icono: "👥" },
  { id: "esterilizacion", label: "Esterilización", icono: "✂️" },
];

const drawerWidth = 260;

function Layout({ children, paginaActual, onNavegar }) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f4f6f8",
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,

          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#1f2937",
            color: "white",
            borderRight: "none",
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 3,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
            }}
          >
            🐾 Refugio
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#9ca3af",
              mt: 0.5,
            }}
          >
            Sistema de gestión
          </Typography>
        </Box>

        <Divider
          sx={{
            borderColor: "#374151",
          }}
        />

        <List
          sx={{
            px: 1.5,
            py: 2,
          }}
        >
          {SECCIONES.map((seccion) => (
            <ListItemButton
              key={seccion.id}
              selected={paginaActual === seccion.id}
              onClick={() => onNavegar(seccion.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: "#d1d5db",

                "&:hover": {
                  backgroundColor: "#374151",
                },

                "&.Mui-selected": {
                  backgroundColor: "#2563eb",
                  color: "white",
                },

                "&.Mui-selected:hover": {
                  backgroundColor: "#1d4ed8",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 32,
                  fontSize: "1.15rem",
                }}
              >
                {seccion.icono}
              </Box>

              <ListItemText
                primary={seccion.label}
                primaryTypographyProps={{
                  fontSize: "0.95rem",
                  fontWeight:
                    paginaActual === seccion.id ? 600 : 400,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;