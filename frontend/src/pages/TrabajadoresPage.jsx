import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { cuentasApi } from "../services/api.js";
import TemaRefugio from "../components/TemaRefugio.jsx";

const TIPOS_TRABAJADOR = [
  { valor: "TRABAJADOR", nombre: "Trabajador" },
  { valor: "ENCARGADO_ADOPCIONES", nombre: "Encargado de adopciones" },
  { valor: "VETERINARIO", nombre: "Veterinario" },
];

const DIAS_SEMANA = [
  { id: "lunes", nombre: "Lunes", abreviatura: "Lun" },
  { id: "martes", nombre: "Martes", abreviatura: "Mar" },
  { id: "miercoles", nombre: "Miércoles", abreviatura: "Mié" },
  { id: "jueves", nombre: "Jueves", abreviatura: "Jue" },
  { id: "viernes", nombre: "Viernes", abreviatura: "Vie" },
  { id: "sabado", nombre: "Sábado", abreviatura: "Sáb" },
  { id: "domingo", nombre: "Domingo", abreviatura: "Dom" },
];

function crearHorarioVacio() {
  return Object.fromEntries(
    DIAS_SEMANA.map(({ id }) => [id, { inicio: "", fin: "" }]),
  );
}

function leerHorario(horario) {
  const horarios = crearHorarioVacio();
  if (!horario) return { horarios, legible: true };

  const entradas = horario.split(";").map((entrada) => entrada.trim());
  const diasEncontrados = new Set();
  const expresion = /^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom) ((?:[01]\d|2[0-3]):00)-((?:[01]\d|2[0-3]):00)$/u;

  for (const entrada of entradas) {
    const coincidencia = entrada.match(expresion);
    if (!coincidencia) return { horarios: crearHorarioVacio(), legible: false };

    const dia = DIAS_SEMANA.find(({ abreviatura }) => abreviatura === coincidencia[1]);
    if (!dia || diasEncontrados.has(dia.id)) {
      return { horarios: crearHorarioVacio(), legible: false };
    }

    horarios[dia.id] = { inicio: coincidencia[2], fin: coincidencia[3] };
    diasEncontrados.add(dia.id);
  }

  return { horarios, legible: true };
}

function serializarHorario(horarios) {
  return DIAS_SEMANA
    .filter(({ id }) => horarios[id].inicio && horarios[id].fin)
    .map(({ id, abreviatura }) => {
      const { inicio, fin } = horarios[id];
      return `${abreviatura} ${inicio}-${fin}`;
    })
    .join("; ");
}

function esHoraEnPunto(hora) {
  return /^(?:[01]\d|2[0-3]):00$/.test(hora);
}

const FORMULARIO_INICIAL = {
  nombre: "",
  apellido: "",
  correo: "",
  tipo: "TRABAJADOR",
};

function TrabajadoresPage({ cuenta }) {
  const esAdministrador = cuenta?.tipo === "ADMINISTRADOR";
  const [trabajadores, setTrabajadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajadorEditado, setTrabajadorEditado] = useState(null);
  const [modoFormulario, setModoFormulario] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [horarioDias, setHorarioDias] = useState(crearHorarioVacio);
  const [horarioLegado, setHorarioLegado] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarTrabajadores = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setTrabajadores(await cuentasApi.listarTrabajadores());
    } catch (err) {
      setError(`No se pudieron cargar los trabajadores: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAdministrador) {
      cargarTrabajadores();
    } else {
      setCargando(false);
    }
  }, [esAdministrador, cargarTrabajadores]);

  const abrirEdicion = (trabajador) => {
    setTrabajadorEditado(trabajador);
    setModoFormulario("editar");
    setFormulario({
      nombre: trabajador.nombre,
      apellido: trabajador.apellido,
      correo: trabajador.correo,
      tipo: trabajador.tipo,
    });
    const horarioActual = leerHorario(trabajador.horario || "");
    setHorarioDias(horarioActual.horarios);
    setHorarioLegado(horarioActual.legible ? "" : trabajador.horario || "");
    setContrasena("");
    setError("");
    setMensaje("");
  };

  const abrirCreacion = () => {
    setTrabajadorEditado(null);
    setModoFormulario("crear");
    setFormulario(FORMULARIO_INICIAL);
    setHorarioDias(crearHorarioVacio());
    setHorarioLegado("");
    setContrasena("");
    setError("");
    setMensaje("");
  };

  const guardarTrabajador = async (evento) => {
    evento.preventDefault();
    if (!esAdministrador || guardando || !modoFormulario) return;

    const rangoInvalido = DIAS_SEMANA.find(({ id, nombre }) => {
      const { inicio, fin } = horarioDias[id];
      if ((inicio && !esHoraEnPunto(inicio)) || (fin && !esHoraEnPunto(fin))) {
        return { nombre, mensaje: "usa horas en punto, entre 00:00 y 23:00" };
      }
      if (Boolean(inicio) !== Boolean(fin)) {
        return { nombre, mensaje: "completa tanto la hora de inicio como la de fin" };
      }
      if (inicio && fin && inicio >= fin) {
        return { nombre, mensaje: "la hora de fin debe ser posterior a la de inicio" };
      }
      return false;
    });

    if (rangoInvalido) {
      setError(`Horario de ${rangoInvalido.nombre}: ${rangoInvalido.mensaje}.`);
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");
    const horarioNuevo = serializarHorario(horarioDias);
    const datosTrabajador = {
      ...formulario,
      horario: horarioNuevo || horarioLegado || "",
    };

    try {
      if (modoFormulario === "crear") {
        const creado = await cuentasApi.crearTrabajador({ ...datosTrabajador, contrasena });
        setTrabajadores((actuales) =>
          [...actuales, creado].sort(
            (a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre),
          ),
        );
        setMensaje("El trabajador se agregó correctamente.");
      } else {
        const actualizado = await cuentasApi.actualizarTrabajador(trabajadorEditado.id, datosTrabajador);
        setTrabajadores((actuales) =>
          actuales
            .map((trabajador) => (trabajador.id === actualizado.id ? actualizado : trabajador))
            .sort(
              (a, b) => a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre),
            ),
        );
        setMensaje("Los datos del trabajador se actualizaron correctamente.");
      }
      setModoFormulario(null);
      setTrabajadorEditado(null);
      setContrasena("");
    } catch (err) {
      setError(
        modoFormulario === "crear"
          ? `No se pudo agregar el trabajador: ${err.message}`
          : `No se pudieron guardar los cambios: ${err.message}`,
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!esAdministrador) {
    return (
      <TemaRefugio>
        <Alert severity="error">Solo un administrador puede acceder a esta página.</Alert>
      </TemaRefugio>
    );
  }

  return (
    <TemaRefugio>
      <Paper
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
          p: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            Trabajadores
          </Typography>
          <Typography color="text.secondary">
            Personal interno, cargo y horario de trabajo.
          </Typography>
        </Box>
        <Button variant="contained" onClick={abrirCreacion}>
          Agregar trabajador
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {mensaje && <Alert severity="success" sx={{ mb: 2 }}>{mensaje}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Horario de trabajo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : trabajadores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No hay trabajadores internos registrados.
                </TableCell>
              </TableRow>
            ) : (
              trabajadores.map((trabajador) => (
                <TableRow key={trabajador.id} hover>
                  <TableCell>{trabajador.nombre} {trabajador.apellido}</TableCell>
                  <TableCell>{trabajador.correo}</TableCell>
                  <TableCell>
                    {TIPOS_TRABAJADOR.find((tipo) => tipo.valor === trabajador.tipo)?.nombre}
                  </TableCell>
                  <TableCell>{trabajador.horario || "Sin horario registrado"}</TableCell>
                  <TableCell align="right">
                    <Button onClick={() => abrirEdicion(trabajador)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(modoFormulario)}
        onClose={() => {
          if (!guardando) {
            setModoFormulario(null);
            setTrabajadorEditado(null);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={guardarTrabajador}>
          <DialogTitle>
            {modoFormulario === "crear" ? "Agregar trabajador" : "Editar trabajador"}
          </DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nombre"
              value={formulario.nombre}
              onChange={(evento) => setFormulario({ ...formulario, nombre: evento.target.value })}
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Apellido"
              value={formulario.apellido}
              onChange={(evento) => setFormulario({ ...formulario, apellido: evento.target.value })}
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Correo"
              type="email"
              value={formulario.correo}
              onChange={(evento) => setFormulario({ ...formulario, correo: evento.target.value })}
              required
              inputProps={{ maxLength: 254 }}
            />
            {modoFormulario === "crear" && (
              <TextField
                label="Contraseña inicial"
                type="password"
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
                required
                inputProps={{ minLength: 8, maxLength: 72, autoComplete: "new-password" }}
                helperText="Debe tener entre 8 y 72 caracteres."
              />
            )}
            <TextField
              select
              label="Cargo"
              value={formulario.tipo}
              onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value })}
            >
              {TIPOS_TRABAJADOR.map((tipo) => (
                <MenuItem key={tipo.valor} value={tipo.valor}>{tipo.nombre}</MenuItem>
              ))}
            </TextField>
            {horarioLegado && !serializarHorario(horarioDias) && (
              <Alert
                severity="info"
                action={
                  <Button
                    type="button"
                    color="inherit"
                    size="small"
                    onClick={() => setHorarioLegado("")}
                  >
                    Quitar
                  </Button>
                }
              >
                El horario anterior ({horarioLegado}) se conservará hasta que definas uno nuevo o lo quites.
              </Alert>
            )}
            <Box sx={{ display: "grid", gap: 1 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Horario semanal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Elige la hora de inicio y fin para cada día. Solo se permiten horas en punto, de 00:00 a 23:00.
                </Typography>
              </Box>
              {DIAS_SEMANA.map(({ id, nombre }) => (
                <Box
                  key={id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", sm: "minmax(100px, 1fr) 1fr 1fr" },
                    alignItems: "center",
                    gap: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    py: 1,
                  }}
                >
                  <Typography sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, fontWeight: 500 }}>
                    {nombre}
                  </Typography>
                  <TextField
                    label="Desde"
                    type="time"
                    value={horarioDias[id].inicio}
                    onChange={(evento) =>
                      setHorarioDias((actual) => ({
                        ...actual,
                        [id]: { ...actual[id], inicio: evento.target.value },
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 3600, min: "00:00", max: "23:00" }}
                    size="small"
                  />
                  <TextField
                    label="Hasta"
                    type="time"
                    value={horarioDias[id].fin}
                    onChange={(evento) =>
                      setHorarioDias((actual) => ({
                        ...actual,
                        [id]: { ...actual[id], fin: evento.target.value },
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 3600, min: "00:00", max: "23:00" }}
                    size="small"
                  />
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setModoFormulario(null);
                setTrabajadorEditado(null);
              }}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={guardando}>
              {guardando
                ? "Guardando..."
                : modoFormulario === "crear"
                  ? "Agregar trabajador"
                  : "Guardar cambios"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </TemaRefugio>
  );
}

export default TrabajadoresPage;
