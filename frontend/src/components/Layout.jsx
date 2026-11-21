import { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";

// Un solo menú para todas las páginas del refugio.
// Las jornadas de adopción y esterilización se gestionan en Eventos.
const SECCIONES = [
  { id: "inicio", label: "Inicio", icono: "🏠" },
  { id: "animales", label: "Animales", icono: "🐾" },
  { id: "adopciones", label: "Adopciones", icono: "🏡" },
  { id: "historial", label: "Historial clínico", icono: "🩺" },
  { id: "cuidados", label: "Cuidados", icono: "🤝" },
  { id: "insumos", label: "Insumos", icono: "📦" },
  { id: "voluntariado", label: "Voluntariado", icono: "📋" },
  { id: "trabajadores", label: "Trabajadores", icono: "👥" },
  { id: "eventos", label: "Eventos", icono: "📅" },
];

const ANCHO_MENU = 260;
const FONDO_MENU = "#0f172a";
const COLOR_SECUNDARIO = "#cbd5e1";

const formatearEnum = (valor) =>
  typeof valor === "string"
    ? valor.replaceAll("_", " ").toLowerCase()
    : "";

export default function Layout({
  children,
  paginaActual,
  onNavegar,
  cuenta,
  onCerrarSesion,
  onIniciarSesion,
}) {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  function navegar(id) {
    setMenuMovilAbierto(false);
    onNavegar(id);
  }

  function cerrarSesion() {
    setMenuMovilAbierto(false);
    onCerrarSesion();
  }

  const nombreCuenta = cuenta
    ? [cuenta.nombre, cuenta.apellido].filter(Boolean).join(" ")
    : "";

  function contenidoMenu() {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: FONDO_MENU,
          color: "#ffffff",
          overflowY: "auto",
        }}
      >
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            🐾 Refugio
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
            Sistema de gestión
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "#334155" }} />

        <List component="nav" aria-label="Secciones del refugio" sx={{ px: 1.5, py: 2 }}>
          {SECCIONES.filter(
            (seccion) =>
              seccion.id !== "trabajadores" || cuenta?.tipo === "ADMINISTRADOR",
          ).map((seccion) => (
            <ListItemButton
              key={seccion.id}
              selected={paginaActual === seccion.id}
              onClick={() => navegar(seccion.id)}
              aria-current={paginaActual === seccion.id ? "page" : undefined}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 1.5,
                py: 1.2,
                color: COLOR_SECUNDARIO,
                "&:hover": { bgcolor: "#1e293b", color: "#ffffff" },
                "&.Mui-selected": { bgcolor: "#2563eb", color: "#ffffff" },
                "&.Mui-selected:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              <Box component="span" aria-hidden="true" sx={{ width: 33, fontSize: "1.15rem" }}>
                {seccion.icono}
              </Box>
              <ListItemText
                primary={seccion.label}
                primaryTypographyProps={{
                  fontSize: "0.95rem",
                  fontWeight: paginaActual === seccion.id ? 700 : 500,
                }}
              />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ mt: "auto", px: 1.5, py: 2, borderTop: "1px solid #334155" }}>
          {cuenta ? (
            <>
              <ListItemButton
                selected={paginaActual === "perfil"}
                onClick={() => navegar("perfil")}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  alignItems: "flex-start",
                  flexDirection: "column",
                  color: "#ffffff",
                  "&:hover": { bgcolor: "#1e293b" },
                  "&.Mui-selected": { bgcolor: "#2563eb" },
                  "&.Mui-selected:hover": { bgcolor: "#1d4ed8" },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  👤 {nombreCuenta}
                </Typography>
                <Typography variant="caption" sx={{ color: "#cbd5e1", mt: 0.5 }}>
                  {formatearEnum(cuenta.tipo)} · Mi perfil
                </Typography>
              </ListItemButton>
              <ListItemButton
                onClick={cerrarSesion}
                sx={{
                  borderRadius: 2,
                  color: COLOR_SECUNDARIO,
                  "&:hover": { bgcolor: "#1e293b", color: "#ffffff" },
                }}
              >
                <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ fontSize: "0.95rem" }} />
              </ListItemButton>
            </>
          ) : (
            <ListItemButton
              onClick={() => {
                setMenuMovilAbierto(false);
                onIniciarSesion();
              }}
              sx={{
                borderRadius: 2,
                color: COLOR_SECUNDARIO,
                "&:hover": { bgcolor: "#1e293b", color: "#ffffff" },
              }}
            >
              <ListItemText primary="Iniciar sesión (personal)" />
            </ListItemButton>
          )}
        </Box>
      </Box>
    );
  }

  const estilosDrawer = {
    "& .MuiDrawer-paper": {
      width: ANCHO_MENU,
      boxSizing: "border-box",
      bgcolor: FONDO_MENU,
      borderRight: "none",
    },
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {/* Menú fijo en escritorio */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: ANCHO_MENU,
          flexShrink: 0,
          ...estilosDrawer,
        }}
      >
        {contenidoMenu()}
      </Drawer>

      {/* Menú desplegable en celular/tablet */}
      <Drawer
        variant="temporary"
        open={menuMovilAbierto}
        onClose={() => setMenuMovilAbierto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", md: "none" }, ...estilosDrawer }}
      >
        {contenidoMenu()}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, minHeight: "100vh" }}>
        {/* Barra superior visible únicamente en pantallas pequeñas */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1,
            bgcolor: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            px: 2,
            py: 1,
            position: "sticky",
            top: 0,
            zIndex: 1000,
          }}
        >
          <IconButton
            aria-label="Abrir menú"
            onClick={() => setMenuMovilAbierto(true)}
            sx={{ color: "#0f172a", fontSize: "1.5rem" }}
          >
            ☰
          </IconButton>
          <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
            🐾 Refugio
          </Typography>
        </Box>
        {children}
      </Box>
    </Box>
  );
}
